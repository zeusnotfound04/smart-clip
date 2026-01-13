import { Router } from 'express';
import { combine, updateLayout, downloadCombined, getProject } from '../controllers/split-streamer.controller';
import { generatePreview } from '../controllers/preview.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/combine', authMiddleware, combine);
router.put('/update-layout/:projectId', authMiddleware, updateLayout);
router.get('/download/:projectId', authMiddleware, downloadCombined);
router.get('/project/:projectId', authMiddleware, getProject);
router.post('/preview', authMiddleware, generatePreview);

export default router;