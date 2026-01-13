import { PrismaClient } from '@prisma/client';
import { stripe, SUBSCRIPTION_PLANS } from '../config/stripe.js';
import { creditsService } from './credits.service.js';

const prisma = new PrismaClient();

interface CreateSubscriptionParams {
  userId: string;
  tier: 'basic' | 'premium' | 'enterprise';
  billingPeriod: 'monthly';
  paymentMethodId: string;
}

export const subscriptionService = {
  /**
   * Create Stripe Checkout session (monthly billing only)
   */
  async createCheckoutSession(params: {
    userId: string;
    email: string;
    tier: 'basic' | 'premium' | 'enterprise';
    billingPeriod?: 'monthly'; // Optional, defaults to monthly
  }) {
    console.log('[SERVICE] createCheckoutSession called with params:', JSON.stringify(params, null, 2));
    const { userId, email, tier } = params;

    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) {
      console.error('[SERVICE] Invalid subscription tier:', tier);
      throw new Error('Invalid subscription tier');
    }

    console.log('[SERVICE] Plan found:', plan.name);

    const price = plan.monthlyPrice;
    if (!price || price === 0) {
      console.error('[SERVICE] Price not available or invalid');
      throw new Error('This plan is not available for purchase');
    }

    console.log('[SERVICE] Price:', price, 'USD');
    console.log('[SERVICE] Creating Stripe checkout session...');

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: userId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan`,
              description: `${plan.credits > 0 ? plan.credits + ' credits' : 'Custom credits'} per month (1 credit = 1 minute of footage)`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/credits?success=true&tier=${tier}&billing=monthly&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/credits?canceled=true`,
      metadata: {
        userId,
        tier,
        billingPeriod: 'monthly',
        credits: plan.credits.toString(),
      },
    });

    console.log('[SERVICE] Stripe session created successfully');
    console.log('[SERVICE] Session ID:', session.id);
    console.log('[SERVICE] Session URL:', session.url);

    return session;
  },

  /**
   * Create a new subscription for a user (monthly billing only)
   */
  async createSubscription(params: CreateSubscriptionParams) {
    const { userId, tier, paymentMethodId } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true, subscriptionTier: true },
    });

    if (!user || !user.email) {
      throw new Error('User not found or email missing');
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    } else {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) {
      throw new Error('Invalid subscription tier');
    }

    const price = plan.monthlyPrice;
    if (!price || price === 0) {
      throw new Error('This plan is not available for purchase');
    }

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: `${plan.name} - Monthly`,
        metadata: {
          tier,
          credits: plan.credits.toString(),
        },
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePrice.id }],
      expand: ['latest_invoice.payment_intent'],
    });

    const now = new Date();
    const periodEnd = new Date((subscription as any).current_period_end * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        subscriptionStartDate: now,
        subscriptionEndDate: periodEnd,
        credits: { increment: plan.credits > 0 ? plan.credits : 0 },
      },
    });

    await prisma.subscriptionHistory.create({
      data: {
        userId,
        tier,
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        stripePriceId: stripePrice.id,
        stripeCustomerId: customerId,
        creditsPerMonth: plan.credits,
        price,
        currency: 'usd',
        billingPeriod: 'monthly',
        startDate: now,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: periodEnd,
      },
    });

    if (plan.credits > 0) {
      await creditsService.addCredits({
        userId,
        amount: plan.credits,
        type: 'subscription',
        description: `${plan.name} subscription - monthly billing`,
        stripePaymentId: subscription.id,
      });
    }

    return { subscription, customerId };
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true },
    });

    if (!user?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    await prisma.subscriptionHistory.updateMany({
      where: {
        userId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        status: 'active',
      },
      data: {
        cancelAtPeriodEnd,
        canceledAt: cancelAtPeriodEnd ? new Date() : null,
      },
    });

    if (!cancelAtPeriodEnd) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'canceled',
          subscriptionTier: 'free',
        },
      });
    }

    return subscription;
  },

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true },
    });

    if (!user?.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await prisma.subscriptionHistory.updateMany({
      where: {
        userId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        status: { in: ['active', 'canceled'] },
      },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });

    return subscription;
  },

  /**
   * Update subscription tier
   */
  async updateSubscription(userId: string, newTier: 'basic' | 'pro' | 'premium') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    });

    if (!user?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const plan = SUBSCRIPTION_PLANS[newTier as keyof typeof SUBSCRIPTION_PLANS];
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    const planPrice = 'monthlyPrice' in plan ? plan.monthlyPrice : plan.price;

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(planPrice * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name: plan.name,
        metadata: {
          tier: newTier,
          credits: plan.credits.toString(),
        },
      },
    });

    const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: stripePrice.id,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: newTier },
    });

    return updatedSubscription;
  },

  /**
   * Renew subscription credits (called by webhook on billing cycle)
   */
  async renewSubscriptionCredits(userId: string, tier: string) {
    const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan || plan.credits <= 0) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: plan.credits } },
    });

    await creditsService.addCredits({
      userId,
      amount: plan.credits,
      type: 'subscription',
      description: `Monthly credit renewal - ${plan.name}`,
    });
  },

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let stripeSubscription = null;
    if (user.stripeSubscriptionId) {
      stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    }

    const history = await prisma.subscriptionHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...user,
      stripeSubscription,
      history,
    };
  },

  /**
   * Get available subscription plans
   */
  getAvailablePlans() {
    return Object.entries(SUBSCRIPTION_PLANS)
      .filter(([key]) => key !== 'free')
      .map(([key, plan]) => ({
        tier: key,
        ...plan,
      }));
  },
};
