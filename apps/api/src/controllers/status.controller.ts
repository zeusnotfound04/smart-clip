import { Request, Response } from 'express';
import { videoProcessingQueue, subtitleQueue, aiQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  userId?: string;
}

export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { jobId, type } = req.params;
    
    let queue;
    switch (type) {
      case 'video':
        queue = videoProcessingQueue;
        break;
      case 'subtitle':
        queue = subtitleQueue;
        break;
      case 'ai':
        queue = aiQueue;
        break;
      default:
        return res.status(400).json({ error: 'Invalid queue type' });
    }

    const job = await queue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.json({
      id: job.id,
      status: state,
      progress,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason
    });
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
};

export const getProjectStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId },
      include: {
        video: true
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project status error:', error);
    res.status(500).json({ error: 'Failed to get project status' });
  }
};