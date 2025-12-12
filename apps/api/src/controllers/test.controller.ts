import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { creditsService } from '../services/credits.service.js';
import { SUBSCRIPTION_PLANS } from '../config/stripe.js';

const prisma = new PrismaClient();

interface AuthRequest {
  userId?: string;
}

export const testController = {
  /**
   * TEMPORARY: Manually activate subscription for testing
   * This simulates what the webhook would do
   */
  async simulateCheckoutSuccess(req: AuthRequest & any, res: Response) {
    console.log('🧪 [TEST] Simulating successful checkout');
    
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { tier, billingPeriod } = req.body;

      if (!tier || !billingPeriod) {
        return res.status(400).json({
          success: false,
          message: 'Missing tier or billingPeriod',
        });
      }

      console.log('🧪 [TEST] User:', userId);
      console.log('🧪 [TEST] Tier:', tier);
      console.log('🧪 [TEST] Billing:', billingPeriod);

      const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
      if (!plan) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier',
        });
      }

      // Update user subscription
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + (billingPeriod === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
          trialUsed: true,
        },
      });

      console.log('🧪 [TEST] User subscription updated');

      // Add credits if not unlimited
      if (plan.credits > 0) {
        await creditsService.addCredits({
          userId,
          amount: plan.credits,
          type: 'subscription',
          description: `${plan.name} subscription - ${billingPeriod} billing (TEST)`,
        });
        console.log(`🧪 [TEST] Added ${plan.credits} credits`);
      }

      res.json({
        success: true,
        message: 'Subscription activated successfully (TEST MODE)',
        data: {
          tier,
          credits: plan.credits,
          billingPeriod,
        },
      });
    } catch (error: any) {
      console.error('❌ [TEST] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error simulating checkout',
        error: error.message,
      });
    }
  },
};
