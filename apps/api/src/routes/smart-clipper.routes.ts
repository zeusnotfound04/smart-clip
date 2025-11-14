import { Router } from 'express';
import { analyzeVideo } from '../controllers/smart-clipper.controller';
import { extractClip, getClips } from '../controllers/clip-extraction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Analyze video for highlights
router.post('/analyze', authMiddleware, analyzeVideo);

// Extract clip from video
router.post('/extract', authMiddleware, extractClip);

// Get clips for a video
router.get('/clips/:videoId', authMiddleware, getClips);

export default router;