import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Legacy Credits Service - Use CreditService from credit.service.ts for new code
 * This file is kept for backward compatibility
 */

interface DeductCreditsParams {
  userId: string;
  amount: number;
  projectId?: string;
  projectType?: string;
  videoDuration?: number;
  description: string;
}

interface AddCreditsParams {
  userId: string;
  amount: number;
  type: 'purchase' | 'subscription' | 'refund' | 'bonus';
  description: string;
  stripePaymentId?: string;
}

/**
 * @deprecated Use CreditService from credit.service.ts instead
 */
export const creditsService = {
  /**
   * Check if user has enough credits
   */
  async hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, subscriptionTier: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Premium tier has unlimited credits
    if (user.subscriptionTier === 'premium') {
      return true;
    }

    return user.credits >= requiredCredits;
  },

  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.credits;
  },

  /**
   * Deduct credits from user account
   */
  async deductCredits(params: DeductCreditsParams): Promise<{ success: boolean; newBalance: number }> {
    const { userId, amount, projectId, projectType, videoDuration, description } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, totalCreditsUsed: true, subscriptionTier: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Premium tier has unlimited credits - no deduction needed
    if (user.subscriptionTier === 'premium') {
      // Still log the transaction for analytics
      await prisma.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'usage',
          description,
          balanceBefore: user.credits,
          balanceAfter: user.credits, // No change
          projectId,
          projectType,
          videoDuration,
        },
      });

      return { success: true, newBalance: user.credits };
    }

    // Check if user has enough credits
    if (user.credits < amount) {
      throw new Error(`Insufficient credits. Required: ${amount}, Available: ${user.credits}`);
    }

    const newBalance = user.credits - amount;

    // Update user credits and create transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          credits: newBalance,
          totalCreditsUsed: user.totalCreditsUsed + amount,
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'usage',
          description,
          balanceBefore: user.credits,
          balanceAfter: newBalance,
          projectId,
          projectType,
          videoDuration,
        },
      }),
    ]);

    return { success: true, newBalance };
  },

  /**
   * Add credits to user account
   */
  async addCredits(params: AddCreditsParams): Promise<{ success: boolean; newBalance: number }> {
    const { userId, amount, type, description, stripePaymentId } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.credits + amount;

    // Update user credits and create transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          type,
          description,
          balanceBefore: user.credits,
          balanceAfter: newBalance,
          stripePaymentId,
        },
      }),
    ]);

    return { success: true, newBalance };
  },

  /**
   * Refund credits (when processing fails)
   */
  async refundCredits(params: {
    userId: string;
    amount: number;
    projectId?: string;
    reason: string;
  }): Promise<{ success: boolean; newBalance: number }> {
    return this.addCredits({
      userId: params.userId,
      amount: params.amount,
      type: 'refund',
      description: `Credit refund: ${params.reason}`,
    });
  },

  /**
   * Calculate credits needed based on video duration (in minutes)
   */
  calculateCreditsNeeded(durationInMinutes: number): number {
    // 1 credit = 1 minute of footage
    return Math.ceil(durationInMinutes);
  },

  /**
   * Get credit transaction history
   */
  async getTransactionHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<any[]> {
    const { limit = 50, offset = 0 } = options || {};

    return prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  /**
   * Get credit usage statistics
   */
  async getUsageStats(userId: string): Promise<{
    totalUsed: number;
    currentBalance: number;
    transactionCount: number;
    averagePerTransaction: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, totalCreditsUsed: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const transactions = await prisma.creditTransaction.count({
      where: { userId, type: 'usage' },
    });

    return {
      totalUsed: user.totalCreditsUsed,
      currentBalance: user.credits,
      transactionCount: transactions,
      averagePerTransaction: transactions > 0 ? user.totalCreditsUsed / transactions : 0,
    };
  },
};

// Re-export new CreditService for convenience
export { CreditService } from './credit.service';
