import { Request, Response } from 'express';
import { multiPlatformDownloadQueue } from '../lib/queues';
import { multiPlatformDownloader } from '../services/downloaders/multi-platform-downloader.service';
import { admissionControl } from '../services/shared/admission-control.service';
import { platformConcurrency } from '../services/shared/platform-concurrency.service';
import { proxyManager } from '../services/shared/proxy-manager.service';
import { prisma } from '../lib/prisma';

/**
 * Multi-Platform Video Download Controller
 * 
 * Handles video downloads from:
 * - Rumble
 * - Kick
 * - Twitch
 * - Google Drive
 * 
 * For auto-subtitle generation
 */

export class MultiPlatformDownloadController {
  /**
   * POST /api/multi-platform/download
   * Queue a video download from supported platforms
   */
  async queueDownload(req: Request, res: Response) {
    try {
      const { url, language, options } = req.body;
      const userId = (req.user as any)?.id || req.body.userId;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Detect platform
      const platform = multiPlatformDownloader.detectPlatform(url);
      
      if (!platform) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported platform. Supported: Rumble, Kick, Twitch, Google Drive',
        });
      }

      console.log(`[Multi-Platform API] Download request for ${platform}: ${url}`);

      // Check admission control
      const admission = await admissionControl.checkAdmission({
        url,
        userId,
        platform,
      });

      if (!admission.admitted) {
        return res.status(429).json({
          success: false,
          error: admission.reason,
          estimatedWaitTime: admission.estimatedWaitTime,
          cached: admission.cached,
          jobId: admission.jobId,
        });
      }

      // Create video record
      const video = await prisma.video.create({
        data: {
          userId,
          url,
          platform,
          status: 'queued',
          language: language || 'en',
        },
      });

      // Queue the download job
      const job = await multiPlatformDownloadQueue.add('download-video', {
        url,
        userId,
        videoId: video.id,
        platform,
        language,
        options,
      });

      console.log(`[Multi-Platform API] Job ${job.id} queued for video ${video.id}`);

      return res.status(202).json({
        success: true,
        message: 'Download queued successfully',
        videoId: video.id,
        jobId: job.id,
        platform,
        estimatedTime: '2-5 minutes',
      });

    } catch (error: any) {
      console.error('[Multi-Platform API] Error queuing download:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to queue download',
      });
    }
  }

  /**
   * GET /api/multi-platform/status/:videoId
   * Check download status
   */
  async getStatus(req: Request, res: Response) {
    try {
      const { videoId } = req.params;
      const userId = (req.user as any)?.id || req.query.userId;

      const video = await prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        });
      }

      // Verify ownership
      if (video.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      return res.json({
        success: true,
        video: {
          id: video.id,
          platform: video.platform,
          status: video.status,
          title: video.title,
          duration: video.duration,
          s3Url: video.s3Url,
          createdAt: video.createdAt,
          updatedAt: video.updatedAt,
        },
      });

    } catch (error: any) {
      console.error('[Multi-Platform API] Error getting status:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get status',
      });
    }
  }

  /**
   * POST /api/multi-platform/download-and-subtitle
   * Download video and immediately queue subtitle generation
   */
  async downloadAndSubtitle(req: Request, res: Response) {
    try {
      const { url, language, options } = req.body;
      const userId = (req.user as any)?.id || req.body.userId;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Detect platform
      const platform = multiPlatformDownloader.detectPlatform(url);
      
      if (!platform) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported platform',
        });
      }

      console.log(`[Multi-Platform API] Download+Subtitle request for ${platform}: ${url}`);

      // Check admission control
      const admission = await admissionControl.checkAdmission({
        url,
        userId,
        platform,
      });

      if (!admission.admitted) {
        return res.status(429).json({
          success: false,
          error: admission.reason,
          estimatedWaitTime: admission.estimatedWaitTime,
        });
      }

      // Create video record
      const video = await prisma.video.create({
        data: {
          userId,
          url,
          platform,
          status: 'queued',
          language: language || 'en',
        },
      });

      // Import subtitle queue
      const { subtitleQueue } = await import('../lib/queues');

      // Queue download+subtitle job directly to subtitle queue
      const job = await subtitleQueue.add('download-and-generate-subtitles', {
        videoId: video.id,
        url,
        userId,
        platform,
        language: language || 'en',
        options,
      });

      console.log(`[Multi-Platform API] Download+Subtitle job ${job.id} queued for video ${video.id}`);

      return res.status(202).json({
        success: true,
        message: 'Download and subtitle generation queued',
        videoId: video.id,
        jobId: job.id,
        platform,
        estimatedTime: '5-10 minutes',
      });

    } catch (error: any) {
      console.error('[Multi-Platform API] Error queuing download+subtitle:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to queue job',
      });
    }
  }

  /**
   * GET /api/multi-platform/info
   * Get video info without downloading (lightweight)
   */
  async getVideoInfo(req: Request, res: Response) {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'URL parameter is required',
        });
      }

      // Detect platform
      const platform = multiPlatformDownloader.detectPlatform(url);
      
      if (!platform) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported platform',
        });
      }

      console.log(`[Multi-Platform API] Info request for ${platform}: ${url}`);

      // Get video info
      const info = await multiPlatformDownloader.getVideoInfo(url);

      return res.json({
        success: true,
        platform,
        info: {
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
        },
      });

    } catch (error: any) {
      console.error('[Multi-Platform API] Error getting video info:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get video info',
      });
    }
  }

  /**
   * GET /api/multi-platform/stats
   * Get system statistics (admin only)
   */
  async getSystemStats(req: Request, res: Response) {
    try {
      // Get platform concurrency stats
      const platformStats = await platformConcurrency.getStats();
      
      // Get proxy stats
      const proxyStats = proxyManager.getStats();
      
      // Get admission control stats
      const admissionStats = await admissionControl.getStats();
      
      // Get queue stats
      const queueStats = await multiPlatformDownloadQueue.getJobCounts();

      return res.json({
        success: true,
        stats: {
          platforms: platformStats,
          proxies: proxyStats,
          admission: admissionStats,
          queue: queueStats,
        },
      });

    } catch (error: any) {
      console.error('[Multi-Platform API] Error getting stats:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stats',
      });
    }
  }
}

export const multiPlatformDownloadController = new MultiPlatformDownloadController();
