import { Router } from 'express';
import { create, list, getStatus } from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/', authMiddleware, create);
router.get('/', authMiddleware, list);
router.get('/:id/status', authMiddleware, getStatus);

export default router;