import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

// Subscription plan configuration (3-tier pricing)
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Trial',
    credits: 10,
    price: 0,
    hasWatermark: true,
  },
  basic: {
    name: 'Basic',
    credits: 200,
    monthlyPrice: 20,
    yearlyPrice: 200,
    hasWatermark: false,
  },
  premium: {
    name: 'Premium',
    credits: 500,
    monthlyPrice: 34,
    yearlyPrice: 340,
    hasWatermark: false,
  },
  enterprise: {
    name: 'Enterprise',
    credits: -1, // unlimited
    monthlyPrice: 50,
    yearlyPrice: 500,
    hasWatermark: false,
  },
};
