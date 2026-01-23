import { Router } from 'express';
import { multiPlatformDownloadController } from '../controllers/multi-platform-download.controller';

/**
 * Multi-Platform Video Download Routes
 * 
 * Endpoints for downloading videos from:
 * - Rumble
 * - Kick
 * - Twitch
 * - Google Drive
 */

const router = Router();

// Queue a video download
router.post(
  '/download',
  multiPlatformDownloadController.queueDownload.bind(multiPlatformDownloadController)
);

// Download and generate subtitles in one request
router.post(
  '/download-and-subtitle',
  multiPlatformDownloadController.downloadAndSubtitle.bind(multiPlatformDownloadController)
);

// Get download status
router.get(
  '/status/:videoId',
  multiPlatformDownloadController.getStatus.bind(multiPlatformDownloadController)
);

// Get video info without downloading (lightweight)
router.get(
  '/info',
  multiPlatformDownloadController.getVideoInfo.bind(multiPlatformDownloadController)
);

// Get system statistics (admin)
router.get(
  '/stats',
  multiPlatformDownloadController.getSystemStats.bind(multiPlatformDownloadController)
);

export default router;
