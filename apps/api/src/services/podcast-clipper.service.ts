import { prisma } from '../lib/prisma';
import { podcastClipperQueue } from '../lib/queues';
import { videoDownloader } from './video-downloader.service';

export interface SubtitleStyle {
  styleKey: string;
  name: string;
  description: string;
  previewImage?: string;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  borderWidth: number;
  shadowDepth: number;
  scaleNormal: number;
  scaleHighlight: number;
}

export interface CreateProjectParams {
  userId: string;
  sourceType: 'upload' | 'youtube';
  sourceUrl?: string;
  videoId?: string;
  title?: string;
  thumbnail?: string;
  totalDuration?: number;
  clipStartTime: number;
  clipEndTime: number;
  subtitleStyle: string;
  whisperModel?: string;
}

export interface ProjectStatus {
  id: string;
  status: string;
  progress: number;
  processingStage: string | null;
  speakersDetected: number | null;
  layoutMode: string | null;
  outputUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface YouTubeVideoInfo {
  title: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  channelName?: string;
  platform: string;
  url: string;
}

const MAX_SOURCE_DURATION = 3 * 60 * 60; // 3 hours in seconds
const MAX_CLIP_DURATION = 10 * 60; // 10 minutes in seconds
const MIN_CLIP_DURATION = 5; // 5 seconds
const CREDITS_PER_MINUTE = 2;

const DEFAULT_SUBTITLE_STYLES: SubtitleStyle[] = [
  {
    styleKey: 'chris_cinematic',
    name: 'Cinematic',
    description: 'Bold 3D cinematic style with green highlights and scale animation',
    fontFamily: 'Montserrat Black',
    fontSize: 105,
    primaryColor: '#FFFFFF',
    highlightColor: '#00FF5A',
    borderWidth: 8,
    shadowDepth: 4,
    scaleNormal: 90,
    scaleHighlight: 120,
  },
  {
    styleKey: 'clean_pop',
    name: 'Clean Pop',
    description: 'Modern italic style with soft shadows and pop-in animation',
    fontFamily: 'Outfit',
    fontSize: 95,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    borderWidth: 0,
    shadowDepth: 8,
    scaleNormal: 100,
    scaleHighlight: 115,
  },
  {
    styleKey: 'minimal_lowercase',
    name: 'Minimal Lowercase',
    description: 'Ultra-clean minimal style with lowercase text and subtle fade',
    fontFamily: 'Inter',
    fontSize: 85,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    borderWidth: 0,
    shadowDepth: 4,
    scaleNormal: 100,
    scaleHighlight: 100,
  },
  {
    styleKey: 'bold_emphasis',
    name: 'Bold Emphasis',
    description: 'High-impact 3D style with bold text and red highlight that returns to white',
    fontFamily: 'Bebas Neue',
    fontSize: 110,
    primaryColor: '#FFFFFF',
    highlightColor: '#FF3232',
    borderWidth: 6,
    shadowDepth: 5,
    scaleNormal: 100,
    scaleHighlight: 108,
  },
  {
    styleKey: 'karaoke_snap',
    name: 'Karaoke Snap',
    description: 'Single word at a time with quick snap-in animation',
    fontFamily: 'Poppins',
    fontSize: 130,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFFFFF',
    borderWidth: 0,
    shadowDepth: 5,
    scaleNormal: 100,
    scaleHighlight: 100,
  },
  {
    styleKey: 'warm_italic',
    name: 'Warm Italic',
    description: 'Elegant italic style with smooth green glow highlights',
    fontFamily: 'Montserrat',
    fontSize: 100,
    primaryColor: '#FFFFFF',
    highlightColor: '#00E678',
    borderWidth: 0,
    shadowDepth: 6,
    scaleNormal: 95,
    scaleHighlight: 105,
  },
];

class PodcastClipperService {
  async getSubtitleStyles(): Promise<SubtitleStyle[]> {
    const dbStyles = await prisma.subtitleStyleConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (dbStyles.length > 0) {
      return dbStyles.map((style) => ({
        styleKey: style.styleKey,
        name: style.name,
        description: style.description || '',
        previewImage: style.previewImage || undefined,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        primaryColor: style.primaryColor,
        highlightColor: style.highlightColor,
        borderWidth: style.borderWidth,
        shadowDepth: style.shadowDepth,
        scaleNormal: style.scaleNormal,
        scaleHighlight: style.scaleHighlight,
      }));
    }

    return DEFAULT_SUBTITLE_STYLES;
  }

  async getYouTubeVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    const validation = videoDownloader.validateUrl(url);

    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid URL');
    }

    const videoInfo = await videoDownloader.getVideoInfo(url);

    if (videoInfo.duration > MAX_SOURCE_DURATION) {
      throw new Error(`Video is too long. Maximum duration is 3 hours. This video is ${Math.round(videoInfo.duration / 60)} minutes.`);
    }

    return {
      title: videoInfo.title,
      duration: videoInfo.duration,
      durationFormatted: videoInfo.durationFormatted || this.formatDuration(videoInfo.duration),
      thumbnail: videoInfo.thumbnail,
      platform: videoInfo.platform,
      url: videoInfo.url,
    };
  }

  calculateCredits(clipDurationSeconds: number): number {
    const minutes = Math.ceil(clipDurationSeconds / 60);
    return minutes * CREDITS_PER_MINUTE;
  }

  validateClipParams(params: {
    clipStartTime: number;
    clipEndTime: number;
    totalDuration?: number;
  }): { valid: boolean; error?: string } {
    const { clipStartTime, clipEndTime, totalDuration } = params;
    const clipDuration = clipEndTime - clipStartTime;

    if (clipStartTime < 0) {
      return { valid: false, error: 'Start time cannot be negative' };
    }

    if (clipEndTime <= clipStartTime) {
      return { valid: false, error: 'End time must be after start time' };
    }

    if (clipDuration < MIN_CLIP_DURATION) {
      return { valid: false, error: `Clip must be at least ${MIN_CLIP_DURATION} seconds` };
    }

    if (clipDuration > MAX_CLIP_DURATION) {
      return { valid: false, error: `Clip cannot exceed ${MAX_CLIP_DURATION / 60} minutes` };
    }

    if (totalDuration && clipEndTime > totalDuration) {
      return { valid: false, error: 'End time exceeds video duration' };
    }

    return { valid: true };
  }

  async createProject(params: CreateProjectParams): Promise<{
    projectId: string;
    estimatedCredits: number;
    estimatedProcessingTime: number;
  }> {
    const {
      userId,
      sourceType,
      sourceUrl,
      videoId,
      title,
      thumbnail,
      totalDuration,
      clipStartTime,
      clipEndTime,
      subtitleStyle,
      whisperModel = 'base',
    } = params;

    const validation = this.validateClipParams({
      clipStartTime,
      clipEndTime,
      totalDuration,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const clipDuration = clipEndTime - clipStartTime;
    const estimatedCredits = this.calculateCredits(clipDuration);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user || user.credits < estimatedCredits) {
      throw new Error(`Insufficient credits. Need ${estimatedCredits} credits, have ${user?.credits || 0}`);
    }

    const styles = await this.getSubtitleStyles();
    const validStyle = styles.find((s) => s.styleKey === subtitleStyle);
    if (!validStyle) {
      throw new Error(`Invalid subtitle style: ${subtitleStyle}`);
    }

    let videoPath: string | undefined;
    if (sourceType === 'upload') {
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      });

      if (!video) {
        throw new Error('Uploaded video not found');
      }
      videoPath = video.filePath;
    }

    const project = await prisma.podcastClipperProject.create({
      data: {
        userId,
        sourceType,
        sourceUrl,
        sourceVideoId: videoId,
        title,
        thumbnail,
        totalDuration,
        clipStartTime,
        clipEndTime,
        clipDuration,
        subtitleStyle,
        whisperModel,
        status: 'pending',
        estimatedCost: estimatedCredits * 0.01,
      },
    });

    const requestId = `podcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[PODCAST_CLIPPER] Queueing job for project ${project.id}`);

    try {
      const { createClient } = await import('redis');
      const redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await redis.connect();

      const pythonJobPayload = {
        job_id: requestId,
        project_id: project.id,
        user_id: userId,
        source_type: sourceType,
        source_url: sourceUrl,
        video_path: videoPath,
        clip_start_time: clipStartTime,
        clip_end_time: clipEndTime,
        subtitle_style: subtitleStyle,
        whisper_model: whisperModel,
        output_bucket: process.env.AWS_S3_BUCKET_NAME || 'smart-clip-temp',
        output_prefix: `podcast-clips/${userId}/${project.id}`,
        created_at: new Date().toISOString()
      };

      await redis.lPush('podcast_clipper_jobs', JSON.stringify(pythonJobPayload));
      console.log(`[PODCAST_CLIPPER] Job pushed to Python worker queue: ${requestId}`);

      await redis.quit();

      await prisma.podcastClipperProject.update({
        where: { id: project.id },
        data: {
          status: 'processing',
          processingStage: 'queued',
          progress: 5
        }
      });

    } catch (queueError) {
      console.error(`[PODCAST_CLIPPER] Failed to queue job:`, queueError);

      await prisma.podcastClipperProject.update({
        where: { id: project.id },
        data: {
          status: 'failed',
          errorMessage: queueError instanceof Error ? queueError.message : String(queueError)
        }
      });

      throw new Error(`Failed to queue processing job: ${queueError instanceof Error ? queueError.message : String(queueError)}`);
    }

    console.log(`[PODCAST_CLIPPER] Created project ${project.id} for user ${userId}`);
    console.log(`[PODCAST_CLIPPER] Clip: ${clipStartTime}s - ${clipEndTime}s (${clipDuration}s)`);
    console.log(`[PODCAST_CLIPPER] Style: ${subtitleStyle}, Whisper: ${whisperModel}`);

    const estimatedProcessingTime = Math.ceil(clipDuration / 60) * 2;

    return {
      projectId: project.id,
      estimatedCredits,
      estimatedProcessingTime,
    };
  }

  async getProjectStatus(projectId: string, userId: string): Promise<ProjectStatus | null> {
    const project = await prisma.podcastClipperProject.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return null;
    }

    try {
      const { createClient } = await import('redis');
      const redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await redis.connect();

      const statusKey = `podcast_clipper_status:${projectId}`;
      const redisStatus = await redis.get(statusKey);

      await redis.quit();

      if (redisStatus) {
        const parsedStatus = JSON.parse(redisStatus);
        console.log(`[PODCAST_CLIPPER] Redis status for ${projectId}:`, parsedStatus);

        if (parsedStatus.status === 'completed' && project.status !== 'completed') {
          await prisma.podcastClipperProject.update({
            where: { id: projectId },
            data: {
              status: 'completed',
              progress: 100,
              processingStage: 'completed',
              outputUrl: parsedStatus.output_url,
              speakersDetected: parsedStatus.speakers_detected,
              layoutMode: parsedStatus.layout_mode,
              processingTimeMs: parsedStatus.processing_time_ms,
              completedAt: new Date()
            }
          });

          return {
            id: project.id,
            status: 'completed',
            progress: 100,
            processingStage: 'completed',
            speakersDetected: parsedStatus.speakers_detected,
            layoutMode: parsedStatus.layout_mode,
            outputUrl: parsedStatus.output_url,
            errorMessage: null,
            createdAt: project.createdAt,
            completedAt: new Date(),
          };
        }

        if (parsedStatus.status === 'failed' && project.status !== 'failed') {
          await prisma.podcastClipperProject.update({
            where: { id: projectId },
            data: {
              status: 'failed',
              progress: 0,
              processingStage: 'error',
              errorMessage: parsedStatus.error
            }
          });

          return {
            id: project.id,
            status: 'failed',
            progress: 0,
            processingStage: 'error',
            speakersDetected: null,
            layoutMode: null,
            outputUrl: null,
            errorMessage: parsedStatus.error,
            createdAt: project.createdAt,
            completedAt: null,
          };
        }

        if (parsedStatus.status === 'processing') {
          return {
            id: project.id,
            status: parsedStatus.status,
            progress: parsedStatus.progress || project.progress,
            processingStage: parsedStatus.stage || project.processingStage,
            speakersDetected: parsedStatus.speakers_detected || project.speakersDetected,
            layoutMode: parsedStatus.layout_mode || project.layoutMode,
            outputUrl: project.outputUrl,
            errorMessage: project.errorMessage,
            createdAt: project.createdAt,
            completedAt: project.completedAt,
          };
        }
      }
    } catch (redisError) {
      console.error(`[PODCAST_CLIPPER] Error checking Redis status:`, redisError);
    }

    return {
      id: project.id,
      status: project.status,
      progress: project.progress,
      processingStage: project.processingStage,
      speakersDetected: project.speakersDetected,
      layoutMode: project.layoutMode,
      outputUrl: project.outputUrl,
      errorMessage: project.errorMessage,
      createdAt: project.createdAt,
      completedAt: project.completedAt,
    };
  }

  async getProject(projectId: string, userId: string) {
    const project = await prisma.podcastClipperProject.findFirst({
      where: {
        id: projectId,
        userId,
      },
      include: {
        sourceVideo: {
          select: {
            id: true,
            originalName: true,
            filePath: true,
            duration: true,
          },
        },
      },
    });

    return project;
  }

  async getUserProjects(userId: string, limit = 20, offset = 0) {
    const projects = await prisma.podcastClipperProject.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        thumbnail: true,
        sourceType: true,
        clipStartTime: true,
        clipEndTime: true,
        clipDuration: true,
        subtitleStyle: true,
        status: true,
        progress: true,
        outputUrl: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const total = await prisma.podcastClipperProject.count({
      where: { userId },
    });

    return { projects, total };
  }

  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.podcastClipperProject.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return false;
    }

    if (project.status === 'processing' || project.status === 'downloading') {
      throw new Error('Cannot delete a project that is currently processing');
    }

    await prisma.podcastClipperProject.delete({
      where: { id: projectId },
    });

    return true;
  }

  async updateProjectStatus(
    projectId: string,
    updates: {
      status?: string;
      progress?: number;
      processingStage?: string;
      speakersDetected?: number;
      layoutMode?: string;
      outputUrl?: string;
      subtitlePath?: string;
      errorMessage?: string;
      processingTimeMs?: number;
      creditsUsed?: number;
    }
  ) {
    const data: any = { ...updates };

    if (updates.status === 'completed') {
      data.completedAt = new Date();
    }

    await prisma.podcastClipperProject.update({
      where: { id: projectId },
      data,
    });
  }

  async deductCredits(projectId: string, userId: string, creditsUsed: number) {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const balanceBefore = user.credits;
      const balanceAfter = balanceBefore - creditsUsed;

      await tx.user.update({
        where: { id: userId },
        data: {
          credits: balanceAfter,
          totalCreditsUsed: { increment: creditsUsed },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -creditsUsed,
          type: 'usage',
          description: 'Podcast Clipper - Video clip generation',
          balanceBefore,
          balanceAfter,
          projectId,
          projectType: 'podcast_clipper',
        },
      });

      await tx.podcastClipperProject.update({
        where: { id: projectId },
        data: {
          creditsUsed,
          actualCost: creditsUsed * 0.01,
        },
      });
    });
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export const podcastClipperService = new PodcastClipperService();
export default podcastClipperService;
