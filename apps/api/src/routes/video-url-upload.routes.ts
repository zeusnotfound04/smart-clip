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

router.get('/platforms', getSupportedPlatforms);

router.get('/proxy', proxyVideo);

router.post('/validate', authMiddleware, validateUrl);
router.post('/info', authMiddleware, getVideoInfo);
router.post('/upload', authMiddleware, uploadFromUrl);

export default router;
