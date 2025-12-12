import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('🔐 [AUTH MIDDLEWARE] Starting authentication check');
  console.log('🔐 [AUTH MIDDLEWARE] Request URL:', req.url);
  console.log('🔐 [AUTH MIDDLEWARE] Request Method:', req.method);
  
  const authHeader = req.headers['authorization'];
  console.log('🔐 [AUTH MIDDLEWARE] Auth Header:', authHeader ? `Present (${authHeader.substring(0, 20)}...)` : 'Missing');
  
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('❌ [AUTH MIDDLEWARE] No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('🔐 [AUTH MIDDLEWARE] Verifying token...');
    const decoded = verifyToken(token);
    console.log('✅ [AUTH MIDDLEWARE] Token verified successfully');
    console.log('🔐 [AUTH MIDDLEWARE] Decoded user ID:', decoded.userId);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('❌ [AUTH MIDDLEWARE] Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};