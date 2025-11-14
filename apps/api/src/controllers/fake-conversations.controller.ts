import { Request, Response } from 'express';
import { getThemes, getVoices, ConversationMessage, ConversationConfig } from '../services/fake-conversations.service';
import { aiQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  userId?: string;
}

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { messages, config }: { messages: ConversationMessage[], config: ConversationConfig } = req.body;
    
    if (!messages || !config || !req.userId) {
      return res.status(400).json({ error: 'Messages and config are required' });
    }

    const project = await prisma.project.create({
      data: {
        userId: req.userId,
        name: `Conversation - ${config.theme}`,
        type: 'fake-conversations',
        config: JSON.stringify({ messages, config }),
        status: 'queued'
      }
    });

    const job = await aiQueue.add('create-conversation', {
      messages,
      config,
      projectId: project.id
    });
    
    res.json({
      message: 'Conversation video creation started',
      projectId: project.id,
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error creating conversation video:', error);
    res.status(500).json({ error: 'Failed to create conversation video' });
  }
};

export const getThemesController = async (req: Request, res: Response) => {
  try {
    const themes = getThemes();
    res.json({ themes });
  } catch (error) {
    console.error('Error getting themes:', error);
    res.status(500).json({ error: 'Failed to get themes' });
  }
};

export const getVoicesController = async (req: Request, res: Response) => {
  try {
    const voices = getVoices();
    res.json({ voices });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({ error: 'Failed to get voices' });
  }
};