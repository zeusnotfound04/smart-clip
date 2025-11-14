import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

interface AuthRequest extends Request {
  userId?: string;
}

const createProjectSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['auto-subtitles', 'split-streamer', 'smart-clipper', 'ai-script-generator', 'fake-conversations']),
  videoId: z.string().optional(),
  config: z.object({}).optional()
});

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, videoId, config } = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        userId: req.userId!,
        name,
        type,
        videoId: videoId || null,
        config: config as any,
        status: 'pending'
      },
      include: {
        video: {
          select: { id: true, originalName: true, filePath: true }
        }
      }
    });

    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const list = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: { id: true, originalName: true, duration: true }
        }
      }
    });

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId },
      select: { id: true, status: true, progress: true, outputPath: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project status error:', error);
    res.status(500).json({ error: 'Failed to get project status' });
  }
};