import youtubeDl from 'youtube-dl-exec';
import { createClient } from 'redis';
import crypto from 'crypto';
import { proxyManager, ProxyLease } from '../shared/proxy-manager.service';
import { platformConcurrency, PlatformSlot } from '../shared/platform-concurrency.service';

/**
 * Kick Video Downloader Service
 * 
 * Kick is a streaming platform similar to Twitch.
 * Downloads VODs and clips with conservative rate limiting.
 * 
 * Features:
 * - yt-dlp based downloading
 * - Proxy rotation via shared proxy manager
 * - Platform concurrency control (max 2 concurrent)
 * - Redis caching (2 hour TTL)
 * - Conservative retry strategy
 */

interface DownloadResult {
  localPath?: string;
  downloadUrl: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  cached: boolean;
}

export class KickDownloaderService {
  private redisClient: any = null;
  
  // Configuration
  private readonly CACHE_TTL = 7200; // 2 hours
  private readonly MAX_RETRIES = 2;
  private readonly REQUEST_TIMEOUT = 60000; // 60 seconds (streams can be large)
  private readonly BACKOFF_BASE = 15000; // 15 second base backoff
  
  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Kick Downloader] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Kick Downloader] Redis connected');
    } catch (error) {
      console.error('[Kick Downloader] Failed to connect to Redis:', error);
    }
  }

  async getDownloadUrl(kickUrl: string): Promise<DownloadResult> {
    console.log('[Kick Downloader] Processing URL:', kickUrl);
    
    const cached = await this.getCached(kickUrl);
    if (cached) {
      return cached;
    }

    let platformSlot: PlatformSlot | null = null;
    let proxyLease: ProxyLease | null = null;
    
    try {
      platformSlot = await platformConcurrency.acquireSlot('kick');
      console.log('[Kick Downloader] Platform slot acquired');
      
      proxyLease = await proxyManager.acquireLease('kick');
      console.log('[Kick Downloader] Proxy lease acquired');
      
      const result = await this.downloadWithRetry(kickUrl, proxyLease);
      
      proxyManager.recordSuccess(proxyLease);
      await this.setCached(kickUrl, result);
      
      return result;
      
    } catch (error) {
      console.error('[Kick Downloader] Download failed:', error);
      
      if (proxyLease) {
        proxyManager.recordFailure(proxyLease, error);
      }
      
      throw error;
      
    } finally {
      if (proxyLease) {
        await proxyManager.releaseLease(proxyLease);
      }
      if (platformSlot) {
        await platformConcurrency.releaseSlot(platformSlot);
      }
    }
  }

  private async downloadWithRetry(kickUrl: string, proxyLease: ProxyLease): Promise<DownloadResult> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = this.BACKOFF_BASE * Math.pow(2, attempt - 1);
          console.log(`[Kick Downloader] Retry attempt ${attempt}/${this.MAX_RETRIES}, backing off ${backoff}ms`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
        
        return await this.download(kickUrl, proxyLease);
        
      } catch (error: any) {
        lastError = error;
        console.error(`[Kick Downloader] Attempt ${attempt + 1} failed:`, error.message);
        
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          throw new Error('Video not found or unavailable');
        }
        
        if (error.message?.includes('private') || error.message?.includes('subscriber')) {
          throw new Error('Video is private or requires subscription');
        }
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  private async download(kickUrl: string, proxyLease: ProxyLease): Promise<DownloadResult> {
    console.log('[Kick Downloader] Starting download with yt-dlp');
    
    const proxyUrl = `http://${proxyLease.proxy.username}:${proxyLease.proxy.password}@${proxyLease.proxy.host}:${proxyLease.proxy.port}`;
    
    // Enhanced headers to bypass anti-bot protection
    const headers = [
      'referer:https://kick.com/',
      'origin:https://kick.com',
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
      // Try WITHOUT proxy first - Kick often blocks datacenter IPs
      console.log('[Kick Downloader] Attempting without proxy (direct connection)');
      try {
        const info = await youtubeDl(kickUrl, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: headers,
          socketTimeout: this.REQUEST_TIMEOUT / 1000,
        });

        console.log('[Kick Downloader] Video info retrieved (no proxy):', info.title);
        return this.extractDownloadInfo(info);
        
      } catch (directError: any) {
        console.log('[Kick Downloader] Direct connection failed, trying with proxy:', directError.message);
      }
      
      // If direct connection failed, try WITH proxy
      console.log('[Kick Downloader] Attempting with proxy:', proxyLease.proxy.host);
      const info = await youtubeDl(kickUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: headers,
        proxy: proxyUrl,
        socketTimeout: this.REQUEST_TIMEOUT / 1000,
      });

      console.log('[Kick Downloader] Video info retrieved (with proxy):', info.title);
      return this.extractDownloadInfo(info);
      
    } catch (error: any) {
      console.error('[Kick Downloader] yt-dlp error:', error);
      throw new Error(`Failed to download Kick video: ${error.message}`);
    }
  }

  /**
   * Extract download information from yt-dlp result
   */
  private extractDownloadInfo(info: any): DownloadResult {
    let downloadUrl = '';
    
    if (info.url) {
      downloadUrl = info.url;
    } else if (info.formats && info.formats.length > 0) {
      const sortedFormats = info.formats
        .filter((f: any) => f.url && f.vcodec !== 'none')
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
        
      if (sortedFormats.length > 0) {
        downloadUrl = sortedFormats[0].url;
      }
    }
    
    if (!downloadUrl) {
      throw new Error('No download URL found for Kick video');
    }
    
    return {
      downloadUrl,
      title: info.title || 'Kick Video',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || undefined,
      cached: false,
    };
  }

  private getCacheKey(kickUrl: string): string {
    const hash = crypto.createHash('sha256').update(kickUrl).digest('hex');
    return `kick:video:${hash}`;
  }

  private async getCached(kickUrl: string): Promise<DownloadResult | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = this.getCacheKey(kickUrl);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        console.log('[Kick Downloader] Cache HIT:', kickUrl);
        const data = JSON.parse(cached);
        return { ...data, cached: true };
      }
      
      console.log('[Kick Downloader] Cache MISS:', kickUrl);
    } catch (error) {
      console.error('[Kick Downloader] Cache read error:', error);
    }
    
    return null;
  }

  private async setCached(kickUrl: string, result: DownloadResult): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = this.getCacheKey(kickUrl);
      const data = { ...result, cached: undefined };
      await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      console.log(`[Kick Downloader] Cached for ${this.CACHE_TTL}s:`, kickUrl);
    } catch (error) {
      console.error('[Kick Downloader] Cache write error:', error);
    }
  }
}

export const kickDownloader = new KickDownloaderService();
