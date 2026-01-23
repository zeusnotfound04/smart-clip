import youtubeDl from 'youtube-dl-exec';
import { createClient } from 'redis';
import crypto from 'crypto';
import { proxyManager, ProxyLease } from '../shared/proxy-manager.service';
import { platformConcurrency, PlatformSlot } from '../shared/platform-concurrency.service';

/**
 * Twitch Video Downloader Service
 * 
 * Downloads Twitch VODs and clips with extreme caution.
 * Twitch has aggressive rate limiting - single concurrent download only.
 * 
 * Features:
 * - yt-dlp based downloading
 * - Proxy rotation via shared proxy manager
 * - Platform concurrency control (max 1 concurrent - VERY conservative)
 * - Redis caching (2 hour TTL)
 * - Long backoff delays
 */

interface DownloadResult {
  localPath?: string;
  downloadUrl: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  cached: boolean;
}

export class TwitchDownloaderService {
  private redisClient: any = null;
  
  // Configuration - Extra conservative for Twitch
  private readonly CACHE_TTL = 7200; // 2 hours
  private readonly MAX_RETRIES = 1; // Only 1 retry!
  private readonly REQUEST_TIMEOUT = 90000; // 90 seconds
  private readonly BACKOFF_BASE = 30000; // 30 second base backoff
  
  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Twitch Downloader] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Twitch Downloader] Redis connected');
    } catch (error) {
      console.error('[Twitch Downloader] Failed to connect to Redis:', error);
    }
  }

  async getDownloadUrl(twitchUrl: string): Promise<DownloadResult> {
    console.log('[Twitch Downloader] Processing URL:', twitchUrl);
    
    const cached = await this.getCached(twitchUrl);
    if (cached) {
      return cached;
    }

    let platformSlot: PlatformSlot | null = null;
    let proxyLease: ProxyLease | null = null;
    
    try {
      // Acquire platform slot (ONLY 1 concurrent for Twitch)
      platformSlot = await platformConcurrency.acquireSlot('twitch', 120000); // 2 min timeout
      console.log('[Twitch Downloader] Platform slot acquired (max 1 concurrent)');
      
      proxyLease = await proxyManager.acquireLease('twitch');
      console.log('[Twitch Downloader] Proxy lease acquired');
      
      const result = await this.downloadWithRetry(twitchUrl, proxyLease);
      
      proxyManager.recordSuccess(proxyLease);
      await this.setCached(twitchUrl, result);
      
      return result;
      
    } catch (error) {
      console.error('[Twitch Downloader] Download failed:', error);
      
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

  private async downloadWithRetry(twitchUrl: string, proxyLease: ProxyLease): Promise<DownloadResult> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = this.BACKOFF_BASE * Math.pow(2, attempt - 1);
          console.log(`[Twitch Downloader] Retry attempt ${attempt}/${this.MAX_RETRIES}, backing off ${backoff}ms`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
        
        return await this.download(twitchUrl, proxyLease);
        
      } catch (error: any) {
        lastError = error;
        console.error(`[Twitch Downloader] Attempt ${attempt + 1} failed:`, error.message);
        
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          throw new Error('VOD/clip not found or has been deleted');
        }
        
        if (error.message?.includes('subscriber')) {
          throw new Error('VOD requires Twitch subscription');
        }
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          throw new Error('Twitch rate limit hit - please try again later');
        }
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  private async download(twitchUrl: string, proxyLease: ProxyLease): Promise<DownloadResult> {
    console.log('[Twitch Downloader] Starting download with yt-dlp (conservative settings)');
    
    const proxyUrl = `http://${proxyLease.proxy.username}:${proxyLease.proxy.password}@${proxyLease.proxy.host}:${proxyLease.proxy.port}`;
    
    try {
      const info = await youtubeDl(twitchUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        // Twitch-specific headers
        addHeader: [
          'referer:https://www.twitch.tv/',
          'origin:https://www.twitch.tv',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ],
        proxy: proxyUrl,
        socketTimeout: this.REQUEST_TIMEOUT / 1000,
        limitRate: '2M', // Limit to 2MB/s to avoid rate limiting
        retries: 1, // Minimal retries within yt-dlp
      });

      console.log('[Twitch Downloader] Video info retrieved:', info.title);
      
      let downloadUrl = '';
      
      if (info.url) {
        downloadUrl = info.url;
      } else if (info.formats && info.formats.length > 0) {
        // For Twitch, prefer source quality or best available
        const sortedFormats = info.formats
          .filter((f: any) => f.url && f.vcodec !== 'none')
          .sort((a: any, b: any) => {
            // Prefer 'source' quality
            if (a.format_note === 'source') return -1;
            if (b.format_note === 'source') return 1;
            return (b.height || 0) - (a.height || 0);
          });
        
        if (sortedFormats.length > 0) {
          downloadUrl = sortedFormats[0].url;
        }
      }
      
      if (!downloadUrl) {
        throw new Error('No download URL found for Twitch video');
      }
      
      return {
        downloadUrl,
        title: info.title || 'Twitch Video',
        duration: info.duration || 0,
        thumbnail: info.thumbnail || undefined,
        cached: false,
      };
      
    } catch (error: any) {
      console.error('[Twitch Downloader] yt-dlp error:', error);
      
      // Check for specific Twitch errors
      if (error.stderr?.includes('429')) {
        throw new Error('Twitch rate limit exceeded - please try again in a few minutes');
      }
      
      throw new Error(`Failed to download Twitch video: ${error.message}`);
    }
  }

  private getCacheKey(twitchUrl: string): string {
    const hash = crypto.createHash('sha256').update(twitchUrl).digest('hex');
    return `twitch:video:${hash}`;
  }

  private async getCached(twitchUrl: string): Promise<DownloadResult | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = this.getCacheKey(twitchUrl);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        console.log('[Twitch Downloader] Cache HIT:', twitchUrl);
        const data = JSON.parse(cached);
        return { ...data, cached: true };
      }
      
      console.log('[Twitch Downloader] Cache MISS:', twitchUrl);
    } catch (error) {
      console.error('[Twitch Downloader] Cache read error:', error);
    }
    
    return null;
  }

  private async setCached(twitchUrl: string, result: DownloadResult): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = this.getCacheKey(twitchUrl);
      const data = { ...result, cached: undefined };
      await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      console.log(`[Twitch Downloader] Cached for ${this.CACHE_TTL}s:`, twitchUrl);
    } catch (error) {
      console.error('[Twitch Downloader] Cache write error:', error);
    }
  }
}

export const twitchDownloader = new TwitchDownloaderService();
