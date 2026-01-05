import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { videoDownloader } from '../services/video-downloader.service';
import { uploadFile, generateKey } from '../lib/s3';
import { promises as fs } from 'fs';

interface AuthRequest extends Request {
  userId?: string;
}

// Validation schemas
const validateUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

const uploadFromUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
  projectName: z.string().optional(),
  processType: z.enum(['subtitles', 'smart-clipper', 'none']).default('none'),
  options: z.object({
    // Subtitle options
    language: z.string().optional(),
    detectAllLanguages: z.boolean().optional(),
    style: z.object({
      textCase: z.enum(['normal', 'uppercase', 'lowercase', 'capitalize']).optional(),
      fontFamily: z.string().optional(),
      fontSize: z.number().optional(),
      primaryColor: z.string().optional(),
      outlineColor: z.string().optional(),
      shadowColor: z.string().optional(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      showShadow: z.boolean().optional(),
    }).optional(),
    // Smart clipper options
    contentType: z.enum(['gaming', 'podcast', 'interview', 'vlog', 'tutorial']).optional(),
    numberOfClips: z.number().optional(),
    minClipDuration: z.number().optional(),
    maxClipDuration: z.number().optional(),
  }).optional(),
});

/**
 * Validate if a URL is supported
 */
export const validateUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = validateUrlSchema.parse(req.body);

    // Validate URL
    const validation = videoDownloader.validateUrl(url);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Get video info without downloading
    try {
      const videoInfo = await videoDownloader.getVideoInfo(url);

      console.log("Entire videoInfo object:", videoInfo);

      console.log('📤 Sending video info to frontend:');
      console.log('   - Title:', videoInfo.title);
      console.log('   - Direct URL:', videoInfo.url);
      console.log('   - Original URL:', videoInfo.originalUrl);
      console.log('   - Platform:', videoInfo.platform);

      const responseData = {
        success: true,
        platform: validation.platform,
        videoInfo: {
          title: videoInfo.title,
          duration: videoInfo.duration,
          durationFormatted: videoInfo.durationFormatted,
          thumbnail: videoInfo.thumbnail,
          platform: videoInfo.platform,
          url: videoInfo.url, // This is the direct .mp4 URL (e.g., video.twimg.com)
          originalUrl: videoInfo.originalUrl, // This is the original tweet URL
        },
      };

      console.log('📦 Complete response being sent:', JSON.stringify(responseData, null, 2));

      return res.json(responseData);
    } catch (error) {
      console.error('Failed to get video info:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to retrieve video information. Please check the URL and try again.',
      });
    }
  } catch (error) {
    console.error('URL validation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to validate URL',
    });
  }
};

/**
 * Upload video from URL (YouTube, Twitter/X, etc.)
 */
export const uploadFromUrl = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let downloadedFilePath: string | null = null;

  try {
    const { url, projectName, processType, options } = uploadFromUrlSchema.parse(req.body);

    console.log(`📥 Starting URL upload for user ${userId}: ${url}`);

    // Validate URL
    const validation = videoDownloader.validateUrl(url);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Get video info (quick, no download)
    console.log(`📋 Fetching video info from ${validation.platform}...`);
    const videoInfo = await videoDownloader.getVideoInfo(url);

    // Create placeholder video record
    const video = await prisma.video.create({
      data: {
        userId,
        title: projectName || videoInfo.title,
        filePath: 'pending', // Will be updated by worker
        originalName: `${videoInfo.title}.mp4`,
        duration: videoInfo.duration || 0,
        status: 'downloading', // New status for URL downloads
        size: 0, // Will be updated by worker
        mimeType: 'video/mp4',
      },
    });

    console.log(`✅ Video record created: ${video.id}`);

    // Queue download + processing in background worker
    // This prevents blocking the API request thread
    let jobId: string | undefined;
    let projectId: string | undefined;

    if (processType === 'subtitles') {
      // Queue: Download → Upload to S3 → Generate Subtitles
      const { subtitleQueue } = await import('../lib/queues');
      
      // Check for existing jobs for this video
      const existingJobs = await subtitleQueue.getJobs(['active', 'waiting', 'delayed']);
      const duplicateJob = existingJobs.find(j => j.data.videoId === video.id);
      
      if (duplicateJob) {
        console.log(`⚠️  Job already exists for video ${video.id}, skipping duplicate`);
        return res.status(200).json({
          success: true,
          message: 'Video is already being processed',
          video,
          jobId: duplicateJob.id
        });
      }
      
      // Create job that will:
      // 1. Download video using yt-dlp (handles Twitter HLS automatically)
      // 2. Upload to S3
      // 3. Generate subtitles
      const job = await subtitleQueue.add('download-and-generate-subtitles', {
        videoId: video.id,
        url: url,
        userId,
        language: options?.language,
        options: options,
        platform: validation.platform,
      });

      jobId = job.id as string;

      console.log(`🎬 Download + subtitle generation job queued: ${jobId}`);
    } else if (processType === 'smart-clipper') {
      // Create smart clipper project
      const smartClipperProject = await prisma.smartClipperProject.create({
        data: {
          userId,
          videoId: video.id,
          contentType: options?.contentType || 'gaming',
          status: 'pending',
          config: {},
        },
      });

      projectId = smartClipperProject.id;

      // Queue: Download → Upload to S3 → Smart Clipper Analysis
      const { smartClipperQueue } = await import('../lib/queues');
      const analysisType = ['podcast', 'interview'].includes(options?.contentType || '')
        ? 'analyze-podcast-transcript'
        : 'analyze-video-complete';

      // Check for existing jobs for this project
      const existingJobs = await smartClipperQueue.getJobs(['active', 'waiting', 'delayed']);
      const duplicateJob = existingJobs.find(j => j.data.projectId === smartClipperProject.id);
      
      if (duplicateJob) {
        console.log(`⚠️  Job already exists for project ${smartClipperProject.id}, skipping duplicate`);
        return res.status(200).json({
          success: true,
          message: 'Project is already being processed',
          video,
          project: smartClipperProject,
          jobId: duplicateJob.id
        });
      }

      // Note: This would require a similar download-and-analyze job
      // For now, keeping the original flow but marking it as needing update
      const job = await smartClipperQueue.add(analysisType, {
        projectId: smartClipperProject.id,
        videoId: video.id,
        url: url,
        userId: userId,
        contentType: options?.contentType || 'gaming',
        config: {
          numberOfClips: options?.numberOfClips || 5,
          minClipDuration: options?.minClipDuration || 30,
          maxClipDuration: options?.maxClipDuration || 90,
        },
        requestId: `url-upload-${Date.now()}`,
      });

      jobId = job.id as string;

      console.log(`🎯 Smart clipper download + analysis job queued: ${jobId}`);
    }

    return res.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        s3Url: video.filePath, // Will be 'pending' until worker completes
        status: video.status,
      },
      platform: validation.platform,
      processType,
      jobId,
      projectId,
      message: processType === 'subtitles'
        ? 'Video download and subtitle generation queued. This may take a few minutes for Twitter/X videos.'
        : processType === 'smart-clipper'
        ? 'Video download and analysis queued. This may take a few minutes.'
        : 'Video download queued',
    });
  } catch (error) {
    console.error('URL upload error:', error);

    // Clean up downloaded file if it exists
    if (downloadedFilePath) {
      try {
        await videoDownloader.cleanupFile(downloadedFilePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      error: 'Failed to upload video from URL',
      details: errorMessage,
    });
  }
};

/**
 * Get supported platforms
 */
export const getSupportedPlatforms = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    platforms: [
      {
        name: 'YouTube',
        domains: ['youtube.com', 'youtu.be'],
        supported: true,
      },
      {
        name: 'Twitter/X',
        domains: ['twitter.com', 'x.com'],
        supported: true,
      },
      {
        name: 'Instagram',
        domains: ['instagram.com'],
        supported: true,
      },
      {
        name: 'TikTok',
        domains: ['tiktok.com'],
        supported: true,
      },
      {
        name: 'Vimeo',
        domains: ['vimeo.com'],
        supported: true,
      },
      {
        name: 'Facebook',
        domains: ['facebook.com', 'fb.watch'],
        supported: true,
      },
    ],
  });
};

/**
 * Get video info from URL without downloading
 */
export const getVideoInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = validateUrlSchema.parse(req.body);

    // Validate URL
    const validation = videoDownloader.validateUrl(url);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Get video info
    const videoInfo = await videoDownloader.getVideoInfo(url);
    console.log("Entire videoInfo object:", videoInfo);

    return res.json({
      success: true,
      platform: validation.platform,
      videoInfo: {
        title: videoInfo.title,
        duration: videoInfo.duration,
        durationFormatted: formatDuration(videoInfo.duration),
        thumbnail: videoInfo.thumbnail,
        platform: videoInfo.platform,
        url: videoInfo.url, // Direct video URL
      },
    });
  } catch (error) {
    console.error('Get video info error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to get video information',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Helper function to format duration
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
