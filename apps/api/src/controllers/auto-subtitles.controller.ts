import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateVideoWithSubtitles, generateSRT } from '../services/auto-subtitles.service';
import { z } from 'zod';

interface AuthRequest extends Request {
  userId?: string;
}

const generateSchema = z.object({
  videoId: z.string(),
  language: z.string().optional(),
  options: z.object({
    detectAllLanguages: z.boolean().optional(),
    language: z.string().optional(),
    style: z.object({
      textCase: z.enum(['normal', 'uppercase', 'lowercase', 'capitalize']).default('normal'),
      fontFamily: z.string().default('Arial'),
      fontSize: z.number().default(20),
      primaryColor: z.string().default('#FFFFFF'),
      outlineColor: z.string().default('#000000'),
      shadowColor: z.string().default('#000000'),
      bold: z.boolean().default(false),
      italic: z.boolean().default(false),
      alignment: z.enum(['left', 'center', 'right']).default('center'),
      showShadow: z.boolean().default(true)
    })
  }).optional()
});

const updateSchema = z.object({
  text: z.string()
});

const configSchema = z.object({
  options: z.object({
    detectAllLanguages: z.boolean().default(true),
    style: z.object({
      textCase: z.enum(['normal', 'uppercase', 'lowercase', 'capitalize']).default('normal'),
      fontFamily: z.string().default('Arial'),
      fontSize: z.number().default(20),
      primaryColor: z.string().default('#FFFFFF'),
      outlineColor: z.string().default('#000000'),
      shadowColor: z.string().default('#000000'),
      bold: z.boolean().default(false),
      italic: z.boolean().default(false),
      alignment: z.enum(['left', 'center', 'right']).default('center'),
      showShadow: z.boolean().default(true)
    })
  })
});

export const generate = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId, language, options } = generateSchema.parse(req.body);
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (language) {
      console.log(`🌍 Using specified language: ${language}`);
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing' }
    });

    const subtitleOptions = options ? {
      ...options,
      language: language || options?.language
    } : language ? { language } : undefined;

    const result = await generateVideoWithSubtitles(videoId, video.filePath, req.userId!, subtitleOptions);

    // Update video with subtitled video URL and mark as completed
    await prisma.video.update({
      where: { id: videoId },
      data: { 
        status: 'completed',
        subtitledVideoUrl: result.subtitledVideoUrl
      }
    });

    // Save subtitle segments to database
    for (const segment of result.segments) {
      await prisma.subtitle.create({
        data: {
          videoId,
          text: segment.text,
          startTime: segment.startTime,
          endTime: segment.endTime,
          confidence: segment.confidence,
          speaker: null
        }
      });
    }

    res.json({
      success: true,
      videoId,
      videoWithSubtitles: result.subtitledVideoUrl,
      srtContent: result.srtContent,
      segments: result.segments,
      detectedLanguages: result.detectedLanguages,
      srtS3Key: result.srtS3Key,
      audioS3Key: result.audioS3Key,
      message: 'Subtitles generated successfully and all files saved to S3'
    });
  } catch (error: any) {
    await prisma.video.update({
      where: { id: req.body.videoId },
      data: { status: 'failed' }
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    
    // Check if it's a credit error
    const errorMessage = error?.message || '';
    const isInsufficientCredits = 
      errorMessage.toLowerCase().includes('insufficient credit') ||
      errorMessage.toLowerCase().includes('out of credit') ||
      errorMessage.toLowerCase().includes('not enough credit');
    
    if (isInsufficientCredits) {
      return res.status(402).json({ 
        error: 'Insufficient Credits',
        message: 'Hey! You ran out of credits. Please upgrade to remove watermark and generate videos!',
        details: errorMessage
      });
    }
    
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
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="subtitles_${videoId}.srt"`);
    res.send(srtContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export subtitles' });
  }
};

export const downloadSRT = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    
    const subtitles = await prisma.subtitle.findMany({
      where: { 
        videoId,
        video: { userId: req.userId }
      },
      orderBy: { startTime: 'asc' }
    });

    if (subtitles.length === 0) {
      return res.status(404).json({ error: 'Subtitles not found' });
    }

    const segments = subtitles.map(sub => ({
      text: sub.text,
      startTime: sub.startTime,
      endTime: sub.endTime,
      confidence: sub.confidence || 0
    }));

    const srtContent = generateSRT(segments);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="subtitles_${videoId}.srt"`);
    res.send(srtContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download SRT' });
  }
};

export const getDetailedSubtitles = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId },
      include: {
        subtitles: {
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Calculate timing information
    const detailedSubtitles = video.subtitles.map((subtitle, index) => {
      const duration = subtitle.endTime - subtitle.startTime;
      const wordsPerMinute = subtitle.text.split(' ').length / (duration / 60);
      
      return {
        id: subtitle.id,
        index: index + 1,
        text: subtitle.text,
        startTime: subtitle.startTime,
        endTime: subtitle.endTime,
        duration: duration,
        confidence: subtitle.confidence,
        wordCount: subtitle.text.split(' ').length,
        wordsPerMinute: Math.round(wordsPerMinute),
        formattedStartTime: formatTime(subtitle.startTime),
        formattedEndTime: formatTime(subtitle.endTime),
        formattedDuration: formatTime(duration),
        createdAt: subtitle.createdAt
      };
    });

    // Calculate overall statistics
    const stats = {
      totalSegments: detailedSubtitles.length,
      totalDuration: video.duration || (detailedSubtitles.length > 0 ? Math.max(...detailedSubtitles.map(s => s.endTime)) : 0),
      totalWords: detailedSubtitles.reduce((sum, s) => sum + s.wordCount, 0),
      averageConfidence: detailedSubtitles.length > 0 
        ? (detailedSubtitles.reduce((sum, s) => sum + (s.confidence || 0), 0) / detailedSubtitles.length)
        : 0,
      averageSegmentDuration: detailedSubtitles.length > 0
        ? (detailedSubtitles.reduce((sum, s) => sum + s.duration, 0) / detailedSubtitles.length)
        : 0
    };

    res.json({
      video: {
        id: video.id,
        originalName: video.originalName,
        status: video.status,
        subtitledVideoUrl: video.subtitledVideoUrl,
        duration: video.duration
      },
      subtitles: detailedSubtitles,
      statistics: stats
    });
  } catch (error) {
    console.error('Get detailed subtitles error:', error);
    res.status(500).json({ error: 'Failed to get detailed subtitles' });
  }
};

export const updateConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const { options } = configSchema.parse(req.body);
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Regenerate the video with new subtitle configuration
    try {
      const result = await generateVideoWithSubtitles(videoId, video.filePath, req.userId!, options);
      
      // Update video with new subtitled video URL
      await prisma.video.update({
        where: { id: videoId },
        data: { 
          subtitledVideoUrl: result.subtitledVideoUrl
        }
      });

      console.log('Successfully updated subtitle configuration and regenerated video:', videoId);

    // Optionally, regenerate video with new subtitle styling
    // This would be done asynchronously in a production environment
      console.log('Successfully updated subtitle configuration and regenerated video:', videoId);

      res.json({
        success: true,
        message: 'Subtitle configuration updated and video regenerated successfully',
        videoId,
        subtitledVideoUrl: result.subtitledVideoUrl
      });
    } catch (regenerateError: any) {
      console.error('Failed to regenerate video with new configuration:', regenerateError);
      res.status(500).json({ error: 'Failed to regenerate video with new subtitle configuration' });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Update configuration error:', error);
    res.status(500).json({ error: 'Failed to update subtitle configuration' });
  }
};

// Helper function to format time in MM:SS.mmm format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};