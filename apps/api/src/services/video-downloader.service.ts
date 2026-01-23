import youtubeDl from 'youtube-dl-exec';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { instagramDownloader } from './instagram-downloader.service';
import { tiktokDownloader } from './tiktok-downloader.service';
import { multiPlatformDownloader } from './downloaders/multi-platform-downloader.service';
import fetch from 'node-fetch';

/**
 * Video Downloader Service
 * 
 * Handles downloading videos from various platforms using yt-dlp and specialized downloaders.
 * 
 * ## Twitter/X Video Strategy:
 * 
 * Twitter videos are HLS (.m3u8) streams with:
 * - Signed URLs (temporary tokens)
 * - Multiple quality variants
 * - Separate audio/video tracks
 * 
 * yt-dlp automatically handles:
 * Token extraction from page
 * .m3u8 playlist parsing
 * Segment downloading & merging
 * Audio/video synchronization
 * Output as clean MP4
 * 
 * Golden Command: yt-dlp -f "bv*+ba/b" --merge-output-format mp4
 * 
 * This ensures:
 * - Best video quality
 * - Best audio quality
 * - Merged into single MP4
 * - FFmpeg-ready for subtitle pipeline
 */

interface VideoInfo {
  title: string;
  duration: number;
  durationFormatted?: string;
  thumbnail: string;
  url: string;
  originalUrl: string;
  platform: string;
  extractor: string;
}

interface DownloadResult {
  localPath: string;
  videoInfo: VideoInfo;
  fileName: string;
}

interface DownloadWithDurationResult {
  localPath: string;
  duration: number;
  videoInfo: VideoInfo;
  fileName: string;
}

export class VideoDownloaderService {
  private readonly downloadDir: string;

  constructor() {
    this.downloadDir = path.join(process.cwd(), 'uploads', 'downloaded-videos');
    this.ensureDownloadDir();
  }

  /**
   * Ensure the download directory exists
   */
  private async ensureDownloadDir() {
    try {
      await fs.mkdir(this.downloadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create download directory:', error);
    }
  }

  /**
   * Validate if the URL is from a supported platform
   */
  validateUrl(url: string): { isValid: boolean; platform?: string; error?: string } {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return { isValid: true, platform: 'YouTube' };
      }

      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        return { isValid: true, platform: 'Twitter/X' };
      }

      if (hostname.includes('instagram.com')) {
        return { isValid: true, platform: 'Instagram' };
      }

      if (hostname.includes('tiktok.com')) {
        return { isValid: true, platform: 'TikTok' };
      }

      if (hostname.includes('vimeo.com')) {
        return { isValid: true, platform: 'Vimeo' };
      }

      if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) {
        return { isValid: true, platform: 'Facebook' };
      }

      // NEW PLATFORMS
      if (hostname.includes('rumble.com')) {
        return { isValid: true, platform: 'Rumble' };
      }

      if (hostname.includes('kick.com')) {
        return { isValid: true, platform: 'Kick' };
      }

      if (hostname.includes('twitch.tv')) {
        return { isValid: true, platform: 'Twitch' };
      }

      if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
        return { isValid: true, platform: 'Google Drive' };
      }

      if (hostname.includes('zoom.us') && url.includes('/clips/share/')) {
        return { isValid: true, platform: 'Zoom Clips' };
      }

      return {
        isValid: false,
        error: 'Unsupported platform. Supported: YouTube, Twitter/X, Instagram, TikTok, Vimeo, Facebook, Rumble, Kick, Twitch, Google Drive, Zoom Clips'
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }

  /**
   * Get video information without downloading
   */
  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const validation = this.validateUrl(url);
      
      // Use specialized Instagram downloader
      if (validation.platform === 'Instagram') {
        console.log('[Video Downloader] Using Instagram specialized downloader');
        const result = await instagramDownloader.getDownloadUrl(url);
        
        return {
          title: result.title || 'Instagram Video',
          duration: result.duration || 0,
          thumbnail: result.thumbnail || '',
          url: result.downloadUrl,
          originalUrl: url,
          platform: 'Instagram',
          extractor: 'instagram-specialized',
        };
      }
      
      // Use specialized TikTok downloader
      if (validation.platform === 'TikTok') {
        console.log('[Video Downloader] Using TikTok specialized downloader');
        const result = await tiktokDownloader.getDownloadUrl(url);
        
        return {
          title: result.title || 'TikTok Video',
          duration: result.duration || 0,
          thumbnail: result.thumbnail || '',
          url: result.downloadUrl,
          originalUrl: url,
          platform: 'TikTok',
          extractor: 'tiktok-specialized',
        };
      }
      
      // Use multi-platform downloader for new platforms
      if (['Rumble', 'Kick', 'Twitch', 'Google Drive', 'Zoom Clips'].includes(validation.platform || '')) {
        console.log(`[Video Downloader] Using multi-platform downloader for ${validation.platform}`);
        const result = await multiPlatformDownloader.getVideoInfo(url);
        
        return {
          title: result.title || `${validation.platform} Video`,
          duration: result.duration || 0,
          thumbnail: result.thumbnail || '',
          url: result.downloadUrl,
          originalUrl: url,
          platform: validation.platform || 'Unknown',
          extractor: 'multi-platform',
        };
      }
      
      const isYouTube = validation.platform === 'YouTube';
      
      const options: any = {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
      };
      
      if (isYouTube) {
        if (process.env.YT_COOKIES_PATH) {
          console.log('[DEBUG] YT_COOKIES_PATH env var found:', process.env.YT_COOKIES_PATH);
          
          try {
            const stats = await fs.stat(process.env.YT_COOKIES_PATH);
            console.log('[DEBUG] Cookies file exists');
            console.log('[DEBUG] File size:', stats.size, 'bytes');
            console.log('[DEBUG] File permissions:', stats.mode.toString(8).slice(-3));
            
            const content = await fs.readFile(process.env.YT_COOKIES_PATH, 'utf-8');
            const lines = content.split('\n').slice(0, 5);
            console.log('[DEBUG] First 5 lines of cookies file:');
            lines.forEach((line, i) => {
              if (line.startsWith('#') || line.trim() === '') {
                console.log(`   Line ${i + 1}: ${line}`);
              } else {
                const parts = line.split('\t');
                if (parts.length >= 6) {
                  console.log(`   Line ${i + 1}: Domain=${parts[0]} Name=${parts[5]} Value=[MASKED]`);
                }
              }
            });
            
            const cookieCount = content.split('\n').filter(line => 
              !line.startsWith('#') && line.trim() !== ''
            ).length;
            console.log('[DEBUG] Total cookies in file:', cookieCount);
            
            const criticalCookies = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID'];
            const foundCookies = criticalCookies.filter(cookie => content.includes(`\t${cookie}\t`));
            console.log('[DEBUG] Critical cookies found:', foundCookies.length > 0 ? foundCookies.join(', ') : 'NONE');
            
            if (foundCookies.length === 0) {
              console.warn('[DEBUG] Missing critical authentication cookies (SID, HSID, SSID, APISID, SAPISID)');
              console.warn('[DEBUG] Cookies may be incomplete. Consider re-exporting from browser.');
            }
            
            options.cookies = process.env.YT_COOKIES_PATH;
            console.log('[DEBUG] Using cookies file for YouTube');
          } catch (error) {
            console.error('[DEBUG] Failed to read cookies file:', error);
            console.error('[DEBUG] Error details:', error instanceof Error ? error.message : String(error));
            console.log('[DEBUG] Falling back to mobile client strategy');
            options.extractorArgs = 'youtube:player_client=android';
          }
        } else {
          console.log('[DEBUG] No YT_COOKIES_PATH set, using mobile client for YouTube (bot detection bypass)');
          options.extractorArgs = 'youtube:player_client=android';
        }
      }
      
      const info = await youtubeDl(url, options) as any;

      console.log('yt-dlp info retrieved for:', url);
      console.log('Title:', info.title);
      console.log('Platform:', info.webpage_url_domain || info.extractor);
      console.log('webpage_url:', info.webpage_url);

      let directUrl = url; // Default to original URL
      
      if (info.webpage_url) {
        directUrl = info.webpage_url;
        console.log('Using webpage_url:', directUrl);
      }
      
      if (info.formats && Array.isArray(info.formats)) {
        console.log(`Found ${info.formats.length} formats`);
        
        const playableFormat = info.formats.find((f: any) => 
          f.url && (f.vcodec !== 'none' || f.acodec !== 'none')
        );
        
        if (playableFormat?.url) {
          console.log('Playable format found:');
          console.log('   - Format ID:', playableFormat.format_id);
          console.log('   - Quality:', playableFormat.quality || playableFormat.format_note);
          console.log('   - Resolution:', playableFormat.resolution || `${playableFormat.width}x${playableFormat.height}`);
          console.log('   - Video codec:', playableFormat.vcodec);
          console.log('   - Audio codec:', playableFormat.acodec);
          console.log('   - URL:', playableFormat.url);
          directUrl = playableFormat.url;
        } else {
          console.log('No playable format with direct URL found');
        }
      }

      console.log('Final directUrl being used:', directUrl);

      return {
        title: info.title || 'Unknown',
        duration: info.duration || 0,
        durationFormatted: this.formatDuration(info.duration || 0),
        thumbnail: info.thumbnail || '',
        url: directUrl,
        originalUrl: url,
        platform: info.webpage_url_domain || 'Unknown',
        extractor: info.extractor || 'Unknown',
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      throw new Error(`Failed to get video information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Download video from URL
   */
  async downloadVideo(url: string, userId: string): Promise<DownloadResult> {
    try {
      const validation = this.validateUrl(url);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid URL');
      }

      console.log(`Downloading video from ${validation.platform}: ${url}`);

      // Use specialized Instagram downloader
      if (validation.platform === 'Instagram') {
        console.log('[Video Downloader] Using Instagram specialized downloader for download');
        const result = await instagramDownloader.getDownloadUrl(url);
        
        const videoId = uuidv4();
        const fileName = `${userId}_${videoId}.mp4`;
        const localPath = path.join(this.downloadDir, fileName);
        
        console.log('[Instagram Downloader] Downloading from CDN...');
        const response = await fetch(result.downloadUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to download from CDN: ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        await fs.writeFile(localPath, buffer);
        
        console.log(`[Instagram Downloader] Video saved: ${localPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        
        const videoInfo: VideoInfo = {
          title: result.title || 'Instagram Video',
          duration: result.duration || 0,
          thumbnail: result.thumbnail || '',
          url: result.downloadUrl,
          originalUrl: url,
          platform: 'Instagram',
          extractor: 'instagram-specialized',
        };
        
        return {
          localPath,
          videoInfo,
          fileName,
        };
      }

      // Use specialized TikTok downloader
      if (validation.platform === 'TikTok') {
        console.log('[Video Downloader] Using TikTok specialized downloader for download');
        const result = await tiktokDownloader.getDownloadUrl(url);
        
        const videoId = uuidv4();
        const fileName = `${userId}_${videoId}.mp4`;
        const localPath = path.join(this.downloadDir, fileName);
        
        console.log('[TikTok Downloader] Downloading from CDN...');
        const response = await fetch(result.downloadUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to download from CDN: ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        await fs.writeFile(localPath, buffer);
        
        console.log(`[TikTok Downloader] Video saved: ${localPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        
        const videoInfo: VideoInfo = {
          title: result.title || 'TikTok Video',
          duration: result.duration || 0,
          thumbnail: result.thumbnail || '',
          url: result.downloadUrl,
          originalUrl: url,
          platform: 'TikTok',
          extractor: 'tiktok-specialized',
        };
        
        return {
          localPath,
          videoInfo,
          fileName,
        };
      }

      const videoId = uuidv4();
      const outputTemplate = path.join(this.downloadDir, `${userId}_${videoId}.%(ext)s`);

      
      const referer = validation.platform === 'Twitter/X' ? 'twitter.com' : 'youtube.com';
      const isYouTube = validation.platform === 'YouTube';
      
      const downloadOptions: any = {
        output: outputTemplate,
        format: 'bv*+ba/b',
        mergeOutputFormat: 'mp4',
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          `referer:${referer}`,
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
      };
      
      if (isYouTube) {
        if (process.env.YT_COOKIES_PATH) {
          console.log('[DEBUG] YT_COOKIES_PATH env var found:', process.env.YT_COOKIES_PATH);
          
          try {
            const stats = await fs.stat(process.env.YT_COOKIES_PATH);
            console.log('[DEBUG] Cookies file exists for download');
            console.log('[DEBUG] File size:', stats.size, 'bytes');
            
            downloadOptions.cookies = process.env.YT_COOKIES_PATH;
            console.log('[DEBUG] Using cookies file for YouTube download');
          } catch (error) {
            console.error('[DEBUG] Failed to access cookies file:', error);
            console.log('[DEBUG] Falling back to mobile client strategy for download');
            downloadOptions.extractorArgs = 'youtube:player_client=android';
          }
        } else {
          console.log('[DEBUG] No YT_COOKIES_PATH set, using mobile client for YouTube download');
          downloadOptions.extractorArgs = 'youtube:player_client=android';
        }
      }

      if (validation.platform === 'Twitter/X') {
        console.log('Detected Twitter/X video - using HLS-optimized settings with correct referer');
        // - Token extraction
        // - .m3u8 playlist parsing
        // - Segment downloading & merging
        // - Audio/video synchronization
      }

      const output = await youtubeDl(url, downloadOptions);

      const videoInfo = await this.getVideoInfo(url);

      const files = await fs.readdir(this.downloadDir);
      const downloadedFile = files.find(file => 
        file.startsWith(`${userId}_${videoId}`) && file.endsWith('.mp4')
      );

      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }

      const localPath = path.join(this.downloadDir, downloadedFile);

      console.log(`Video downloaded successfully: ${localPath}`);

      return {
        localPath,
        videoInfo,
        fileName: downloadedFile,
      };
    } catch (error) {
      console.error('Video download failed:', error);
      throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download video and get duration
   */
  async downloadAndGetDuration(url: string, userId: string): Promise<DownloadWithDurationResult> {
    const result = await this.downloadVideo(url, userId);
    
    const ffmpeg = await import('fluent-ffmpeg');
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.default.ffprobe(result.localPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          resolve(Math.ceil(duration));
        }
      });
    });

    return {
      localPath: result.localPath,
      fileName: result.fileName,
      videoInfo: result.videoInfo,
      duration: duration || result.videoInfo.duration,
    };
  }

  /**
   * Clean up downloaded file
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }

  /**
   * Get download status/progress (for future websocket implementation)
   */
  async checkDownloadProgress(videoId: string): Promise<{ status: string; progress: number }> {
    return {
      status: 'processing',
      progress: 0,
    };
  }
}

export const videoDownloader = new VideoDownloaderService();

export default videoDownloader;
