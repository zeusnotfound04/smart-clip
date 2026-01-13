import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  status?: number;
  code?: string;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Invalid input data';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    status = 400;
    message = 'Database operation failed';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = 'File upload error';
  }

  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Something went wrong';
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && {
        stack: err.stack,
        details: err
      })
    }
  });
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      status: 404,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

/**
 * Rate limiting middleware (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    for (const [key, data] of requestCounts.entries()) {
      if (now > data.resetTime) {
        requestCounts.delete(key);
      }
    }
    
    const requestData = requestCounts.get(ip);
    if (!requestData) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (requestData.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests',
          status: 429,
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
        }
      });
      return;
    }
    
    requestData.count++;
    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.url.includes('/auth') || req.url.includes('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  
  next();
};