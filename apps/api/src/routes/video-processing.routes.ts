import { Router } from 'express';
import { 
  compress, 
  convert, 
  watermark, 
  extractVideoAudio 
} from '../controllers/video-processing.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/compress', authMiddleware, compress);

router.post('/convert', authMiddleware, convert);

router.post('/watermark', authMiddleware, watermark);

router.post('/extract-audio', authMiddleware, extractVideoAudio);

export default router;