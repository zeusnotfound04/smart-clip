import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Credit System Service
 * 1 credit = 60 seconds of video processing
 * Free tier: 10 credits with watermark
 * Paid tiers: No watermark, need to purchase credits
 */
export class CreditService {
  private static readonly SECONDS_PER_CREDIT = 60;

  /**
   * Calculate credits required for a video duration
   * @param durationInSeconds Video duration in seconds
   * @returns Number of credits required (rounded up)
   */
  static calculateCreditsRequired(durationInSeconds: number): number {
    if (durationInSeconds <= 0) return 0;
    return Math.ceil(durationInSeconds / this.SECONDS_PER_CREDIT);
  }

  /**
   * Check if user has enough credits
   * @param userId User ID
   * @param requiredCredits Number of credits needed
   * @returns Object with hasCredits boolean and current balance
   */
  static async checkUserCredits(
    userId: string,
    requiredCredits: number
  ): Promise<{ hasCredits: boolean; currentCredits: number; requiredCredits: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, subscriptionTier: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const hasCredits = user.credits >= requiredCredits;

    console.log(`[CREDITS] User ${userId} check:`, {
      currentCredits: user.credits,
      requiredCredits,
      hasCredits,
      tier: user.subscriptionTier,
    });

    return {
      hasCredits,
      currentCredits: user.credits,
      requiredCredits,
    };
  }

  /**
   * Deduct credits from user account
   * @param userId User ID
   * @param creditsToDeduct Number of credits to deduct
   * @param description Transaction description
   * @param metadata Additional metadata (can include videoId, feature, etc.)
   * @returns Updated user with new credit balance
   */
  static async deductCredits(
    userId: string,
    creditsToDeduct: number,
    description: string,
    metadata?: Record<string, any>
  ) {
    console.log(`[CREDITS] Deducting ${creditsToDeduct} credits from user ${userId}`);

    const check = await this.checkUserCredits(userId, creditsToDeduct);
    if (!check.hasCredits) {
      throw new Error(
        `Insufficient credits. You have ${check.currentCredits} credits but need ${creditsToDeduct} credits. Please upgrade your plan.`
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      const balanceBefore = currentUser?.credits || 0;

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: creditsToDeduct,
          },
          totalCreditsUsed: {
            increment: creditsToDeduct,
          },
        },
        select: {
          id: true,
          credits: true,
          totalCreditsUsed: true,
          subscriptionTier: true,
        },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          amount: -creditsToDeduct,
          type: 'usage',
          description,
          balanceBefore,
          balanceAfter: updatedUser.credits,
          metadata: metadata as any,
        },
      });

      return { user: updatedUser, transaction };
    });

    console.log(`[CREDITS] Deducted ${creditsToDeduct} credits. New balance: ${result.user.credits}`);
    return result;
  }

  /**
   * Add credits to user account (for purchases or refunds)
   * @param userId User ID
   * @param creditsToAdd Number of credits to add
   * @param type Transaction type (purchase, refund, bonus, etc.)
   * @param description Transaction description
   * @param metadata Additional metadata
   */
  static async addCredits(
    userId: string,
    creditsToAdd: number,
    type: 'purchase' | 'refund' | 'bonus' | 'subscription',
    description: string,
    metadata?: Record<string, any>
  ) {
    console.log(`[CREDITS] Adding ${creditsToAdd} credits to user ${userId} (${type})`);

    const result = await prisma.$transaction(async (tx: any) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      const balanceBefore = currentUser?.credits || 0;

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: creditsToAdd,
          },
        },
        select: {
          id: true,
          credits: true,
          totalCreditsUsed: true,
          subscriptionTier: true,
        },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          amount: creditsToAdd,
          type,
          description,
          balanceBefore,
          balanceAfter: updatedUser.credits,
          metadata: metadata as any,
        },
      });

      return { user: updatedUser, transaction };
    });

    console.log(`[CREDITS] Added ${creditsToAdd} credits. New balance: ${result.user.credits}`);
    return result;
  }

  /**
   * Get user's credit balance and usage stats
   * @param userId User ID
   */
  static async getUserCreditInfo(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        totalCreditsUsed: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const recentTransactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      currentCredits: user.credits,
      totalUsed: user.totalCreditsUsed,
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      recentTransactions,
    };
  }

  /**
   * Check if user should have watermark based on subscription tier
   * @param userId User ID
   * @returns true if watermark should be applied (free tier)
   */
  static async shouldApplyWatermark(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const shouldWatermark = user.subscriptionTier === 'free' || user.subscriptionTier === 'trial';
    
    console.log(`[WATERMARK] User ${userId} tier: ${user.subscriptionTier}, watermark: ${shouldWatermark}`);
    
    return shouldWatermark;
  }

  /**
   * Validate and prepare for video processing
   * Checks credits and returns processing info
   * @param userId User ID
   * @param videoDuration Video duration in seconds
   * @param featureName Feature being used
   */
  static async validateAndPrepareProcessing(
    userId: string,
    videoDuration: number,
    featureName: string
  ): Promise<{
    canProcess: boolean;
    creditsRequired: number;
    currentCredits: number;
    shouldWatermark: boolean;
    message?: string;
  }> {
    const creditsRequired = this.calculateCreditsRequired(videoDuration);
    const creditCheck = await this.checkUserCredits(userId, creditsRequired);
    const shouldWatermark = await this.shouldApplyWatermark(userId);

    if (!creditCheck.hasCredits) {
      return {
        canProcess: false,
        creditsRequired,
        currentCredits: creditCheck.currentCredits,
        shouldWatermark,
        message: `Insufficient credits. You need ${creditsRequired} credits but have ${creditCheck.currentCredits}. Please upgrade your plan or purchase more credits.`,
      };
    }

    console.log(`[CREDITS] User can process ${videoDuration}s video for ${featureName}`);
    console.log(`   Credits required: ${creditsRequired}, Available: ${creditCheck.currentCredits}`);
    console.log(`   Watermark: ${shouldWatermark ? 'Yes (Free tier)' : 'No (Paid tier)'}`);

    return {
      canProcess: true,
      creditsRequired,
      currentCredits: creditCheck.currentCredits,
      shouldWatermark,
    };
  }
}
