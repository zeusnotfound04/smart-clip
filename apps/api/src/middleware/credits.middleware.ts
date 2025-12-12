import { Request, Response, NextFunction } from 'express';
import { creditsService } from '../services/credits.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Middleware to check if user has enough credits for the operation
 */
export const checkCredits = (getRequiredCredits: (req: AuthRequest) => number | Promise<number>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const requiredCredits = typeof getRequiredCredits === 'function' 
        ? await getRequiredCredits(req)
        : getRequiredCredits;

      const hasCredits = await creditsService.hasEnoughCredits(req.user.id, requiredCredits);

      if (!hasCredits) {
        const balance = await creditsService.getBalance(req.user.id);
        return res.status(402).json({
          success: false,
          message: 'Insufficient credits',
          error: {
            required: requiredCredits,
            available: balance,
            shortfall: requiredCredits - balance,
          },
        });
      }

      next();
    } catch (error: any) {
      console.error('Credits middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking credits',
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to deduct credits after successful operation
 */
export const deductCredits = (
  getAmount: (req: AuthRequest) => number | Promise<number>,
  getDescription: (req: AuthRequest) => string
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const amount = typeof getAmount === 'function' ? await getAmount(req) : getAmount;
      const description = typeof getDescription === 'function' ? getDescription(req) : getDescription;

      const result = await creditsService.deductCredits({
        userId: req.user.id,
        amount,
        description,
        projectType: req.body.projectType || req.path.split('/')[1],
      });

      // Attach credit info to response
      res.locals.creditInfo = {
        deducted: amount,
        newBalance: result.newBalance,
      };

      next();
    } catch (error: any) {
      console.error('Credit deduction error:', error);
      res.status(402).json({
        success: false,
        message: 'Credit deduction failed',
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to add credit info to response
 */
export const addCreditInfoToResponse = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    if (res.locals.creditInfo) {
      data = {
        ...data,
        credits: res.locals.creditInfo,
      };
    }
    return originalJson(data);
  };

  next();
};
