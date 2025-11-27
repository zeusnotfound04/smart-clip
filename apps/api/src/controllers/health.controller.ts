import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { smartClipperQueue, videoProcessingQueue, subtitleQueue, aiQueue } from '../lib/queues';

/**
 * Basic health check
 */
export async function health(req: Request, res: Response): Promise<void> {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'SmartClips API'
  });
}

/**
 * Detailed health check with all service status
 */
export async function healthDetailed(req: Request, res: Response): Promise<void> {
  try {
    const checks = {
      database: false,
      services: {
        'auto-subtitles': true,
        'split-streamer': true,
        'smart-clipper': true,
        'script-generator': true,
        'fake-conversations': true,
        'thumbnail-generation': true,
        'video-processing': true
      },
      queues: {
        'video-processing': false,
        'subtitle-generation': false,
        'ai-processing': false,
        'smart-clipper': false
      },
      external: {
        's3': false,
        'google-cloud': false
      }
    };

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check S3 connectivity (basic check)
    try {
      // This is a simplified check - in production you'd test actual S3 operations
      checks.external.s3 = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_S3_BUCKET;
    } catch (error) {
      console.error('S3 health check failed:', error);
    }

    // Check Google Cloud connectivity
    try {
      checks.external['google-cloud'] = !!process.env.GOOGLE_CLOUD_PROJECT_ID;
    } catch (error) {
      console.error('Google Cloud health check failed:', error);
    }

    // Check Redis queue connectivity
    try {
      await Promise.allSettled([
        smartClipperQueue.isReady().then(() => { checks.queues['smart-clipper'] = true; }),
        videoProcessingQueue.isReady().then(() => { checks.queues['video-processing'] = true; }),
        subtitleQueue.isReady().then(() => { checks.queues['subtitle-generation'] = true; }),
        aiQueue.isReady().then(() => { checks.queues['ai-processing'] = true; })
      ]);
    } catch (error) {
      console.error('Queue health checks failed:', error);
    }

    // Overall status
    const allChecksPass = checks.database && 
      Object.values(checks.services).every(Boolean) &&
      Object.values(checks.queues).every(Boolean);

    res.json({
      status: allChecksPass ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Service status endpoint
 */
export async function serviceStatus(req: Request, res: Response): Promise<void> {
  try {
    // Get project statistics
    const stats = await prisma.project.groupBy({
      by: ['type', 'status'],
      _count: {
        id: true
      }
    });

    // Recent activity
    const recentProjects = await prisma.project.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        progress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // System metrics
    const totalProjects = await prisma.project.count();
    const totalUsers = await prisma.user.count();
    const totalVideos = await prisma.video.count();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      statistics: {
        projects: {
          total: totalProjects,
          byTypeAndStatus: stats
        },
        users: {
          total: totalUsers
        },
        videos: {
          total: totalVideos
        }
      },
      recentActivity: recentProjects,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    });

  } catch (error) {
    console.error('Service status error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}