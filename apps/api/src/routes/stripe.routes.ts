import express, { Router } from 'express';
import { stripeWebhookController } from '../controllers/stripe-webhook.controller.js';

const router: Router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookController.handleWebhook
);

export default router;
