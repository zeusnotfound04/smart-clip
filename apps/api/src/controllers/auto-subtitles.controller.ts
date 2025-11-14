import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateSubtitles, generateSRT } from '../services/auto-subtitles.service';
import { subtitleQueue } from '../lib/queues';
import { s3Service } from '../lib/s3';
import { z } from 'zod';

interface AuthRequest extends Request {
  userId?: string;
}

const generateSchema = z.object({
  videoId: z.string()
});

const updateSchema = z.object({
  text: z.string()
});

export const generate = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = generateSchema.parse(req.body);
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const job = await subtitleQueue.add('generate-subtitles', {
      videoId,
      s3Key: video.filePath
    });

    res.json({ 
      message: 'Subtitle generation started',
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Generate subtitles error:', error);
    res.status(500).json({ error: 'Failed to generate subtitles' });
  }
};

export const getSubtitles = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const subtitles = await prisma.subtitle.findMany({
      where: { videoId },
      orderBy: { startTime: 'asc' }
    });

    res.json({ subtitles, status: video.status });
  } catch (error) {
    console.error('Get subtitles error:', error);
    res.status(500).json({ error: 'Failed to get subtitles' });
  }
};

export const updateSubtitle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = updateSchema.parse(req.body);
    
    const subtitle = await prisma.subtitle.findFirst({
      where: { 
        id,
        video: { userId: req.userId }
      }
    });

    if (!subtitle) {
      return res.status(404).json({ error: 'Subtitle not found' });
    }

    const updatedSubtitle = await prisma.subtitle.update({
      where: { id },
      data: { text }
    });

    res.json({ subtitle: updatedSubtitle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Update subtitle error:', error);
    res.status(500).json({ error: 'Failed to update subtitle' });
  }
};

export const exportSRT = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const subtitles = await prisma.subtitle.findMany({
      where: { videoId },
      orderBy: { startTime: 'asc' }
    });

    if (subtitles.length === 0) {
      return res.status(400).json({ error: 'No subtitles found' });
    }

    const segments = subtitles.map(sub => ({
      text: sub.text,
      startTime: sub.startTime,
      endTime: sub.endTime,
      confidence: sub.confidence || 0
    }));

    const srtContent = generateSRT(segments);
    const srtBuffer = Buffer.from(srtContent, 'utf-8');
    const srtKey = `subtitles/${req.userId}/${videoId}.srt`;
    
    await s3Service.uploadFile(srtKey, srtBuffer, 'text/plain');

    res.json({ 
      message: 'SRT file generated successfully',
      downloadUrl: `/api/subtitles/download/${videoId}`
    });
  } catch (error) {
    console.error('Export subtitles error:', error);
    res.status(500).json({ error: 'Failed to export subtitles' });
  }
};

export const downloadSRT = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const srtKey = `subtitles/${req.userId}/${videoId}.srt`;
    
    try {
      const signedUrl = await s3Service.getSignedDownloadUrl(srtKey, 300);
      res.redirect(signedUrl);
    } catch (error) {
      res.status(404).json({ error: 'SRT file not found' });
    }
  } catch (error) {
    console.error('Download SRT error:', error);
    res.status(500).json({ error: 'Failed to download SRT' });
  }
};