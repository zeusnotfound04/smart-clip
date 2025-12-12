import express, { Router } from 'express';
import { creditsController } from '../controllers/credits.controller.js';

const router: Router = express.Router();

// Get credit balance and stats
router.get('/balance', creditsController.getBalance);

// Get transaction history
router.get('/history', creditsController.getHistory);

// Calculate credits for duration
router.post('/calculate', creditsController.calculateCredits);

// Get usage statistics
router.get('/stats', creditsController.getStats);

export default router;
