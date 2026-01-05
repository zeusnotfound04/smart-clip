import { Router } from 'express';
import {
  validateUrl,
  uploadFromUrl,
  getSupportedPlatforms,
  getVideoInfo,
} from '../controllers/video-url-upload.controller';
import { proxyVideo } from '../controllers/video-proxy.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Public endpoint - get supported platforms
router.get('/platforms', getSupportedPlatforms);

// Video proxy endpoint - NO AUTH REQUIRED (video element can't send headers)
// The actual Twitter video URL is already validated when user calls /info endpoint
router.get('/proxy', proxyVideo);

// Protected endpoints - require authentication
router.post('/validate', authMiddleware, validateUrl);
router.post('/info', authMiddleware, getVideoInfo);
router.post('/upload', authMiddleware, uploadFromUrl);

export default router;
