import { Router, Request, Response } from 'express';
import { CreditService } from '../services/credit.service';

const router: Router = Router();

/**
 * GET /api/credits/balance
 * Get user's credit balance and stats
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - userId added by auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const creditInfo = await CreditService.getUserCreditInfo(userId);
    
    res.json({
      success: true,
      credits: creditInfo.currentCredits,
      totalUsed: creditInfo.totalUsed,
      tier: creditInfo.tier,
      status: creditInfo.status,
      recentTransactions: creditInfo.recentTransactions,
    });
  } catch (error: any) {
    console.error('Error fetching credit balance:', error);
    res.status(500).json({
      error: 'Failed to fetch credit balance',
      message: error.message,
    });
  }
});

/**
 * POST /api/credits/calculate
 * Calculate credits required for a video duration
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { videoDuration } = req.body;

    if (!videoDuration || typeof videoDuration !== 'number') {
      return res.status(400).json({
        error: 'Video duration in seconds is required',
      });
    }

    const creditsRequired = CreditService.calculateCreditsRequired(videoDuration);

    res.json({
      success: true,
      videoDuration,
      creditsRequired,
      costBreakdown: {
        seconds: videoDuration,
        creditsPerMinute: 1,
        totalCredits: creditsRequired,
      },
    });
  } catch (error: any) {
    console.error('Error calculating credits:', error);
    res.status(500).json({
      error: 'Failed to calculate credits',
      message: error.message,
    });
  }
});

/**
 * POST /api/credits/validate
 * Validate if user has enough credits for a video
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const { videoDuration, featureName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!videoDuration || typeof videoDuration !== 'number') {
      return res.status(400).json({
        error: 'Video duration in seconds is required',
      });
    }

    const validation = await CreditService.validateAndPrepareProcessing(
      userId,
      videoDuration,
      featureName || 'Video Processing'
    );

    res.json({
      success: true,
      canProcess: validation.canProcess,
      creditsRequired: validation.creditsRequired,
      currentCredits: validation.currentCredits,
      shouldWatermark: validation.shouldWatermark,
      message: validation.message,
    });
  } catch (error: any) {
    console.error('Error validating credits:', error);
    res.status(500).json({
      error: 'Failed to validate credits',
      message: error.message,
    });
  }
});

/**
 * GET /api/credits/transactions
 * Get user's credit transaction history
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prisma } = await import('../lib/prisma');
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      transactions,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      message: error.message,
    });
  }
});

export default router;
