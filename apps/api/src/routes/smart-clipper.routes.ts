import { Router } from 'express';
import { analyzeVideo, getContentTypes, getUserProjects, getProject } from '../controllers/smart-clipper.controller';
import { extractClip, getClips } from '../controllers/clip-extraction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.get('/content-types', authMiddleware, getContentTypes);
router.get('/projects', authMiddleware, getUserProjects);
router.get('/projects/:projectId', authMiddleware, getProject);
router.post('/analyze', authMiddleware, analyzeVideo);
router.post('/extract', authMiddleware, extractClip);
router.get('/clips/:videoId', authMiddleware, getClips);

export default router;