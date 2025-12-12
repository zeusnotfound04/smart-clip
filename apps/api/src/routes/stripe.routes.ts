import express, { Router } from 'express';
import { stripeWebhookController } from '../controllers/stripe-webhook.controller.js';

const router: Router = express.Router();

// Stripe webhook endpoint
// Note: This route MUST use raw body, not JSON middleware
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookController.handleWebhook
);

export default router;
