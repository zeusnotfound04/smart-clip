import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email?: string;
  };
}

export const subscriptionController = {
  /**
   * Get available subscription plans
   */
  async getPlans(req: Request, res: Response) {
    try {
      const plans = subscriptionService.getAvailablePlans();

      res.json({
        success: true,
        data: { plans },
      });
    } catch (error: any) {
      console.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching subscription plans',
        error: error.message,
      });
    }
  },

  /**
   * Create Stripe Checkout session
   */
  async createCheckoutSession(req: AuthRequest, res: Response) {
    console.log('💳 [CHECKOUT] Starting checkout session creation');
    console.log('💳 [CHECKOUT] Request body:', JSON.stringify(req.body));
    console.log('💳 [CHECKOUT] req.user:', req.user);
    console.log('💳 [CHECKOUT] req.userId:', (req as any).userId);
    
    try {
      // Check if we have userId from middleware
      const userId = (req as any).userId || req.user?.id;
      console.log('💳 [CHECKOUT] Resolved userId:', userId);
      
      if (!userId) {
        console.error('❌ [CHECKOUT] No user ID found in request');
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - No user ID',
        });
      }

      const { tier, billingPeriod } = req.body;

      if (!tier || !billingPeriod) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: tier, billingPeriod',
        });
      }

      if (!['basic', 'premium', 'enterprise'].includes(tier)) {
        console.error('❌ [CHECKOUT] Invalid tier:', tier);
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Must be: basic, premium, or enterprise',
        });
      }

      if (!['monthly', 'yearly'].includes(billingPeriod)) {
        console.error('❌ [CHECKOUT] Invalid billing period:', billingPeriod);
        return res.status(400).json({
          success: false,
          message: 'Invalid billing period. Must be: monthly or yearly',
        });
      }

      // Fetch user from database to get email
      console.log('💳 [CHECKOUT] Fetching user from database...');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });

      if (!user || !user.email) {
        console.error('❌ [CHECKOUT] User not found or missing email:', userId);
        return res.status(404).json({
          success: false,
          message: 'User not found or missing email',
        });
      }

      console.log('💳 [CHECKOUT] User found:', user.email);
      console.log('💳 [CHECKOUT] Creating Stripe checkout session...');

      const session = await subscriptionService.createCheckoutSession({
        userId: user.id,
        email: user.email,
        tier: tier as 'basic' | 'premium' | 'enterprise',
        billingPeriod,
      });

      console.log('✅ [CHECKOUT] Checkout session created:', session.id);
      console.log('✅ [CHECKOUT] Checkout URL:', session.url);

      res.json({
        success: true,
        data: { sessionId: session.id, url: session.url },
      });
    } catch (error: any) {
      console.error('Create checkout session error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating checkout session',
        error: error.message,
      });
    }
  },

  /**
   * Create a new subscription
   */
  async createSubscription(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { tier, billingPeriod, paymentMethodId } = req.body;

      if (!tier || !billingPeriod || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: tier, billingPeriod, paymentMethodId',
        });
      }

      if (!['basic', 'pro', 'premium'].includes(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Must be: basic, pro, or premium',
        });
      }

      if (!['monthly', 'yearly'].includes(billingPeriod)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid billing period. Must be: monthly or yearly',
        });
      }

      const result = await subscriptionService.createSubscription({
        userId: req.user.id,
        tier,
        billingPeriod,
        paymentMethodId,
      });

      res.json({
        success: true,
        message: 'Subscription created successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating subscription',
        error: error.message,
      });
    }
  },

  /**
   * Get subscription details
   */
  async getSubscription(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const details = await subscriptionService.getSubscriptionDetails(req.user.id);

      res.json({
        success: true,
        data: details,
      });
    } catch (error: any) {
      console.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching subscription details',
        error: error.message,
      });
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { cancelAtPeriodEnd = true } = req.body;

      const subscription = await subscriptionService.cancelSubscription(
        req.user.id,
        cancelAtPeriodEnd
      );

      res.json({
        success: true,
        message: cancelAtPeriodEnd
          ? 'Subscription will be canceled at the end of billing period'
          : 'Subscription canceled immediately',
        data: subscription,
      });
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Error canceling subscription',
        error: error.message,
      });
    }
  },

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const subscription = await subscriptionService.resumeSubscription(req.user.id);

      res.json({
        success: true,
        message: 'Subscription resumed successfully',
        data: subscription,
      });
    } catch (error: any) {
      console.error('Resume subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Error resuming subscription',
        error: error.message,
      });
    }
  },

  /**
   * Update subscription tier
   */
  async updateSubscription(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { tier } = req.body;

      if (!tier || !['basic', 'pro', 'premium'].includes(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Must be: basic, pro, or premium',
        });
      }

      const subscription = await subscriptionService.updateSubscription(req.user.id, tier);

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: subscription,
      });
    } catch (error: any) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating subscription',
        error: error.message,
      });
    }
  },
};
