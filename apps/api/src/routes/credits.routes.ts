import express, { Router } from 'express';
import { creditsController } from '../controllers/credits.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();

// All credits routes require authentication
router.use(authenticateToken);

// Get credit balance and stats
router.get('/balance', creditsController.getBalance);

// Get transaction history
router.get('/history', creditsController.getHistory);

// Calculate credits for duration
router.post('/calculate', creditsController.calculateCredits);

// Get usage statistics
router.get('/stats', creditsController.getStats);

export default router;
