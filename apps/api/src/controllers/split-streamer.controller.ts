import { Request, Response } from 'express';
import { videoProcessingQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  userId?: string;
}

export const combine = async (req: AuthRequest, res: Response) => {
  try {
    const { webcamS3Key, gameplayS3Key } = req.body;
    
    if (!webcamS3Key || !gameplayS3Key || !req.userId) {
      return res.status(400).json({ error: 'Both webcam and gameplay video keys are required' });
    }

    const project = await prisma.project.create({
      data: {
        userId: req.userId,
        name: `Split Screen - ${new Date().toISOString()}`,
        type: 'split-streamer',
        config: JSON.stringify({ webcamS3Key, gameplayS3Key }),
        status: 'queued'
      }
    });

    const job = await videoProcessingQueue.add('combine-videos', {
      webcamS3Key,
      gameplayS3Key,
      projectId: project.id
    });

    res.json({
      message: 'Video combination started',
      projectId: project.id,
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error combining videos:', error);
    res.status(500).json({ error: 'Failed to combine videos' });
  }
};