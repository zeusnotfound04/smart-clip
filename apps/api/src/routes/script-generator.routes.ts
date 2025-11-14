import { Router } from 'express';
import { generate, getTemplatesController } from '../controllers/script-generator.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Generate script
router.post('/generate', authMiddleware, generate);

// Get templates
router.get('/templates', authMiddleware, getTemplatesController);

export default router;