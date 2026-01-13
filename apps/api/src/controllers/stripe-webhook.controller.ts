import { Request, Response } from 'express';
import { stripe, STRIPE_CONFIG } from '../config/stripe.js';
import { PrismaClient } from '@prisma/client';
import { subscriptionService } from '../services/subscription.service.js';
import { creditsService } from '../services/credits.service.js';

const prisma = new PrismaClient();

export const stripeWebhookController = {
  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    if (!sig || !STRIPE_CONFIG.webhookSecret) {
      return res.status(400).json({
        success: false,
        message: 'Missing stripe signature or webhook secret',
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_CONFIG.webhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({
        success: false,
        message: `Webhook Error: ${err.message}`,
      });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(event.data.object);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object);
          break;

        case 'customer.created':
          console.log('Customer created:', event.data.object.id);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook handler error:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook handler failed',
        error: error.message,
      });
    }
  },
};

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(session: any) {
  console.log('Checkout session completed:', session.id);

  const userId = session.client_reference_id || session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session');
    return;
  }

  const tier = session.metadata?.tier;
  const billingPeriod = session.metadata?.billingPeriod;
  const credits = parseInt(session.metadata?.credits || '0');

  if (!tier || !billingPeriod) {
    console.error('Missing tier or billingPeriod in metadata');
    return;
  }

  const subscriptionId = session.subscription;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: subscriptionId,
      subscriptionTier: tier,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date(),
      trialUsed: true,
    },
  });

  if (credits > 0) {
    await creditsService.addCredits({
      userId,
      amount: credits,
      type: 'subscription',
      description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription - ${billingPeriod} billing`,
      stripePaymentId: session.id,
    });
  }

  console.log(`Subscription activated for user ${userId}: ${tier} (${billingPeriod})`);
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription: any) {
  console.log('Subscription created:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    },
  });
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id);

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    },
  });

  await prisma.subscriptionHistory.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
      status: { in: ['active', 'past_due'] },
    },
    data: {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'canceled',
      subscriptionTier: 'free',
      subscriptionEndDate: new Date(),
    },
  });

  await prisma.subscriptionHistory.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
      status: { in: ['active', 'past_due'] },
    },
    data: {
      status: 'canceled',
      endDate: new Date(),
      canceledAt: new Date(),
    },
  });
}

/**
 * Handle successful payment
 */
async function handleInvoicePaid(invoice: any) {
  console.log('Invoice paid:', invoice.id);

  const subscription = invoice.subscription;
  if (!subscription) {
    return;
  }

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription },
    select: { id: true, subscriptionTier: true },
  });

  if (!user) {
    console.error('User not found for subscription:', subscription);
    return;
  }

  if (user.subscriptionTier !== 'free') {
    await subscriptionService.renewSubscriptionCredits(user.id, user.subscriptionTier);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'active',
    },
  });
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice.id);

  const subscription = invoice.subscription;
  if (!subscription) {
    return;
  }

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription },
  });

  if (!user) {
    console.error('User not found for subscription:', subscription);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'past_due',
    },
  });

  await prisma.subscriptionHistory.updateMany({
    where: {
      stripeSubscriptionId: subscription,
      status: 'active',
    },
    data: {
      status: 'past_due',
    },
  });

  console.log(`Payment failed for user ${user.email}`);
}
