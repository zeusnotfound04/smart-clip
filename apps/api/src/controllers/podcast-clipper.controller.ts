import { Request, Response, NextFunction } from 'express';
import { podcastClipperService } from '../services/podcast-clipper.service';
import { prisma } from '../lib/prisma';
import { uploadtoS3, getSignedDownloadUrl as getSignedUrl, uploadFile } from '../lib/s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  userId?: string;
}

export async function getSubtitleStyles(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const styles = await podcastClipperService.getSubtitleStyles();

    res.json({
      success: true,
      data: styles,
    });
  } catch (error) {
    next(error);
  }
}

export async function getYouTubeInfo(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    const videoInfo = await podcastClipperService.getYouTubeVideoInfo(url);

    res.json({
      success: true,
      videoInfo,
    });
  } catch (error: any) {
    if (error.message?.includes('too long')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    if (error.message?.includes('Invalid URL') || error.message?.includes('not supported')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
}

export async function uploadVideo(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
      });
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Supported formats: MP4, WebM, MOV, AVI',
      });
    }

    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const s3Key = `podcast-clipper/${userId}/${timestamp}-${uniqueId}${ext}`;

    const s3Url = await uploadFile(s3Key, file.buffer, file.mimetype);

    console.log(`[PODCAST_CLIPPER] Uploaded video to S3: ${s3Key}`);

    let duration: number | undefined;
    try {
      const ffprobe = require('fluent-ffmpeg');
      duration = await new Promise<number>((resolve, reject) => {
        ffprobe.ffprobe(file.buffer, (err: any, metadata: any) => {
          if (err) reject(err);
          else resolve(metadata?.format?.duration || 0);
        });
      });
    } catch {
      console.log('[PODCAST_CLIPPER] Could not determine video duration during upload');
    }

    const video = await prisma.video.create({
      data: {
        userId,
        originalName: file.originalname,
        filePath: s3Key,
        size: file.size,
        mimeType: file.mimetype,
        duration,
        status: 'uploaded',
      },
    });

    const previewUrl = await getSignedUrl(s3Key);

    res.json({
      success: true,
      data: {
        videoId: video.id,
        filename: file.originalname,
        size: file.size,
        duration,
        previewUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUploadedVideoInfo(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { videoId } = req.params;

    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId,
      },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      });
    }

    const previewUrl = await getSignedUrl(video.filePath);

    res.json({
      success: true,
      data: {
        videoId: video.id,
        filename: video.originalName,
        size: video.size,
        duration: video.duration,
        previewUrl,
        uploadedAt: video.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function calculateCredits(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { clipStartTime, clipEndTime } = req.query;

    const start = parseFloat(clipStartTime as string);
    const end = parseFloat(clipEndTime as string);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid clip times',
      });
    }

    const validation = podcastClipperService.validateClipParams({
      clipStartTime: start,
      clipEndTime: end,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const clipDuration = end - start;
    const credits = podcastClipperService.calculateCredits(clipDuration);

    res.json({
      success: true,
      data: {
        clipDuration,
        credits,
        estimatedProcessingTime: Math.ceil(clipDuration / 60) * 2,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const {
      sourceType,
      sourceUrl,
      videoId,
      title,
      thumbnail,
      totalDuration,
      clipStartTime,
      clipEndTime,
      subtitleStyle,
      whisperModel,
    } = req.body;

    if (!sourceType || !['upload', 'youtube'].includes(sourceType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source type. Must be "upload" or "youtube"',
      });
    }

    if (sourceType === 'youtube' && !sourceUrl) {
      return res.status(400).json({
        success: false,
        error: 'YouTube URL is required',
      });
    }

    if (sourceType === 'upload' && !videoId) {
      return res.status(400).json({
        success: false,
        error: 'Video ID is required for uploaded videos',
      });
    }

    if (clipStartTime === undefined || clipEndTime === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Clip start and end times are required',
      });
    }

    if (!subtitleStyle) {
      return res.status(400).json({
        success: false,
        error: 'Subtitle style is required',
      });
    }

    const result = await podcastClipperService.createProject({
      userId,
      sourceType,
      sourceUrl,
      videoId,
      title,
      thumbnail,
      totalDuration,
      clipStartTime: parseFloat(clipStartTime),
      clipEndTime: parseFloat(clipEndTime),
      subtitleStyle,
      whisperModel,
    });

    res.status(201).json({
      success: true,
      projectId: result.projectId,
      estimatedCredits: result.estimatedCredits,
      estimatedProcessingTime: result.estimatedProcessingTime,
    });
  } catch (error: any) {
    if (error.message?.includes('Insufficient credits')) {
      return res.status(402).json({
        success: false,
        error: error.message,
      });
    }
    if (error.message?.includes('Invalid subtitle style')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
}

export async function getProjectStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { projectId } = req.params;

    const status = await podcastClipperService.getProjectStatus(projectId, userId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    let outputSignedUrl: string | undefined;
    if (status.outputUrl) {
      outputSignedUrl = await getSignedUrl(status.outputUrl);
    }

    res.json({
      id: status.id,
      status: status.status,
      progress: status.progress,
      processingStage: status.processingStage,
      speakersDetected: status.speakersDetected,
      layoutMode: status.layoutMode,
      outputUrl: status.outputUrl,
      outputSignedUrl,
      errorMessage: status.errorMessage,
      createdAt: status.createdAt,
      completedAt: status.completedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { projectId } = req.params;

    const project = await podcastClipperService.getProject(projectId, userId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    let outputSignedUrl: string | undefined;
    if (project.outputUrl) {
      outputSignedUrl = await getSignedUrl(project.outputUrl);
    }

    res.json({
      success: true,
      data: {
        ...project,
        outputSignedUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserProjects(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { projects, total } = await podcastClipperService.getUserProjects(
      userId,
      Math.min(limit, 100),
      offset
    );

    const projectsWithUrls = await Promise.all(
      projects.map(async (project) => {
        let outputSignedUrl: string | undefined;
        if (project.outputUrl) {
          outputSignedUrl = await getSignedUrl(project.outputUrl);
        }
        return {
          ...project,
          outputSignedUrl,
        };
      })
    );

    res.json({
      success: true,
      data: {
        projects: projectsWithUrls,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { projectId } = req.params;

    const deleted = await podcastClipperService.deleteProject(projectId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: any) {
    if (error.message?.includes('currently processing')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
}

export async function downloadOutput(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { projectId } = req.params;

    const project = await podcastClipperService.getProject(projectId, userId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    if (!project.outputUrl) {
      return res.status(400).json({
        success: false,
        error: 'Output not ready yet',
      });
    }

    const downloadUrl = await getSignedUrl(project.outputUrl, 3600);

    res.json({
      success: true,
      data: {
        downloadUrl,
        filename: `${project.title || 'podcast-clip'}.mp4`,
      },
    });
  } catch (error) {
    next(error);
  }
}
