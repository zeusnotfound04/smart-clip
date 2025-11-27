import { Router } from 'express';
import { analyzeVideo, getContentTypes, getUserProjects, getProject } from '../controllers/smart-clipper.controller';
import { extractClip, getClips } from '../controllers/clip-extraction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Get content types configuration
router.get('/content-types', authMiddleware, getContentTypes);

// Get user's smart clipper projects
router.get('/projects', authMiddleware, getUserProjects);

// Get specific project by ID
router.get('/projects/:projectId', authMiddleware, getProject);

// Analyze video for highlights
router.post('/analyze', authMiddleware, analyzeVideo);

// Extract clip from video
router.post('/extract', authMiddleware, extractClip);

// Get clips for a video
router.get('/clips/:videoId', authMiddleware, getClips);

export default router;