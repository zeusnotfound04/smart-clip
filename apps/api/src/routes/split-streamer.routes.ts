import { Router } from 'express';
import { combine, updateLayout, downloadCombined, getProject } from '../controllers/split-streamer.controller';
import { generatePreview } from '../controllers/preview.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Combine webcam and gameplay videos
router.post('/combine', authMiddleware, combine);

// Update layout configuration
router.put('/update-layout/:projectId', authMiddleware, updateLayout);

// Download combined video
router.get('/download/:projectId', authMiddleware, downloadCombined);

// Get project details
router.get('/project/:projectId', authMiddleware, getProject);

// Generate preview frame
router.post('/preview', authMiddleware, generatePreview);

export default router;