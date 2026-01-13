import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { uploadFile } from '../lib/s3';
import { randomUUID } from 'crypto';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        credits: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        totalCreditsUsed: true,
        _count: {
          select: {
            videos: true,
            projects: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('[GET_PROFILE] Error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, email } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    });

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('[UPDATE_PROFILE] Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[PROFILE_PICTURE] Uploading for user:', userId);
    console.log('File details:', {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.' 
      });
    }

    const fileExtension = file.originalname.split('.').pop();
    const s3Key = `profile-pictures/${userId}/${randomUUID()}.${fileExtension}`;

    console.log('[PROFILE_PICTURE] Uploading to S3:', s3Key);
    await uploadFile(s3Key, file.buffer, file.mimetype);

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log('[PROFILE_PICTURE] Upload successful:', imageUrl);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    });

    res.json({
      success: true,
      imageUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error('[UPLOAD_PROFILE_PICTURE] Error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const [user, videoCount, projectCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          credits: true,
          totalCreditsUsed: true,
          subscriptionTier: true,
        }
      }),
      prisma.video.count({ where: { userId } }),
      prisma.project.count({ where: { userId } }),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      stats: {
        videosProcessed: videoCount,
        projectsCreated: projectCount,
        creditsAvailable: user.credits,
        creditsUsed: user.totalCreditsUsed,
        subscriptionTier: user.subscriptionTier,
      }
    });
  } catch (error) {
    console.error('[GET_USER_STATS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
};

export const requestEmailChange = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ error: 'New email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailVerification.create({
      data: {
        email: newEmail,
        otp,
        expiresAt,
        verified: false,
      }
    });

    await EmailService.sendOTPEmail({
      to: newEmail,
      otp,
      name: user?.name || 'User'
    });

    console.log(`[EMAIL_CHANGE] OTP sent to ${newEmail} for user ${userId}`);

    res.json({
      success: true,
      message: 'Verification code sent to new email'
    });
  } catch (error) {
    console.error('[REQUEST_EMAIL_CHANGE] Error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

export const verifyEmailChange = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const otpRecord = await prisma.emailVerification.findFirst({
      where: {
        email: newEmail,
        otp,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    });

    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const [updatedUser] = await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      }),
      prisma.emailVerification.update({
        where: { id: otpRecord.id },
        data: { verified: true }
      })
    ]);

    console.log(`[EMAIL_CHANGE] Email updated to ${newEmail} for user ${userId}`);

    res.json({
      success: true,
      message: 'Email updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('[VERIFY_EMAIL_CHANGE] Error:', error);
    res.status(500).json({ error: 'Failed to verify and change email' });
  }
};
