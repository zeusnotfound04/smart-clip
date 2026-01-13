import { Router } from 'express';
import { generate, getTemplatesController } from '../controllers/script-generator.controller';
import { refineScript } from '../controllers/refine-script.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/generate', authMiddleware, generate);
router.post('/refine', authMiddleware, refineScript);
router.get('/templates', authMiddleware, getTemplatesController);

export default router;