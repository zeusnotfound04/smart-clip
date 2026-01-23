import youtubeDl from 'youtube-dl-exec';
import { createClient } from 'redis';
import crypto from 'crypto';
import { proxyManager, ProxyLease } from '../shared/proxy-manager.service';
import { platformConcurrency, PlatformSlot } from '../shared/platform-concurrency.service';

/**
 * Rumble Video Downloader Service
 * 
 * Features:
 * - yt-dlp based downloading
 * - Proxy rotation via shared proxy manager
 * - Platform concurrency control (max 3 concurrent)
 * - Redis caching (2 hour TTL)
 * - Conservative retry strategy
 * - Automatic backoff on errors
 */

interface DownloadResult {
  localPath?: string;
  downloadUrl: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  cached: boolean;
}

export class RumbleDownloaderService {
  private redisClient: any = null;
  
  // Configuration
  private readonly CACHE_TTL = 7200; // 2 hours
  private readonly MAX_RETRIES = 2; // Conservative retry count
  private readonly REQUEST_TIMEOUT = 45000; // 45 seconds
  private readonly BACKOFF_BASE = 10000; // 10 second base backoff
  
  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Rumble Downloader] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Rumble Downloader] Redis connected');
    } catch (error) {
      console.error('[Rumble Downloader] Failed to connect to Redis:', error);
    }
  }

  /**
   * Get download URL for a Rumble video
   */
  async getDownloadUrl(rumbleUrl: string): Promise<DownloadResult> {
    console.log('[Rumble Downloader] Processing URL:', rumbleUrl);
    
    // Check cache first
    const cached = await this.getCached(rumbleUrl);
    if (cached) {
      return cached;
    }

    // Acquire platform slot (max 3 concurrent for Rumble)
    let platformSlot: PlatformSlot | null = null;
    let proxyLease: ProxyLease | null = null;
    
    try {
      platformSlot = await platformConcurrency.acquireSlot('rumble');
      console.log('[Rumble Downloader] Platform slot acquired');
      
      // Acquire proxy lease
      proxyLease = await proxyManager.acquireLease('rumble');
      console.log('[Rumble Downloader] Proxy lease acquired');
      
      // Download with retry logic
      const result = await this.downloadWithRetry(rumbleUrl, proxyLease);
      
      // Record success
      proxyManager.recordSuccess(proxyLease);
      
      // Cache the result
      await this.setCached(rumbleUrl, result);
      
      return result;
      
    } catch (error) {
      console.error('[Rumble Downloader] Download failed:', error);
      
      if (proxyLease) {
        proxyManager.recordFailure(proxyLease, error);
      }
      
      throw error;
      
    } finally {
      // Always release resources
      if (proxyLease) {
        await proxyManager.releaseLease(proxyLease);
      }
      if (platformSlot) {
        await platformConcurrency.releaseSlot(platformSlot);
      }
    }
  }

  /**
   * Download with retry logic
   */
  private async downloadWithRetry(rumbleUrl: string, proxyLease: ProxyLease): Promise<DownloadResult> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = this.BACKOFF_BASE * Math.pow(2, attempt - 1);
          console.log(`[Rumble Downloader] Retry attempt ${attempt}/${this.MAX_RETRIES}, backing off ${backoff}ms`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
        
        return await this.download(rumbleUrl, proxyLease);
        
      } catch (error: any) {
        lastError = error;
        console.error(`[Rumble Downloader] Attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry on certain errors
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          throw new Error('Video not found or unavailable');
        }
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Perform the actual download using yt-dlp
   */
  private async download(rumbleUrl: string, proxyLease: ProxyLease): Promise<DownloadResult> {
    console.log('[Rumble Downloader] Starting download with yt-dlp');
    
    const proxyUrl = `http://${proxyLease.proxy.username}:${proxyLease.proxy.password}@${proxyLease.proxy.host}:${proxyLease.proxy.port}`;
    
    // Enhanced headers to bypass anti-bot protection
    const headers = [
      'referer:https://rumble.com/',
      'origin:https://rumble.com',
      'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language:en-US,en;q=0.9',
      'accept-encoding:gzip, deflate, br',
      'sec-fetch-dest:document',
      'sec-fetch-mode:navigate',
      'sec-fetch-site:none',
      'sec-fetch-user:?1',
      'upgrade-insecure-requests:1'
    ];
    
    try {
      // Try WITHOUT proxy first - Rumble often blocks datacenter IPs
      console.log('[Rumble Downloader] Attempting without proxy (direct connection)');
      try {
        const info = await youtubeDl(rumbleUrl, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: headers,
          socketTimeout: this.REQUEST_TIMEOUT / 1000,
        });

        console.log('[Rumble Downloader] Video info retrieved (no proxy):', info.title);
        return this.extractDownloadInfo(info);
        
      } catch (directError: any) {
        console.log('[Rumble Downloader] Direct connection failed, trying with proxy:', directError.message);
      }
      
      // If direct connection failed, try WITH proxy
      console.log('[Rumble Downloader] Attempting with proxy:', proxyLease.proxy.host);
      const info = await youtubeDl(rumbleUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: headers,
        proxy: proxyUrl,
        socketTimeout: this.REQUEST_TIMEOUT / 1000,
      });

      console.log('[Rumble Downloader] Video info retrieved (with proxy):', info.title);
      return this.extractDownloadInfo(info);
      
    } catch (error: any) {
      console.error('[Rumble Downloader] yt-dlp error:', error);
      throw new Error(`Failed to download Rumble video: ${error.message}`);
    }
  }

  /**
   * Extract download information from yt-dlp result
   */
  private extractDownloadInfo(info: any): DownloadResult {
    // Extract best download URL
    let downloadUrl = '';
    
    if (info.url) {
      downloadUrl = info.url;
    } else if (info.formats && info.formats.length > 0) {
      // Find best quality format
      const sortedFormats = info.formats
        .filter((f: any) => f.url && f.vcodec !== 'none')
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
      
      if (sortedFormats.length > 0) {
        downloadUrl = sortedFormats[0].url;
      }
    }
    
    if (!downloadUrl) {
      throw new Error('No download URL found for Rumble video');
    }
    
    return {
      downloadUrl,
      title: info.title || 'Rumble Video',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || undefined,
      cached: false,
    };
  }

  /**
   * Cache operations
   */
  private getCacheKey(rumbleUrl: string): string {
    const hash = crypto.createHash('sha256').update(rumbleUrl).digest('hex');
    return `rumble:video:${hash}`;
  }

  private async getCached(rumbleUrl: string): Promise<DownloadResult | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = this.getCacheKey(rumbleUrl);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        console.log('[Rumble Downloader] Cache HIT:', rumbleUrl);
        const data = JSON.parse(cached);
        return { ...data, cached: true };
      }
      
      console.log('[Rumble Downloader] Cache MISS:', rumbleUrl);
    } catch (error) {
      console.error('[Rumble Downloader] Cache read error:', error);
    }
    
    return null;
  }

  private async setCached(rumbleUrl: string, result: DownloadResult): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = this.getCacheKey(rumbleUrl);
      const data = { ...result, cached: undefined };
      await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      console.log(`[Rumble Downloader] Cached for ${this.CACHE_TTL}s:`, rumbleUrl);
    } catch (error) {
      console.error('[Rumble Downloader] Cache write error:', error);
    }
  }
}

// Export singleton instance
export const rumbleDownloader = new RumbleDownloaderService();
