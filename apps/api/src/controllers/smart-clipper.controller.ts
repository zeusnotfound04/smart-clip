import { Request, Response } from 'express';
import { aiQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  userId?: string;
}

export const analyzeVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoS3Key } = req.body;
    
    if (!videoS3Key || !req.userId) {
      return res.status(400).json({ error: 'Video S3 key is required' });
    }

    const project = await prisma.project.create({
      data: {
        userId: req.userId,
        name: `Video Analysis - ${new Date().toISOString()}`,
        type: 'smart-clipper',
        config: JSON.stringify({ videoS3Key }),
        status: 'queued'
      }
    });

    const job = await aiQueue.add('detect-highlights', {
      videoS3Key,
      projectId: project.id
    });

    res.json({
      message: 'Video analysis started',
      projectId: project.id,
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error detecting highlights:', error);
    res.status(500).json({ error: 'Failed to detect video highlights' });
  }
};