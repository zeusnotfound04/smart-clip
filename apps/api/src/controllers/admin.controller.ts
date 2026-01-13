import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search && typeof search === 'string') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          credits: true,
          totalCreditsUsed: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          isAdmin: true,
          _count: {
            select: {
              projects: true,
              videos: true,
              scriptProjects: true
            }
          }
        },
        orderBy: {
          id: 'desc'
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get user by email (admin only)
 */
export const getUserByEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        totalCreditsUsed: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isAdmin: true,
        _count: {
          select: {
            projects: true,
            videos: true,
            scriptProjects: true,
            creditTransactions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Top up credits for a user by email (admin only)
 */
export const topUpCredits = async (req: AuthRequest, res: Response) => {
  try {
    const { email, credits, reason } = req.body;

    if (!email || credits === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Email and credits are required'
      });
    }

    if (typeof credits !== 'number' || credits <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Credits must be a positive number'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: `No user found with email: ${email}`
      });
    }

    const [updatedUser, transaction] = await Promise.all([
      prisma.user.update({
        where: { email },
        data: {
          credits: {
            increment: credits
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          totalCreditsUsed: true
        }
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: credits,
          type: 'admin_topup',
          description: reason || `Admin top-up: ${credits} credits`,
          balanceBefore: user.credits,
          balanceAfter: user.credits + credits
        }
      })
    ]);

    console.log(`Admin ${req.userId} added ${credits} credits to ${email}`);

    res.json({
      success: true,
      message: `Successfully added ${credits} credits to ${email}`,
      user: updatedUser,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Top up credits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to top up credits',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update user admin status (admin only)
 */
export const updateAdminStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { email, isAdmin } = req.body;

    if (!email || typeof isAdmin !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Email and isAdmin (boolean) are required'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { isAdmin },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true
      }
    });

    res.json({
      success: true,
      message: `User ${email} admin status updated to ${isAdmin}`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update admin status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get admin dashboard stats
 */
export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalCreditsDistributed,
      totalCreditsUsed,
      activeSubscriptions,
      recentTransactions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.aggregate({
        _sum: { credits: true }
      }),
      prisma.user.aggregate({
        _sum: { totalCreditsUsed: true }
      }),
      prisma.user.count({
        where: {
          subscriptionStatus: 'active'
        }
      }),
      prisma.creditTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCreditsDistributed: totalCreditsDistributed._sum.credits || 0,
        totalCreditsUsed: totalCreditsUsed._sum.totalCreditsUsed || 0,
        activeSubscriptions,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Check if current user is admin
 */
export const checkAdminStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.json({
        success: true,
        isAdmin: false
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    });

    res.json({
      success: true,
      isAdmin: user?.isAdmin || false
    });
  } catch (error) {
    console.error('Check admin status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check admin status'
    });
  }
};
