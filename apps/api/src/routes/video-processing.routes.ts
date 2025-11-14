import { Router } from 'express';
import { 
  compress, 
  convert, 
  watermark, 
  extractVideoAudio 
} from '../controllers/video-processing.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Compress video
router.post('/compress', authMiddleware, compress);

// Convert video format
router.post('/convert', authMiddleware, convert);

// Add watermark to video
router.post('/watermark', authMiddleware, watermark);

// Extract audio from video
router.post('/extract-audio', authMiddleware, extractVideoAudio);

export default router;