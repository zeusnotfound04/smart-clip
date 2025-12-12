import { creditsService } from '../services/credits.service.js';
import { watermarkService } from '../services/watermark.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProcessVideoWithCreditsParams {
  userId: string;
  videoDuration: number; // in minutes
  projectId?: string;
  projectType: string;
  inputPath: string;
  outputPath: string;
  description: string;
}

export const creditProcessingHelper = {
  /**
   * Process video with credit deduction and conditional watermark
   */
  async processVideoWithCredits(
    params: ProcessVideoWithCreditsParams,
    processingFn: () => Promise<string>
  ): Promise<{ success: boolean; outputPath: string; creditsUsed: number; newBalance: number }> {
    const { userId, videoDuration, projectId, projectType, inputPath, outputPath, description } = params;

    // Calculate credits needed
    const creditsNeeded = creditsService.calculateCreditsNeeded(videoDuration);

    // Check if user has enough credits
    const hasCredits = await creditsService.hasEnoughCredits(userId, creditsNeeded);
    if (!hasCredits) {
      const balance = await creditsService.getBalance(userId);
      throw new Error(
        `Insufficient credits. Required: ${creditsNeeded}, Available: ${balance}`
      );
    }

    // Deduct credits before processing
    const deductResult = await creditsService.deductCredits({
      userId,
      amount: creditsNeeded,
      projectId,
      projectType,
      videoDuration,
      description,
    });

    try {
      // Process the video
      const processedPath = await processingFn();

      // Get user's subscription tier to determine if watermark is needed
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Apply watermark if user is on free tier
      const finalPath = await watermarkService.processVideoWithConditionalWatermark(
        processedPath,
        outputPath,
        user.subscriptionTier
      );

      return {
        success: true,
        outputPath: finalPath,
        creditsUsed: creditsNeeded,
        newBalance: deductResult.newBalance,
      };
    } catch (error: any) {
      // Refund credits if processing failed
      await creditsService.refundCredits({
        userId,
        amount: creditsNeeded,
        projectId,
        reason: `Processing failed: ${error.message}`,
      });

      throw error;
    }
  },

  /**
   * Check credits before starting a job
   */
  async checkCreditsBeforeJob(
    userId: string,
    videoDuration: number
  ): Promise<{ hasCredits: boolean; creditsNeeded: number; currentBalance: number }> {
    const creditsNeeded = creditsService.calculateCreditsNeeded(videoDuration);
    const currentBalance = await creditsService.getBalance(userId);
    const hasCredits = await creditsService.hasEnoughCredits(userId, creditsNeeded);

    return {
      hasCredits,
      creditsNeeded,
      currentBalance,
    };
  },

  /**
   * Get user's subscription tier and watermark status
   */
  async getUserWatermarkStatus(userId: string): Promise<{
    subscriptionTier: string;
    needsWatermark: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      subscriptionTier: user.subscriptionTier,
      needsWatermark: watermarkService.shouldApplyWatermark(user.subscriptionTier),
    };
  },
};
