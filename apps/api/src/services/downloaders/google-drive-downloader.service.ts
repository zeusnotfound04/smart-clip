import { createClient } from 'redis';
import crypto from 'crypto';
import { platformConcurrency, PlatformSlot } from '../shared/platform-concurrency.service';
import fetch from 'node-fetch';
import { google } from 'googleapis';

/**
 * Google Drive Video Downloader Service
 * 
 * Downloads PUBLIC Google Drive videos.
 * Does NOT use proxies (Google Drive already has good global distribution).
 * 
 * Features:
 * - Google Drive API for public files
 * - Platform concurrency control (max 1 concurrent)
 * - Redis caching (2 hour TTL)
 * - Direct download link generation
 * - File size validation
 */

interface DownloadResult {
  downloadUrl: string;
  title?: string;
  fileSize?: number;
  mimeType?: string;
  cached: boolean;
}

export class GoogleDriveDownloaderService {
  private redisClient: any = null;
  
  // Configuration
  private readonly CACHE_TTL = 7200; // 2 hours
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  
  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Google Drive Downloader] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Google Drive Downloader] Redis connected');
    } catch (error) {
      console.error('[Google Drive Downloader] Failed to connect to Redis:', error);
    }
  }

  /**
   * Extract file ID from Google Drive URL
   */
  private extractFileId(driveUrl: string): string | null {
    try {
      const url = new URL(driveUrl);
      
      // Format: https://drive.google.com/file/d/{FILE_ID}/view
      const pathMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }
      
      // Format: https://drive.google.com/open?id={FILE_ID}
      const idParam = url.searchParams.get('id');
      if (idParam) {
        return idParam;
      }
      
      // Format: https://docs.google.com/file/d/{FILE_ID}
      const docsMatch = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (docsMatch) {
        return docsMatch[1];
      }
      
      return null;
    } catch (error) {
      console.error('[Google Drive Downloader] Failed to parse URL:', error);
      return null;
    }
  }

  async getDownloadUrl(driveUrl: string): Promise<DownloadResult> {
    console.log('[Google Drive Downloader] Processing URL:', driveUrl);
    
    // Extract file ID
    const fileId = this.extractFileId(driveUrl);
    if (!fileId) {
      throw new Error('Invalid Google Drive URL format. Please provide a valid file link.');
    }
    
    console.log('[Google Drive Downloader] File ID:', fileId);
    
    // Check cache first
    const cached = await this.getCached(fileId);
    if (cached) {
      return cached;
    }

    let platformSlot: PlatformSlot | null = null;
    
    try {
      // Acquire platform slot (max 1 concurrent for Google Drive)
      platformSlot = await platformConcurrency.acquireSlot('google-drive');
      console.log('[Google Drive Downloader] Platform slot acquired');
      
      // Get file metadata and download URL
      const result = await this.getFileInfo(fileId);
      
      // Validate file size
      if (result.fileSize && result.fileSize > this.MAX_FILE_SIZE) {
        throw new Error(`File too large: ${Math.round(result.fileSize / (1024 * 1024 * 1024))}GB (max: 2GB)`);
      }
      
      // Validate mime type (must be video)
      if (result.mimeType && !result.mimeType.startsWith('video/')) {
        throw new Error(`File is not a video (type: ${result.mimeType})`);
      }
      
      // Cache the result
      await this.setCached(fileId, result);
      
      return result;
      
    } catch (error) {
      console.error('[Google Drive Downloader] Download failed:', error);
      throw error;
      
    } finally {
      if (platformSlot) {
        await platformConcurrency.releaseSlot(platformSlot);
      }
    }
  }

  /**
   * Get file information and download URL from Google Drive
   */
  private async getFileInfo(fileId: string): Promise<DownloadResult> {
    console.log('[Google Drive Downloader] Fetching file metadata');
    
    try {
      // Method 1: Try direct download link (works for public files)
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      // Verify file is accessible and get metadata
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,size,mimeType,webContentLink&supportsAllDrives=true&key=${process.env.GOOGLE_DRIVE_API_KEY || 'NO_KEY'}`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'SmartClip-Subtitle-Service/1.0',
          },
          timeout: this.REQUEST_TIMEOUT,
        }
      );
      
      if (response.status === 404) {
        throw new Error('File not found. Make sure the file is publicly accessible.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. Make sure the file sharing is set to "Anyone with the link".');
      }
      
      if (!response.ok) {
        // Fallback to simple direct URL if API key not configured
        if (!process.env.GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY === 'NO_KEY') {
          console.log('[Google Drive Downloader] No API key, using direct URL method');
          return {
            downloadUrl: directUrl,
            title: 'Google Drive Video',
            cached: false,
          };
        }
        
        throw new Error(`Failed to access file: ${response.statusText}`);
      }
      
      const fileInfo: any = await response.json();
      
      console.log('[Google Drive Downloader] File info retrieved:', fileInfo.name);
      
      return {
        downloadUrl: directUrl,
        title: fileInfo.name || 'Google Drive Video',
        fileSize: fileInfo.size ? parseInt(fileInfo.size) : undefined,
        mimeType: fileInfo.mimeType || undefined,
        cached: false,
      };
      
    } catch (error: any) {
      console.error('[Google Drive Downloader] API error:', error);
      
      // If API fails, try direct download URL as fallback
      if (error.message?.includes('API key') || error.message?.includes('quota')) {
        console.log('[Google Drive Downloader] Falling back to direct URL');
        return {
          downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
          title: 'Google Drive Video',
          cached: false,
        };
      }
      
      throw new Error(`Failed to access Google Drive file: ${error.message}`);
    }
  }

  /**
   * Cache operations
   */
  private getCacheKey(fileId: string): string {
    return `gdrive:video:${fileId}`;
  }

  private async getCached(fileId: string): Promise<DownloadResult | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = this.getCacheKey(fileId);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        console.log('[Google Drive Downloader] Cache HIT:', fileId);
        const data = JSON.parse(cached);
        return { ...data, cached: true };
      }
      
      console.log('[Google Drive Downloader] Cache MISS:', fileId);
    } catch (error) {
      console.error('[Google Drive Downloader] Cache read error:', error);
    }
    
    return null;
  }

  private async setCached(fileId: string, result: DownloadResult): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = this.getCacheKey(fileId);
      const data = { ...result, cached: undefined };
      await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      console.log(`[Google Drive Downloader] Cached for ${this.CACHE_TTL}s:`, fileId);
    } catch (error) {
      console.error('[Google Drive Downloader] Cache write error:', error);
    }
  }
}

export const googleDriveDownloader = new GoogleDriveDownloaderService();
