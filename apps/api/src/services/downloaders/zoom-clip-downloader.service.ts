import youtubeDl from 'youtube-dl-exec';
import { createClient } from 'redis';
import crypto from 'crypto';
import { proxyManager, ProxyLease } from '../shared/proxy-manager.service';
import { platformConcurrency, PlatformSlot } from '../shared/platform-concurrency.service';

/**
 * Zoom Clips Downloader Service
 * 
 * Downloads PUBLIC Zoom Clips only (zoom.us/clips/share/).
 * Does NOT support:
 * - Private Zoom recordings
 * - Passcode-protected links
 * - Authenticated content
 * 
 * Features:
 * - yt-dlp based downloading (extracts HLS streams)
 * - Pre-validation to reject expired/private clips
 * - Proxy rotation via shared proxy manager
 * - Platform concurrency control (max 1 concurrent - Zoom CDN limits)
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

export class ZoomClipDownloaderService {
  private redisClient: any = null;
  
  // Configuration - Conservative limits for Zoom CDN
  private readonly CACHE_TTL = 7200; // 2 hours
  private readonly MAX_RETRIES = 1; // Only 1 retry for Zoom
  private readonly REQUEST_TIMEOUT = 1200000; // 20 minutes (clips can be long)
  private readonly BACKOFF_BASE = 20000; // 20 second base backoff
  
  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Zoom Clip Downloader] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Zoom Clip Downloader] Redis connected');
    } catch (error) {
      console.error('[Zoom Clip Downloader] Failed to connect to Redis:', error);
    }
  }

  /**
   * Validate Zoom clip before attempting download
   * Checks if clip is publicly accessible and contains video stream
   */
  async validateZoomClip(url: string): Promise<void> {
    console.log('[Zoom Clip Downloader] Validating clip:', url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      if (!response.ok) {
        throw new Error(`Zoom clip validation failed: HTTP ${response.status}`);
      }

      const html = await response.text();
      const htmlLower = html.toLowerCase();

      // Check for specific authentication/access blockers
      // Look for specific error messages or auth walls, not generic text
      if (htmlLower.includes('enter password') || 
          htmlLower.includes('enter passcode') ||
          htmlLower.includes('password required') ||
          htmlLower.includes('passcode required')) {
        throw new Error('Zoom clip is password-protected (not supported)');
      }

      if (htmlLower.includes('clip has expired') || 
          htmlLower.includes('clip not found') ||
          htmlLower.includes('recording has expired')) {
        throw new Error('Zoom clip has expired or does not exist');
      }

      if (htmlLower.includes('please sign in to view') || 
          htmlLower.includes('login required') ||
          htmlLower.includes('authentication required')) {
        throw new Error('Zoom clip requires authentication (not supported)');
      }

      // If no clear blockers found, let yt-dlp try to extract
      // yt-dlp is better at finding embedded streams and will give clearer errors
      console.log('[Zoom Clip Downloader] Validation passed - no access restrictions detected, proceeding to extraction');
    } catch (error: any) {
      console.error('[Zoom Clip Downloader] Validation failed:', error.message);
      throw new Error(`Cannot download Zoom clip: ${error.message}`);
    }
  }

  async getDownloadUrl(zoomClipUrl: string): Promise<DownloadResult> {
    console.log('[Zoom Clip Downloader] Processing URL:', zoomClipUrl);
    
    // Validate before checking cache or acquiring resources
    await this.validateZoomClip(zoomClipUrl);
    
    const cached = await this.getCached(zoomClipUrl);
    if (cached) {
      return cached;
    }

    let platformSlot: PlatformSlot | null = null;
    let proxyLease: ProxyLease | null = null;
    
    try {
      // Acquire platform slot (max 1 concurrent for Zoom)
      platformSlot = await platformConcurrency.acquireSlot('zoom-clip');
      console.log('[Zoom Clip Downloader] Platform slot acquired');
      
      // Acquire proxy lease
      proxyLease = await proxyManager.acquireLease('zoom-clip');
      console.log('[Zoom Clip Downloader] Proxy lease acquired');
      
      const result = await this.downloadWithRetry(zoomClipUrl, proxyLease);
      
      proxyManager.recordSuccess(proxyLease);
      
      await this.setCached(zoomClipUrl, result);
      
      return result;
    } catch (error: any) {
      if (proxyLease) {
        proxyManager.recordFailure(proxyLease);
      }
      throw error;
    } finally {
      if (proxyLease) {
        proxyManager.releaseLease(proxyLease);
      }
      if (platformSlot) {
        platformConcurrency.releaseSlot(platformSlot);
      }
    }
  }

  private async downloadWithRetry(
    zoomClipUrl: string, 
    proxyLease: ProxyLease
  ): Promise<DownloadResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoff = this.BACKOFF_BASE * Math.pow(2, attempt - 1);
        console.log(`[Zoom Clip Downloader] Retry attempt ${attempt}/${this.MAX_RETRIES} after ${backoff}ms`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
      
      try {
        return await this.download(zoomClipUrl, proxyLease);
      } catch (error: any) {
        lastError = error;
        console.error(`[Zoom Clip Downloader] Attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry on validation errors
        if (error.message.includes('password') || 
            error.message.includes('expired') ||
            error.message.includes('authentication')) {
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Download failed after all retries');
  }

  private async download(
    zoomClipUrl: string, 
    proxyLease: ProxyLease
  ): Promise<DownloadResult> {
    console.log('[Zoom Clip Downloader] Starting download with yt-dlp');
    
    const proxyUrl = `http://${proxyLease.proxy.username}:${proxyLease.proxy.password}@${proxyLease.proxy.host}:${proxyLease.proxy.port}`;
    
    try {
      // Try direct connection first (no proxy)
      console.log('[Zoom Clip Downloader] Attempting without proxy (direct connection)');
      
      const directHeaders = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.5',
        'Accept-Encoding: gzip, deflate, br',
        'Referer: https://zoom.us/',
        'Origin: https://zoom.us',
        'DNT: 1',
        'Connection: keep-alive',
        'Upgrade-Insecure-Requests: 1',
        'Sec-Fetch-Dest: document',
        'Sec-Fetch-Mode: navigate',
        'Sec-Fetch-Site: none',
        'Sec-Fetch-User: ?1',
      ];

      try {
        const info = await youtubeDl(zoomClipUrl, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: directHeaders,
        });
        
        console.log('[Zoom Clip Downloader] Video info retrieved (direct connection):', info.title);
        return this.extractDownloadInfo(info);
      } catch (directError: any) {
        console.log('[Zoom Clip Downloader] Direct connection failed, trying with proxy:', directError.message);
      }

      // Fallback to proxy
      console.log('[Zoom Clip Downloader] Attempting with proxy:', proxyLease.proxy.host);
      
      const proxyHeaders = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.5',
        'Accept-Encoding: gzip, deflate, br',
        'Referer: https://zoom.us/',
        'Origin: https://zoom.us',
        'DNT: 1',
        'Connection: keep-alive',
        'Upgrade-Insecure-Requests: 1',
        'Sec-Fetch-Dest: document',
        'Sec-Fetch-Mode: navigate',
        'Sec-Fetch-Site: cross-site',
        'Sec-Fetch-User: ?1',
      ];

      const info = await youtubeDl(zoomClipUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        proxy: proxyUrl,
        addHeader: proxyHeaders,
      });
      
      console.log('[Zoom Clip Downloader] Video info retrieved (with proxy):', info.title);
      return this.extractDownloadInfo(info);
      
    } catch (error: any) {
      console.error('[Zoom Clip Downloader] yt-dlp error:', error);
      
      // Check for specific error types
      if (error.message?.includes('Unsupported URL')) {
        throw new Error('Zoom clips are not currently supported by yt-dlp. This platform requires custom integration.');
      }
      
      throw new Error(`Failed to download Zoom clip: ${error.message}`);
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
      throw new Error('No download URL found for Zoom clip');
    }
    
    return {
      downloadUrl,
      title: info.title || 'Zoom Clip',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || undefined,
      cached: false,
    };
  }

  private getCacheKey(zoomClipUrl: string): string {
    const hash = crypto.createHash('sha256').update(zoomClipUrl).digest('hex');
    return `zoom-clip:video:${hash}`;
  }

  private async getCached(zoomClipUrl: string): Promise<DownloadResult | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = this.getCacheKey(zoomClipUrl);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        console.log('[Zoom Clip Downloader] Cache HIT:', zoomClipUrl);
        const result = JSON.parse(cached);
        return { ...result, cached: true };
      }
      
      console.log('[Zoom Clip Downloader] Cache MISS:', zoomClipUrl);
      return null;
    } catch (error) {
      console.error('[Zoom Clip Downloader] Cache read error:', error);
      return null;
    }
  }

  private async setCached(zoomClipUrl: string, result: DownloadResult): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = this.getCacheKey(zoomClipUrl);
      await this.redisClient.setEx(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(result)
      );
      console.log(`[Zoom Clip Downloader] Cached for ${this.CACHE_TTL}s:`, zoomClipUrl);
    } catch (error) {
      console.error('[Zoom Clip Downloader] Cache write error:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export const zoomClipDownloaderService = new ZoomClipDownloaderService();
