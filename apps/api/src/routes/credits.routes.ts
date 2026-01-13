import express, { Router } from 'express';
import { creditsController } from '../controllers/credits.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();

router.use(authenticateToken);

router.get('/balance', creditsController.getBalance);
router.get('/history', creditsController.getHistory);
router.post('/calculate', creditsController.calculateCredits);
router.get('/stats', creditsController.getStats);

export default router;
