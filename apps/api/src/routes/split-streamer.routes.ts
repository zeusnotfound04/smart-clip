import { Router } from 'express';
import { combine } from '../controllers/split-streamer.controller';
import { generatePreview } from '../controllers/preview.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Combine webcam and gameplay videos
router.post('/combine', authMiddleware, combine);

// Generate preview frame
router.post('/preview', authMiddleware, generatePreview);

export default router;