import { Request, Response } from 'express';
import { extractClipQueue } from '../workers/index';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Extract clip based on highlights and timestamps
 */
export async function extractClip(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl, startTime, endTime, highlightType } = req.body;
    const userId = req.userId;

    if (!videoUrl || !startTime || !endTime || !userId) {
      res.status(400).json({ 
        success: false,
        message: 'Missing required fields: videoUrl, startTime, endTime'
      });
      return;
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name: `Clip ${Date.now()}`,
        type: 'SMART_CLIPPER',
        status: 'pending',
        config: JSON.stringify({
          inputUrl: videoUrl,
          startTime,
          endTime,
          highlightType: highlightType || 'auto'
        })
      }
    });

    const job = await extractClipQueue.add('extract-clip', {
      projectId: project.id,
      videoUrl,
      startTime,
      endTime,
      highlightType,
      userId
    });

    res.json({ 
      success: true,
      message: 'Clip extraction started',
      jobId: job.id,
      projectId: project.id
    });

  } catch (error) {
    console.error('Extract clip error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to start clip extraction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get clips for a video
 */
export async function getClips(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoId } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const clips = await prisma.project.findMany({
      where: {
        userId,
        type: 'SMART_CLIPPER',
        videoId: videoId || undefined
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ 
      success: true,
      clips: clips.map((clip: any) => ({
        id: clip.id,
        status: clip.status,
        outputPath: clip.outputPath,
        config: clip.config,
        createdAt: clip.createdAt,
        progress: clip.progress
      }))
    });

  } catch (error) {
    console.error('Get clips error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get clips',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}