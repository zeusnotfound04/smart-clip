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

  async processVideoWithCredits(
    params: ProcessVideoWithCreditsParams,
    processingFn: () => Promise<string>
  ): Promise<{ success: boolean; outputPath: string; creditsUsed: number; newBalance: number }> {
    const { userId, videoDuration, projectId, projectType, inputPath, outputPath, description } = params;

    const creditsNeeded = creditsService.calculateCreditsNeeded(videoDuration);

    const hasCredits = await creditsService.hasEnoughCredits(userId, creditsNeeded);
    if (!hasCredits) {
      const balance = await creditsService.getBalance(userId);
      throw new Error(
        `Insufficient credits. Required: ${creditsNeeded}, Available: ${balance}`
      );
    }

    const deductResult = await creditsService.deductCredits({
      userId,
      amount: creditsNeeded,
      projectId,
      projectType,
      videoDuration,
      description,
    });

    try {
      const processedPath = await processingFn();

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

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
