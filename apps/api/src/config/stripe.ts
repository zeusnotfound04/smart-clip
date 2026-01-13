import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    credits: 10,
    price: 0,
    hasWatermark: true,
  },
  basic: {
    name: 'Basic',
    credits: 300,
    monthlyPrice: 30,
    hasWatermark: false,
  },
  premium: {
    name: 'Executive Premium',
    credits: 500,
    monthlyPrice: 40,
    hasWatermark: false,
  },
  enterprise: {
    name: 'Enterprise',
    credits: -1, // contact us for custom pricing
    monthlyPrice: 0, // contact sales
    hasWatermark: false,
  },
};
