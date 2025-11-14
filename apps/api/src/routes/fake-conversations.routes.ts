import { Router } from 'express';
import { create, getThemesController, getVoicesController } from '../controllers/fake-conversations.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Create conversation video
router.post('/create', authMiddleware, create);

// Get themes
router.get('/themes', authMiddleware, getThemesController);

// Get voices
router.get('/voices', authMiddleware, getVoicesController);

export default router;