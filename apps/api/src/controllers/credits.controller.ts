import { Request, Response } from 'express';
import { creditsService } from '../services/credits.service.js';

interface AuthRequest extends Request {
  userId?: string;
}

export const creditsController = {
  /**
   * Get user's credit balance and statistics
   */
  async getBalance(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const balance = await creditsService.getBalance(req.userId);
      const stats = await creditsService.getUsageStats(req.userId);

      res.json({
        success: true,
        data: {
          balance,
          stats,
        },
      });
    } catch (error: any) {
      console.error('Get balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching credit balance',
        error: error.message,
      });
    }
  },

  /**
   * Get credit transaction history
   */
  async getHistory(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await creditsService.getTransactionHistory(req.userId, {
        limit,
        offset,
      });

      res.json({
        success: true,
        data: {
          transactions,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transaction history',
        error: error.message,
      });
    }
  },

  /**
   * Calculate credits needed for a video duration
   */
  async calculateCredits(req: Request, res: Response) {
    try {
      const { durationInMinutes } = req.body;

      if (!durationInMinutes || durationInMinutes <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid duration in minutes is required',
        });
      }

      const credits = creditsService.calculateCreditsNeeded(durationInMinutes);

      res.json({
        success: true,
        data: {
          durationInMinutes,
          creditsRequired: credits,
          rate: '1 credit per minute',
        },
      });
    } catch (error: any) {
      console.error('Calculate credits error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating credits',
        error: error.message,
      });
    }
  },

  /**
   * Get usage statistics
   */
  async getStats(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const stats = await creditsService.getUsageStats(req.userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching statistics',
        error: error.message,
      });
    }
  },
};


