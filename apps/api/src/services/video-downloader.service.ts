import youtubeDl from 'youtube-dl-exec';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Video Downloader Service
 * 
 * Handles downloading videos from various platforms using yt-dlp.
 * 
 * ## Twitter/X Video Strategy:
 * 
 * Twitter videos are HLS (.m3u8) streams with:
 * - Signed URLs (temporary tokens)
 * - Multiple quality variants
 * - Separate audio/video tracks
 * 
 * yt-dlp automatically handles:
 * ✅ Token extraction from page
 * ✅ .m3u8 playlist parsing
 * ✅ Segment downloading & merging
 * ✅ Audio/video synchronization
 * ✅ Output as clean MP4
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
    // Use uploads directory for downloaded videos
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

      // YouTube
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return { isValid: true, platform: 'YouTube' };
      }

      // Twitter/X
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        return { isValid: true, platform: 'Twitter/X' };
      }

      // Instagram
      if (hostname.includes('instagram.com')) {
        return { isValid: true, platform: 'Instagram' };
      }

      // TikTok
      if (hostname.includes('tiktok.com')) {
        return { isValid: true, platform: 'TikTok' };
      }

      // Vimeo
      if (hostname.includes('vimeo.com')) {
        return { isValid: true, platform: 'Vimeo' };
      }

      // Facebook
      if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) {
        return { isValid: true, platform: 'Facebook' };
      }

      return {
        isValid: false,
        error: 'Unsupported platform. Supported: YouTube, Twitter/X, Instagram, TikTok, Vimeo, Facebook'
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
      // Check platform to determine if we need cookies
      const validation = this.validateUrl(url);
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
      
      // YouTube bot detection bypass strategies
      if (isYouTube) {
        // Strategy 1: Use cookies file if available
        if (process.env.YT_COOKIES_PATH) {
          options.cookies = process.env.YT_COOKIES_PATH;
          console.log(' Using cookies file for YouTube:', process.env.YT_COOKIES_PATH);
        } else {
          // Strategy 2: Use mobile client to bypass bot detection
          console.log(' Using mobile client for YouTube (bot detection bypass)');
          options.extractorArgs = 'youtube:player_client=android';
        }
      }
      
      const info = await youtubeDl(url, options) as any;

      console.log('🔍 yt-dlp info retrieved for:', url);
      console.log('📺 Title:', info.title);
      console.log('🌐 Platform:', info.webpage_url_domain || info.extractor);
      console.log('🔗 webpage_url:', info.webpage_url);

      // Extract direct video URL if available (for embedding)
      let directUrl = url; // Default to original URL
      
      // For YouTube, use the watch URL
      if (info.webpage_url) {
        directUrl = info.webpage_url;
        console.log('✅ Using webpage_url:', directUrl);
      }
      
      // Try to get a playable format URL (lower quality for preview)
      if (info.formats && Array.isArray(info.formats)) {
        console.log(`📊 Found ${info.formats.length} formats`);
        
        // Find a format with both video and audio, or just video
        const playableFormat = info.formats.find((f: any) => 
          f.url && (f.vcodec !== 'none' || f.acodec !== 'none')
        );
        
        if (playableFormat?.url) {
          console.log('🎬 Playable format found:');
          console.log('   - Format ID:', playableFormat.format_id);
          console.log('   - Quality:', playableFormat.quality || playableFormat.format_note);
          console.log('   - Resolution:', playableFormat.resolution || `${playableFormat.width}x${playableFormat.height}`);
          console.log('   - Video codec:', playableFormat.vcodec);
          console.log('   - Audio codec:', playableFormat.acodec);
          console.log('   - URL:', playableFormat.url);
          directUrl = playableFormat.url;
        } else {
          console.log('⚠️  No playable format with direct URL found');
        }
      }

      console.log('🎯 Final directUrl being used:', directUrl);

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
      // Validate URL first
      const validation = this.validateUrl(url);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid URL');
      }

      console.log(`📥 Downloading video from ${validation.platform}: ${url}`);

      // Generate unique filename
      const videoId = uuidv4();
      const outputTemplate = path.join(this.downloadDir, `${userId}_${videoId}.%(ext)s`);

      // Download with best quality - optimized for Twitter HLS streams
      // Twitter videos are HLS (.m3u8) streams, yt-dlp handles extraction & merging
      
      // Set appropriate referer based on platform
      const referer = validation.platform === 'Twitter/X' ? 'twitter.com' : 'youtube.com';
      const isYouTube = validation.platform === 'YouTube';
      
      const downloadOptions: any = {
        output: outputTemplate,
        // Golden format selector: best video + best audio, fallback to best combined
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
      
      // YouTube bot detection bypass strategies
      if (isYouTube) {
        // Strategy 1: Use cookies file if available
        if (process.env.YT_COOKIES_PATH) {
          downloadOptions.cookies = process.env.YT_COOKIES_PATH;
          console.log('🍪 Using cookies file for YouTube:', process.env.YT_COOKIES_PATH);
        } else {
          // Strategy 2: Use mobile client to bypass bot detection
          console.log('📱 Using mobile client for YouTube (bot detection bypass)');
          downloadOptions.extractorArgs = 'youtube:player_client=android';
        }
      }

      // For Twitter/X, add specific handling for HLS streams
      if (validation.platform === 'Twitter/X') {
        console.log('🐦 Detected Twitter/X video - using HLS-optimized settings with correct referer');
        // yt-dlp automatically handles:
        // - Token extraction
        // - .m3u8 playlist parsing
        // - Segment downloading & merging
        // - Audio/video synchronization
      }

      const output = await youtubeDl(url, downloadOptions);

      // Get video info
      const videoInfo = await this.getVideoInfo(url);

      // Find the downloaded file (yt-dlp may change the extension)
      const files = await fs.readdir(this.downloadDir);
      const downloadedFile = files.find(file => 
        file.startsWith(`${userId}_${videoId}`) && file.endsWith('.mp4')
      );

      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }

      const localPath = path.join(this.downloadDir, downloadedFile);

      console.log(`✅ Video downloaded successfully: ${localPath}`);

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
    
    // Use ffprobe to get accurate duration
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
      console.log(`🗑️ Cleaned up file: ${filePath}`);
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error);
    }
  }

  /**
   * Get download status/progress (for future websocket implementation)
   */
  async checkDownloadProgress(videoId: string): Promise<{ status: string; progress: number }> {
    // Placeholder for future implementation with progress tracking
    return {
      status: 'processing',
      progress: 0,
    };
  }
}

// Export singleton instance
export const videoDownloader = new VideoDownloaderService();

// Export for testing
export default videoDownloader;
