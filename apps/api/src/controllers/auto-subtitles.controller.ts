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
      showShadow: z.boolean().default(true),
      useGradient: z.boolean().optional(),
      gradientType: z.enum(['linear', 'radial']).optional(),
      gradientColors: z.array(z.string()).optional(),
      gradientDirection: z.number().optional(),
      shadowIntensity: z.number().optional(),
      shadowOffsetX: z.number().optional(),
      shadowOffsetY: z.number().optional(),
      position: z.object({
        x: z.number(),
        y: z.number()
      }).optional(),
      scale: z.number().optional(),
      maxWordsPerLine: z.number().optional()
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
      showShadow: z.boolean().default(true),
      useGradient: z.boolean().optional(),
      gradientType: z.enum(['linear', 'radial']).optional(),
      gradientColors: z.array(z.string()).optional(),
      gradientDirection: z.number().optional(),
      shadowIntensity: z.number().optional(),
      shadowOffsetX: z.number().optional(),
      shadowOffsetY: z.number().optional(),
      position: z.object({
        x: z.number(),
        y: z.number()
      }).optional(),
      scale: z.number().optional(),
      maxWordsPerLine: z.number().optional()
    })
  })
});

export const generate = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId, language, options } = generateSchema.parse(req.body);
    
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId },
      select: { id: true, filePath: true, userId: true, duration: true, status: true }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.status === 'processing') {
      const { subtitleQueue } = await import('../lib/queues');
      const jobs = await subtitleQueue.getJobs(['active', 'waiting', 'delayed']);
      const existingJob = jobs.find(job => job.data.videoId === videoId);
      
      if (existingJob) {
        console.log(`Video ${videoId} is already being processed by job ${existingJob.id}`);
        return res.json({
          success: true,
          videoId,
          jobId: existingJob.id,
          estimatedTimeMinutes: Math.ceil((video.duration || 0) / 10),
          eta: Math.ceil((video.duration || 0) / 10) * 60 * 1000,
          message: 'Subtitle generation already in progress. Use the jobId to check progress.',
          pollUrl: `/api/subtitles/status/${existingJob.id}`
        });
      }
    }

    if (language) {
      console.log(`Using specified language: ${language}`);
    }

    const videoDuration = video.duration || 0;
    const estimatedMinutes = Math.ceil(videoDuration / 10); // ~10 seconds per minute of video (optimized)
    const eta = estimatedMinutes * 60 * 1000; // Convert to milliseconds

    const { subtitleQueue } = await import('../lib/queues');
    const jobId = `subtitle-${videoId}-${Date.now()}`;
    
    const job = await subtitleQueue.add('generate-subtitles', {
      videoId,
      s3Key: video.filePath,
      userId: req.userId,
      language,
      options
    }, {
      jobId: jobId,
      timeout: 7200000, // 2 hour timeout
      attempts: 2,
      removeOnComplete: 50,
      removeOnFail: 100
    });

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing' }
    });

    console.log(`Subtitle job created: ${jobId} for video ${videoId} (${videoDuration}s, ETA: ${estimatedMinutes} min)`);

    res.json({
      success: true,
      videoId,
      jobId: job.id,
      estimatedTimeMinutes: estimatedMinutes,
      eta: eta,
      message: 'Subtitle generation started. Use the jobId to check progress.',
      pollUrl: `/api/subtitles/status/${job.id}`
    });
  } catch (error: any) {
    console.error('Subtitle generation error:', error);
    
    if (req.body.videoId) {
      await prisma.video.update({
        where: { id: req.body.videoId },
        data: { status: 'failed' }
      }).catch(err => console.error('Failed to update video status:', err));
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    
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
    
    res.status(500).json({ error: 'Failed to start subtitle generation' });
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

export const getSubtitleJobStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const { subtitleQueue } = await import('../lib/queues');
    const job = await subtitleQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();
    const jobData = job.data;

    const video = await prisma.video.findUnique({
      where: { id: jobData.videoId },
      select: {
        id: true,
        status: true,
        subtitledVideoUrl: true,
        duration: true
      }
    });

    const videoDuration = video?.duration || 0;
    const estimatedTotalMinutes = Math.ceil(videoDuration / 10);
    const progressPercent = typeof progress === 'number' ? progress : 0;
    const remainingMinutes = Math.ceil(estimatedTotalMinutes * (1 - progressPercent / 100));

    res.json({
      jobId: job.id,
      status: state,
      progress: progressPercent,
      videoId: jobData.videoId,
      videoStatus: video?.status,
      subtitledVideoUrl: video?.subtitledVideoUrl,
      estimatedRemainingMinutes: remainingMinutes,
      error: job.failedReason,
      completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    });
  } catch (error) {
    console.error('Get subtitle job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
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

    const segments = subtitles.map((sub: any) => ({
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

    const segments = subtitles.map((sub: any) => ({
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

    try {
      const result = await generateVideoWithSubtitles(videoId, video.filePath, req.userId!, options);
      
      await prisma.video.update({
        where: { id: videoId },
        data: { 
          subtitledVideoUrl: result.subtitledVideoUrl
        }
      });

      console.log('Successfully updated subtitle configuration and regenerated video:', videoId);

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

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};