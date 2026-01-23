import { rumbleDownloader } from './rumble-downloader.service';
import { kickDownloader } from './kick-downloader.service';
import { twitchDownloader } from './twitch-downloader.service';
import { googleDriveDownloader } from './google-drive-downloader.service';
import { zoomClipDownloaderService } from './zoom-clip-downloader.service';
import { admissionControl } from '../shared/admission-control.service';
import youtubeDl from 'youtube-dl-exec';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

/**
 * Multi-Platform Video Downloader
 * 
 * Unified service that orchestrates downloads across all supported platforms:
 * - Rumble
 * - Kick
 * - Twitch
 * - Google Drive
 * - Zoom Clips
 * - (Plus existing: TikTok, Instagram, YouTube, Twitter)
 * 
 * Features:
 * - Admission control before download
 * - Platform-specific downloader routing
 * - Unified error handling
 * - Download to local storage with cleanup
 */

export interface DownloadRequest {
  url: string;
  userId: string;
  platform?: string; // Auto-detect if not provided
}

export interface DownloadResult {
  localPath: string;
  videoInfo: {
    title: string;
    duration: number;
    thumbnail?: string;
    platform: string;
  };
  fileName: string;
}

export class MultiPlatformDownloaderService {
  private readonly downloadDir: string;

  constructor() {
    this.downloadDir = path.join(process.cwd(), 'uploads', 'downloaded-videos');
    this.ensureDownloadDir();
  }

  private async ensureDownloadDir() {
    try {
      await fs.mkdir(this.downloadDir, { recursive: true });
    } catch (error) {
      console.error('[Multi-Platform Downloader] Failed to create download directory:', error);
    }
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      if (hostname.includes('rumble.com')) return 'rumble';
      if (hostname.includes('kick.com')) return 'kick';
      if (hostname.includes('twitch.tv')) return 'twitch';
      if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) return 'google-drive';
      if (hostname.includes('zoom.us') && url.includes('/clips/share/')) return 'zoom-clip';
      if (hostname.includes('tiktok.com')) return 'tiktok';
      if (hostname.includes('instagram.com')) return 'instagram';
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Main download method with admission control
   */
  async download(request: DownloadRequest): Promise<DownloadResult> {
    console.log('[Multi-Platform Downloader] Starting download for user:', request.userId);
    
    // Detect platform if not provided
    const platform = request.platform || this.detectPlatform(request.url);
    
    if (!platform) {
      throw new Error('Could not detect platform from URL. Supported: Rumble, Kick, Twitch, Google Drive, Zoom Clips, TikTok, Instagram, YouTube, Twitter');
    }

    console.log('[Multi-Platform Downloader] Detected platform:', platform);

    // Check admission control for new platforms
    if (['rumble', 'kick', 'twitch', 'google-drive', 'zoom-clip'].includes(platform)) {
      const admission = await admissionControl.checkAdmission({
        url: request.url,
        userId: request.userId,
        platform,
      });

      if (!admission.admitted) {
        throw new Error(admission.reason || 'Request denied by admission control');
      }
    }

    try {
      // Route to appropriate downloader
      const result = await this.downloadByPlatform(request.url, platform);
      
      // Record completion with admission control
      if (['rumble', 'kick', 'twitch', 'google-drive', 'zoom-clip'].includes(platform)) {
        await admissionControl.recordCompletion(request.url, request.userId, `${Date.now()}`);
      }
      
      return result;
      
    } catch (error) {
      // Record failure with admission control
      if (['rumble', 'kick', 'twitch', 'google-drive', 'zoom-clip'].includes(platform)) {
        await admissionControl.recordFailure(request.url, request.userId);
      }
      
      throw error;
    }
  }

  /**
   * Route download to platform-specific service
   */
  private async downloadByPlatform(url: string, platform: string): Promise<DownloadResult> {
    let downloadUrl: string;
    let videoInfo: any;

    // Get download URL from platform-specific service
    switch (platform) {
      case 'rumble':
        const rumbleResult = await rumbleDownloader.getDownloadUrl(url);
        downloadUrl = rumbleResult.downloadUrl;
        videoInfo = {
          title: rumbleResult.title || 'Rumble Video',
          duration: rumbleResult.duration || 0,
          thumbnail: rumbleResult.thumbnail,
          platform: 'Rumble',
        };
        break;

      case 'kick':
        const kickResult = await kickDownloader.getDownloadUrl(url);
        downloadUrl = kickResult.downloadUrl;
        videoInfo = {
          title: kickResult.title || 'Kick Video',
          duration: kickResult.duration || 0,
          thumbnail: kickResult.thumbnail,
          platform: 'Kick',
        };
        break;

      case 'twitch':
        const twitchResult = await twitchDownloader.getDownloadUrl(url);
        downloadUrl = twitchResult.downloadUrl;
        videoInfo = {
          title: twitchResult.title || 'Twitch Video',
          duration: twitchResult.duration || 0,
          thumbnail: twitchResult.thumbnail,
          platform: 'Twitch',
        };
        break;

      case 'google-drive':
        const driveResult = await googleDriveDownloader.getDownloadUrl(url);
        downloadUrl = driveResult.downloadUrl;
        videoInfo = {
          title: driveResult.title || 'Google Drive Video',
          duration: 0, // Duration not available from Google Drive API
          thumbnail: undefined,
          platform: 'Google Drive',
        };
        break;

      case 'zoom-clip':
        const zoomResult = await zoomClipDownloaderService.getDownloadUrl(url);
        downloadUrl = zoomResult.downloadUrl;
        videoInfo = {
          title: zoomResult.title || 'Zoom Clip',
          duration: zoomResult.duration || 0,
          thumbnail: zoomResult.thumbnail,
          platform: 'Zoom Clips',
        };
        break;

      default:
        throw new Error(`Platform ${platform} not supported by multi-platform downloader`);
    }

    // Download the file to local storage
    console.log('[Multi-Platform Downloader] Downloading file from URL...');
    const localPath = await this.downloadFile(downloadUrl, videoInfo.title);

    // Get actual duration if not available
    if (videoInfo.duration === 0) {
      try {
        videoInfo.duration = await this.getVideoDuration(localPath);
      } catch (error) {
        console.warn('[Multi-Platform Downloader] Failed to get video duration:', error);
      }
    }

    return {
      localPath,
      videoInfo,
      fileName: path.basename(localPath),
    };
  }

  /**
   * Download file from URL to local storage
   */
  private async downloadFile(url: string, title: string): Promise<string> {
    const fileName = `${uuidv4()}_${this.sanitizeFileName(title)}.mp4`;
    const filePath = path.join(this.downloadDir, fileName);

    console.log('[Multi-Platform Downloader] Downloading to:', filePath);

    try {
      const response = await fetch(url, {
        timeout: 120000, // 2 minutes
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      await fs.writeFile(filePath, buffer);

      const stats = await fs.stat(filePath);
      console.log(`[Multi-Platform Downloader] Downloaded ${stats.size} bytes`);

      return filePath;
    } catch (error: any) {
      console.error('[Multi-Platform Downloader] Download error:', error);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  /**
   * Get video duration using yt-dlp
   */
  private async getVideoDuration(filePath: string): Promise<number> {
    try {
      const info = await youtubeDl(filePath, {
        dumpSingleJson: true,
        noWarnings: true,
      });

      return info.duration || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Sanitize filename
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-z0-9_\-\.]/gi, '_')
      .substring(0, 100);
  }

  /**
   * Clean up downloaded file
   */
  async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log('[Multi-Platform Downloader] Cleaned up:', filePath);
    } catch (error) {
      console.error('[Multi-Platform Downloader] Cleanup error:', error);
    }
  }

  /**
   * Get video info without downloading (lightweight)
   */
  async getVideoInfo(url: string): Promise<any> {
    const platform = this.detectPlatform(url);
    
    if (!platform) {
      throw new Error('Unsupported platform');
    }

    // For new platforms, get info from respective services
    switch (platform) {
      case 'rumble':
        return await rumbleDownloader.getDownloadUrl(url);
      case 'kick':
        return await kickDownloader.getDownloadUrl(url);
      case 'twitch':
        return await twitchDownloader.getDownloadUrl(url);
      case 'google-drive':
        return await googleDriveDownloader.getDownloadUrl(url);
      case 'zoom-clip':
        return await zoomClipDownloaderService.getDownloadUrl(url);
      default:
        throw new Error(`Platform ${platform} not supported for info retrieval`);
    }
  }
}

// Export singleton instance
export const multiPlatformDownloader = new MultiPlatformDownloaderService();
