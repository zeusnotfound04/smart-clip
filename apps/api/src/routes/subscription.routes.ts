import express, { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();

router.get('/plans', subscriptionController.getPlans);
router.get('/details', authenticateToken, subscriptionController.getSubscription);
router.post('/create-checkout-session', authenticateToken, subscriptionController.createCheckoutSession);
router.post('/create', authenticateToken, subscriptionController.createSubscription);
router.post('/cancel', authenticateToken, subscriptionController.cancelSubscription);
router.post('/resume', authenticateToken, subscriptionController.resumeSubscription);
router.put('/update', authenticateToken, subscriptionController.updateSubscription);

export default router;
