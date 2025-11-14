import { Router } from 'express';
import { combine } from '../controllers/split-streamer.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Combine webcam and gameplay videos
router.post('/combine', authMiddleware, combine);

export default router;