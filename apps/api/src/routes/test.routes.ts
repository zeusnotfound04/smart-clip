import express, { Router } from 'express';
import { testController } from '../controllers/test.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();

// TEMPORARY TEST ROUTE - Remove in production
router.post('/simulate-checkout-success', authenticateToken, testController.simulateCheckoutSuccess);

export default router;
