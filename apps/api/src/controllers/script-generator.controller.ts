import { Request, Response } from 'express';
import { getTemplates } from '../services/script-generator.service';
import { aiQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  userId?: string;
}

export const generate = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, tone, length, format } = req.body;
    
    if (!prompt || !req.userId) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const project = await prisma.project.create({
      data: {
        userId: req.userId,
        name: `Script: ${prompt.substring(0, 30)}...`,
        type: 'script-generator',
        config: JSON.stringify({ prompt, tone, length, format }),
        status: 'queued'
      }
    });

    const job = await aiQueue.add('generate-script', {
      prompt,
      options: { tone, length, format },
      projectId: project.id
    });
    
    res.json({
      message: 'Script generation started',
      projectId: project.id,
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: 'Failed to generate script' });
  }
};

export const getTemplatesController = async (req: Request, res: Response) => {
  try {
    const templates = getTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
};