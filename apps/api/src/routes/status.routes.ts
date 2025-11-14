import { Router } from 'express';
import { getJobStatus, getProjectStatus } from '../controllers/status.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.get('/job/:type/:jobId', getJobStatus);
router.get('/project/:projectId', authMiddleware, getProjectStatus);

export default router;