import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../lib/auth';
import passport from '../config/passport';
import { EmailService } from '../services/email.service';

const router: Router = Router();

const requestOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { email, name } = requestOTPSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const otp = EmailService.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.deleteMany({
      where: { email }
    });

    await prisma.emailVerification.create({
      data: {
        email,
        otp,
        expiresAt,
      }
    });

    await EmailService.sendOTPEmail({ to: email, otp, name });

    res.status(200).json({ 
      message: 'Verification code sent to your email',
      expiresIn: 600 // seconds
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Request OTP error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code';
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = verifyOTPSchema.parse(req.body);

    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        otp,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true }
    });

    res.status(200).json({ 
      message: 'Email verified successfully',
      verified: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, otp } = signUpSchema.parse(req.body);

    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        otp,
        verified: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!verification) {
      return res.status(400).json({ error: 'Email not verified. Please verify your email first.' });
    }

    if (verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });

    await prisma.emailVerification.deleteMany({
      where: { email }
    });

    try {
      await EmailService.sendWelcomeEmail({ to: email, name });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        credits: user.credits,
        emailVerified: user.emailVerified,
      },
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = signInSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        credits: user.credits,
      },
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        credits: user.credits,
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  accessType: 'offline',
  prompt: 'consent'
}));

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/signin?error=oauth_failed`,
    session: false 
  }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/signin?error=no_user`);
      }

      const token = generateToken({ userId: user.id, email: user.email });
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/signin?error=token_generation_failed`);
    }
  }
);

export default router;