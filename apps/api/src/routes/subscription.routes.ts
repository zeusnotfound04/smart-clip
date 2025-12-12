import express from 'express';
import { subscriptionController } from '../controllers/subscription.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get available plans (public)
router.get('/plans', subscriptionController.getPlans);

// Get user's subscription details (protected)
router.get('/details', authenticateToken, subscriptionController.getSubscription);

// Create Stripe Checkout session (protected)
router.post('/create-checkout-session', authenticateToken, subscriptionController.createCheckoutSession);

// Create new subscription (protected)
router.post('/create', authenticateToken, subscriptionController.createSubscription);

// Cancel subscription (protected)
router.post('/cancel', authenticateToken, subscriptionController.cancelSubscription);

// Resume subscription (protected)
router.post('/resume', authenticateToken, subscriptionController.resumeSubscription);

// Update subscription tier (protected)
router.put('/update', authenticateToken, subscriptionController.updateSubscription);

export default router;
