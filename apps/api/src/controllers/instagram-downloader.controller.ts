import { Request, Response, NextFunction } from 'express';
import { instagramDownloader } from '../services/instagram-downloader.service';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Get Instagram video download URL
 */
export async function getInstagramDownloadUrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Instagram URL is required',
      });
    }

    console.log(`[Instagram API] Request from user ${req.userId}: ${url}`);

    const result = await instagramDownloader.getDownloadUrl(url);

    res.json({
      success: true,
      data: {
        downloadUrl: result.downloadUrl,
        thumbnail: result.thumbnail,
        duration: result.duration,
        cached: result.cached,
        expiresIn: '1-2 hours (temporary CDN URL)',
      },
      message: result.cached 
        ? 'Retrieved from cache' 
        : 'Fetched from Instagram (cached for 2 hours)',
    });

  } catch (error: any) {
    console.error('[Instagram API] Error:', error.message);

    // Handle specific error types
    if (error.message?.includes('Invalid Instagram URL')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Instagram URL. Please provide a valid Instagram reel, post, or story URL.',
      });
    }

    if (error.message?.includes('Circuit breaker is OPEN')) {
      return res.status(503).json({
        success: false,
        error: 'Instagram download service is temporarily unavailable. Please try again in a few minutes.',
        retryAfter: 300, // 5 minutes
      });
    }

    if (error.message?.includes('Failed to download Instagram video')) {
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch video from Instagram. The video might be private or unavailable.',
      });
    }

    // Generic error
    next(error);
  }
}

/**
 * Get service statistics
 */
export async function getInstagramDownloaderStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = instagramDownloader.getStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = instagramDownloader.getStats();
    
    res.json({
      success: true,
      status: stats.circuitBreakerOpen ? 'degraded' : 'healthy',
      data: {
        service: 'Instagram Downloader',
        version: '1.0.0',
        features: [
          'Proxy rotation (10 proxies)',
          'Redis caching (2 hours)',
          'Rate limiting (1 req/sec per proxy)',
          'Circuit breaker protection',
          'Automatic retry with different IPs',
        ],
        stats,
      },
    });

  } catch (error) {
    next(error);
  }
}
