import { Router } from 'express';
import { analyzeVideo } from '../controllers/smart-clipper.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Analyze video for highlights
router.post('/analyze', authMiddleware, analyzeVideo);

export default router;