import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as instagramController from '../controllers/instagram-downloader.controller';

const router = Router();

/**
 * POST /api/instagram/download
 * Get Instagram video download URL
 * 
 * Body: { url: string }
 * Returns: { downloadUrl, thumbnail, duration, cached }
 */
router.post(
  '/download',
  authenticateToken,
  instagramController.getInstagramDownloadUrl
);

/**
 * GET /api/instagram/stats
 * Get service statistics
 */
router.get(
  '/stats',
  authenticateToken,
  instagramController.getInstagramDownloaderStats
);

/**
 * GET /api/instagram/health
 * Health check endpoint
 */
router.get(
  '/health',
  instagramController.healthCheck
);

export default router;
