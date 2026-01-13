import { Request, Response, Router } from 'express';
import { prisma } from '../lib/prisma';
import { geminiVideoAnalysis } from '../services/gemini-video-analysis.service';
import { multimodalEmbeddings } from '../services/multimodal-embeddings.service';
import { smartClipperQueue } from '../lib/queues';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const smartClipperRouter: Router = Router();



interface AnalyzeVideoRequest {
  videoId: string;
  contentType: 'gaming' | 'podcast' | 'interview' | 'vlog' | 'tutorial';
  config?: {
    sensitivity?: 'low' | 'medium' | 'high';
    minClipLength?: number;
    maxClipLength?: number;
    maxSegments?: number;
    numberOfClips?: number; // For podcast/interview
    focusAreas?: {
      audioEnergy?: boolean;
      visualMotion?: boolean;
      speechPatterns?: boolean;
      sceneChanges?: boolean;
    };
    customKeywords?: string[];
  };
}

export const analyzeVideo = async (req: AuthRequest, res: Response) => {
  const requestId = `analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] Starting Smart Clipper video analysis`);
    console.log('User ID:', req.userId);
    console.log('Request body:', req.body);
    
    try {
      console.log(`[${requestId}] Testing queue connection...`);
      const queueCounts = await smartClipperQueue.getJobCounts();
      console.log(`[${requestId}] Current queue stats:`, queueCounts);
      console.log(`[${requestId}] Queue connection successful`);
    } catch (queueTestError) {
      console.error(`[${requestId}] Queue connection test failed:`, queueTestError);
      return res.status(500).json({ error: 'Queue service unavailable' });
    }
    
    const { videoId, contentType, config = {} }: AnalyzeVideoRequest = req.body;

    if (!videoId || !contentType || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: videoId, contentType, and user authentication' 
      });
    }

    const video = await prisma.video.findFirst({
      where: { 
        id: videoId, 
        userId: req.userId 
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found or access denied' });
    }

    const contentConfig = await getContentTypeConfig(contentType);
    if (!contentConfig) {
      return res.status(400).json({ error: `Unsupported content type: ${contentType}` });
    }

    const analysisConfig = mergeAnalysisConfig(contentConfig, config);

    const project = await prisma.smartClipperProject.create({
      data: {
        userId: req.userId,
        videoId,
        contentType,
        config: analysisConfig,
        status: 'analyzing',
        processingStage: 'preprocessing',
        estimatedCost: calculateEstimatedCost(video.duration || 0, contentType)
      }
    });

    console.log(`[${requestId}] Created Smart Clipper project ${project.id} for video ${video.originalName}`);
    console.log(`[${requestId}] About to queue job for background processing...`);
    console.log(`[${requestId}] Queue job data:`, {
      projectId: project.id,
      videoPath: video.filePath,
      videoDuration: video.duration,
      contentType,
      configKeys: Object.keys(analysisConfig)
    });

    try {
      console.log(`[${requestId}] Adding job to smartClipperQueue...`);
      
      const isPodcastOrInterview = ['podcast', 'interview'].includes(contentType);
      const jobType = isPodcastOrInterview ? 'analyze-podcast-transcript' : 'analyze-video-complete';
      
      console.log(`[${requestId}] Job type: ${jobType} (${isPodcastOrInterview ? 'transcript-based' : 'full analysis'})`);
      
      const job = await smartClipperQueue.add(jobType, {
        projectId: project.id,
        videoPath: video.filePath,
        videoDuration: video.duration,
        contentType,
        config: analysisConfig,
        requestId
      });
      console.log(`[${requestId}] Job added successfully with ID: ${job.id}`);
      console.log(`[${requestId}] Queue stats after adding job:`, await smartClipperQueue.getJobCounts());
    } catch (queueError) {
      console.error(`[${requestId}] Failed to add job to queue:`, queueError);
      throw queueError;
    }

    console.log(`[${requestId}] Sending response to client...`);
    const response = {
      projectId: project.id,
      status: 'analyzing',
      estimatedCost: project.estimatedCost,
      estimatedDuration: Math.ceil((video.duration || 0) / 60) * 2, // ~2 minutes per video minute
      message: 'Video analysis started. Check status for updates.'
    };
    console.log(`[${requestId}] Response data:`, response);
    res.json(response);
    console.log(`[${requestId}] Response sent successfully`);

  } catch (error) {
    console.error(`[${requestId}] Error starting video analysis:`, error);
    res.status(500).json({ error: 'Failed to start video analysis' });
  }
};

export const getProjectStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.smartClipperProject.findFirst({
      where: { 
        id: projectId, 
        userId: req.userId 
      },
      include: {
        video: {
          select: { originalName: true, duration: true }
        },
        highlightSegments: {
          orderBy: { finalScore: 'desc' },
          take: 20
        },
        _count: {
          select: { highlightSegments: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const progress = calculateProgress(project.status, project.processingStage);

    res.json({
      project: {
        id: project.id,
        status: project.status,
        processingStage: project.processingStage,
        progress,
        contentType: project.contentType,
        videoName: project.video.originalName,
        videoDuration: project.video.duration,
        totalSegments: project._count.highlightSegments,
        estimatedCost: project.estimatedCost,
        actualCost: project.actualCost,
        errorMessage: project.errorMessage,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      segments: project.highlightSegments.map((segment: any) => ({
        id: segment.id,
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: segment.duration,
        finalScore: segment.finalScore,
        confidenceLevel: segment.confidenceLevel,
        highlightType: segment.highlightType,
        reasoning: segment.reasoning,
        classification: segment.geminiClassification,
        tags: segment.contentTags,
        status: segment.status,
        outputPath: segment.outputPath
      }))
    });

  } catch (error) {
    console.error('Error getting project status:', error);
    res.status(500).json({ error: 'Failed to get project status' });
  }
};

export const getProjectSegments = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { 
      sortBy = 'finalScore', 
      order = 'desc', 
      status,
      minScore,
      highlightType 
    } = req.query;

    const project = await prisma.smartClipperProject.findFirst({
      where: { 
        id: projectId, 
        userId: req.userId 
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const whereConditions: any = { projectId };
    
    if (status) whereConditions.status = status;
    if (minScore) whereConditions.finalScore = { gte: parseInt(minScore as string) };
    if (highlightType) whereConditions.highlightType = highlightType;

    const segments = await prisma.highlightSegment.findMany({
      where: whereConditions,
      orderBy: { [sortBy as string]: order },
      include: {
        segmentFeedback: {
          where: { userId: req.userId },
          take: 1
        }
      }
    });

    res.json({
      segments: segments.map((segment: any) => ({
        id: segment.id,
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: segment.duration,
        flashScore: segment.flashScore,
        proScore: segment.proScore,
        embeddingScore: segment.embeddingScore,
        finalScore: segment.finalScore,
        confidenceLevel: segment.confidenceLevel,
        highlightType: segment.highlightType,
        reasoning: segment.reasoning,
        classification: segment.geminiClassification,
        tags: segment.contentTags,
        audioEnergyAvg: segment.audioEnergyAvg,
        silenceRatio: segment.silenceRatio,
        sceneChanges: segment.sceneChanges,
        status: segment.status,
        userApproval: segment.userApproval,
        customTiming: segment.customStartTime ? {
          startTime: segment.customStartTime,
          endTime: segment.customEndTime
        } : null,
        outputPath: segment.outputPath,
        userFeedback: segment.segmentFeedback[0] || null,
        createdAt: segment.createdAt,
        updatedAt: segment.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error getting project segments:', error);
    res.status(500).json({ error: 'Failed to get project segments' });
  }
};

export const updateSegment = async (req: AuthRequest, res: Response) => {
  try {
    const { segmentId } = req.params;
    const { 
      userApproval, 
      customStartTime, 
      customEndTime,
      feedback
    } = req.body;

    const segment = await prisma.highlightSegment.findFirst({
      where: { 
        id: segmentId,
        project: { userId: req.userId }
      }
    });

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found or access denied' });
    }

    const updatedSegment = await prisma.highlightSegment.update({
      where: { id: segmentId },
      data: {
        userApproval,
        customStartTime,
        customEndTime,
        updatedAt: new Date()
      }
    });

    if (feedback) {
      await prisma.segmentFeedback.create({
        data: {
          segmentId,
          userId: req.userId!,
          feedbackType: feedback.type,
          rating: feedback.rating,
          customStartTime: feedback.customStartTime,
          customEndTime: feedback.customEndTime,
          feedbackNotes: feedback.notes,
          improvementSuggestions: feedback.suggestions
        }
      });
    }

    res.json({
      success: true,
      segment: {
        id: updatedSegment.id,
        userApproval: updatedSegment.userApproval,
        customTiming: updatedSegment.customStartTime ? {
          startTime: updatedSegment.customStartTime,
          endTime: updatedSegment.customEndTime
        } : null
      }
    });

  } catch (error) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: 'Failed to update segment' });
  }
};

export const generateClips = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { segmentIds, exportSettings } = req.body;

    const project = await prisma.smartClipperProject.findFirst({
      where: { 
        id: projectId, 
        userId: req.userId 
      },
      include: {
        video: true,
        highlightSegments: {
          where: segmentIds ? { id: { in: segmentIds } } : { userApproval: 'approved' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (project.highlightSegments.length === 0) {
      return res.status(400).json({ error: 'No segments selected or approved for generation' });
    }

    const jobs = project.highlightSegments.map((segment: any) => 
      smartClipperQueue.add('generate-clip', {
        segmentId: segment.id,
        videoPath: project.video.filePath,
        startTime: segment.customStartTime || segment.startTime,
        endTime: segment.customEndTime || segment.endTime,
        exportSettings: exportSettings || {},
        projectId
      })
    );

    await Promise.all(jobs);

    res.json({
      success: true,
      message: `${project.highlightSegments.length} clips queued for generation`,
      segmentIds: project.highlightSegments.map(s => s.id)
    });

  } catch (error) {
    console.error('Error generating clips:', error);
    res.status(500).json({ error: 'Failed to generate clips' });
  }
};

export const getContentTypes = async (req: Request, res: Response) => {
  console.log('[SMART_CLIPPER] getContentTypes called');
  
  try {
    const totalCount = await prisma.contentTypeConfig.count();
    console.log(`Total content types in database: ${totalCount}`);
    
    console.log('Fetching active content types from database...');
    const contentTypes = await prisma.contentTypeConfig.findMany({
      where: { isActive: true },
      select: {
        type: true,
        name: true,
        description: true,
        icon: true,
        audioEnergyWeight: true,
        visualMotionWeight: true,
        speechPatternWeight: true,
        sceneChangeWeight: true,
        excitementKeywords: true,
        actionKeywords: true,
        emotionalKeywords: true,
        technicalKeywords: true,
        minClipLength: true,
        maxClipLength: true,
        preferredClipLength: true,
        maxSegments: true,
        minimumConfidence: true,
        geminiFlashPromptTemplate: true,
        geminiProPromptTemplate: true
      }
    });

    console.log(`Found ${contentTypes.length} content types`);
    console.log('Content types details:', JSON.stringify(contentTypes, null, 2));
    
    if (contentTypes.length === 0) {
      console.log('No content types found, creating default ones...');
      
      const defaultContentType = await prisma.contentTypeConfig.create({
        data: {
          type: 'general',
          name: 'General Content',
          description: 'General purpose content analysis for all video types',
          icon: '',
          audioEnergyWeight: 0.5,
          visualMotionWeight: 0.5,
          speechPatternWeight: 0.5,
          sceneChangeWeight: 0.3,
          excitementKeywords: ['amazing', 'incredible', 'wow', 'awesome', 'fantastic'],
          actionKeywords: ['action', 'fast', 'quick', 'move', 'run'],
          emotionalKeywords: ['happy', 'sad', 'angry', 'excited', 'surprised'],
          technicalKeywords: ['important', 'key', 'main', 'crucial', 'significant'],
          minClipLength: 15,
          maxClipLength: 90,
          preferredClipLength: 45,
          maxSegments: 8,
          minimumConfidence: 0.6,
          geminiFlashPromptTemplate: 'Analyze this video segment for highlights',
          geminiProPromptTemplate: 'Review and create final highlights',
          embeddingQueryTemplate: 'interesting video moment',
          isActive: true
        },
        select: {
          type: true,
          name: true,
          description: true,
          icon: true,
          audioEnergyWeight: true,
          visualMotionWeight: true,
          speechPatternWeight: true,
          sceneChangeWeight: true,
          excitementKeywords: true,
          actionKeywords: true,
          emotionalKeywords: true,
          technicalKeywords: true,
          minClipLength: true,
          maxClipLength: true,
          preferredClipLength: true,
          maxSegments: true,
          minimumConfidence: true,
          geminiFlashPromptTemplate: true,
          geminiProPromptTemplate: true
        }
      });
      
      console.log('Created default content type:', defaultContentType);
      return res.json({ contentTypes: [defaultContentType] });
    }
    
    res.json({ contentTypes });
  } catch (error) {
    console.error('[SMART_CLIPPER] Error getting content types:', error);
    console.error('Error details:', error);
    res.status(500).json({ error: 'Failed to get content types' });
  }
};

export const getUserProjects = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.smartClipperProject.findMany({
      where: { userId: req.userId },
      include: {
        video: {
          select: { originalName: true, duration: true }
        },
        _count: {
          select: { highlightSegments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      projects: projects.map((project: any) => ({
        id: project.id,
        contentType: project.contentType,
        status: project.status,
        videoName: project.video.originalName,
        videoDuration: project.video.duration,
        totalSegments: project._count.highlightSegments,
        estimatedCost: project.estimatedCost,
        actualCost: project.actualCost,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    });
    


  } catch (error) {
    console.error('[SMART_CLIPPER] Error getting user projects:', error);
    res.status(500).json({ error: 'Failed to get user projects' });
  }
};

export const getProject = async (req: AuthRequest, res: Response) => {
  console.log('[SMART_CLIPPER] getProject called');
  console.log('User ID:', req.userId);
  console.log('Project ID:', req.params.projectId);
  
  try {
    const { projectId } = req.params;
    
    const project = await prisma.smartClipperProject.findFirst({
      where: { 
        id: projectId, 
        userId: req.userId 
      },
      include: {
        video: {
          select: { 
            id: true,
            originalName: true, 
            duration: true,
            filePath: true
          }
        },
        highlightSegments: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            duration: true,
            finalScore: true,
            confidenceLevel: true,
            highlightType: true,
            reasoning: true,
            status: true,
            userApproval: true,
            s3Url: true,
            generatedAt: true
          },
          orderBy: { finalScore: 'desc' }
        }
      }
    });

    if (!project) {
      console.log('Project not found');
      return res.status(404).json({ error: 'Project not found' });
    }



    const responseData = {
      success: true,
      project: {
        id: project.id,
        videoId: project.videoId,
        contentType: project.contentType,
        status: project.status,
        processingStage: project.processingStage,
        config: project.config,
        totalSegmentsFound: project.totalSegmentsFound,
        estimatedCost: project.estimatedCost,
        actualCost: project.actualCost,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        segmentCount: project.highlightSegments.length, // Add explicit segment count
        video: {
          id: project.video.id,
          originalName: project.video.originalName,
          duration: project.video.duration,
          filePath: project.video.filePath
        },
        highlightSegments: project.highlightSegments.map((segment: any) => ({
          id: segment.id,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.duration,
          finalScore: segment.finalScore,
          confidenceLevel: segment.confidenceLevel,
          highlightType: segment.highlightType,
          reasoning: segment.reasoning,
          status: segment.status,
          userApproval: segment.userApproval,
          s3Url: segment.s3Url, // Include S3 URL for generated clips
          clipReady: !!segment.s3Url // Boolean flag for frontend
        })),
        segments: project.highlightSegments.map((segment: any) => ({
          id: segment.id,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.duration,
          finalScore: segment.finalScore,
          confidenceLevel: segment.confidenceLevel,
          highlightType: segment.highlightType,
          reasoning: segment.reasoning,
          status: segment.status,
          userApproval: segment.userApproval,
          s3Url: segment.s3Url, // Include S3 URL for generated clips
          clipReady: !!segment.s3Url // Boolean flag for frontend
        })) // Add fallback field name with S3 URLs
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('[SMART_CLIPPER] Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
};

async function getContentTypeConfig(contentType: string) {
  return await prisma.contentTypeConfig.findUnique({
    where: { type: contentType }
  });
}

function mergeAnalysisConfig(contentConfig: any, userConfig: any) {
  const sensitivityMultipliers = {
    low: { maxSegments: 0.5, minimumConfidence: 1.2 },
    medium: { maxSegments: 1.0, minimumConfidence: 1.0 },
    high: { maxSegments: 1.5, minimumConfidence: 0.8 }
  };

  const sensitivity = userConfig.sensitivity || 'medium';
  const multiplier = sensitivityMultipliers[sensitivity as keyof typeof sensitivityMultipliers];

  return {
    contentType: contentConfig.type,
    chunkDuration: 240,
    minClipLength: userConfig.minClipLength || contentConfig.minClipLength,
    maxClipLength: userConfig.maxClipLength || contentConfig.maxClipLength,
    maxSegments: Math.ceil((userConfig.maxSegments || contentConfig.maxSegments) * multiplier.maxSegments),
    minimumConfidence: (userConfig.minimumConfidence || contentConfig.minimumConfidence) * multiplier.minimumConfidence,
    focusAreas: userConfig.focusAreas || {
      audioEnergy: true,
      visualMotion: true,
      speechPatterns: true,
      sceneChanges: true
    },
    customKeywords: userConfig.customKeywords || [],
    weights: {
      audioEnergyWeight: contentConfig.audioEnergyWeight,
      visualMotionWeight: contentConfig.visualMotionWeight,
      speechPatternWeight: contentConfig.speechPatternWeight,
      sceneChangeWeight: contentConfig.sceneChangeWeight
    }
  };
}

function calculateEstimatedCost(videoDurationSeconds: number, contentType: string): number {
  const minutes = Math.ceil(videoDurationSeconds / 60);
  const baseCostPerMinute = 0.05; // $0.05 per minute as per our target
  return Math.round(minutes * baseCostPerMinute * 100) / 100; // Round to 2 decimal places
}

function calculateProgress(status: string, stage: string | null): number {
  const progressMap: { [key: string]: number } = {
    'analyzing': 10,
    'preprocessing': 20,
    'flash-analysis': 40,
    'pro-refinement': 70,
    'embeddings': 85,
    'scoring': 95,
    'ready': 100,
    'failed': 0
  };

  if (status === 'ready') return 100;
  if (status === 'failed') return 0;
  
  return progressMap[stage || 'analyzing'] || 10;
}

smartClipperRouter.get('/analytics/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { segmentScoring } = await import('../services/segment-scoring.service');
    
    const project = await prisma.smartClipperProject.findFirst({
      where: { id: projectId, userId: req.userId }
    });
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
    
    const analytics = await segmentScoring.getSegmentAnalytics(projectId);
    
    res.json({
      success: true,
      analytics
    });
    
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

smartClipperRouter.post('/feedback/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { feedback } = req.body;
    
    if (!Array.isArray(feedback) || feedback.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback data'
      });
    }
    
    const project = await prisma.smartClipperProject.findFirst({
      where: { id: projectId, userId: req.userId }
    });
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
    
    for (const item of feedback) {
      await prisma.segmentFeedback.create({
        data: {
          segmentId: item.segmentId,
          userId: req.userId!,
          rating: item.userRating,
          feedbackNotes: item.feedback || '',
          feedbackType: 'user_rating'
        }
      });
    }
    
    const requestId = `rebalance-${Date.now()}`;
    await smartClipperQueue.add('rebalance-scores', {
      projectId,
      userFeedback: feedback,
      requestId
    });
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      requestId
    });
    
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

smartClipperRouter.post('/rescore/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const project = await prisma.smartClipperProject.findFirst({
      where: { id: projectId, userId: req.userId }
    });
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
    
    if (project.status !== 'ready') {
      return res.status(400).json({
        success: false,
        message: 'Project must be in ready state to rescore'
      });
    }
    
    const requestId = `rescore-${Date.now()}`;
    await smartClipperQueue.add('score-segments', {
      projectId,
      requestId
    });
    
    res.json({
      success: true,
      message: 'Rescoring initiated',
      requestId
    });
    
  } catch (error) {
    console.error('Rescore segments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate rescoring',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

smartClipperRouter.post('/generate-clip/:segmentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { segmentId } = req.params;
    const { exportSettings } = req.body;
    
    const segment = await prisma.highlightSegment.findFirst({
      where: { 
        id: segmentId,
        project: { userId: req.userId }
      },
      include: {
        project: { include: { video: true } }
      }
    });
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }
    
    if (segment.project.status !== 'ready') {
      return res.status(400).json({
        success: false,
        message: 'Project must be ready to generate clips'
      });
    }
    
    const settings = {
      format: 'mp4',
      quality: 'medium',
      includeAudio: true,
      ...exportSettings
    };
    
    await smartClipperQueue.add('generate-clip', {
      segmentId,
      videoPath: segment.project.video.filePath,
      startTime: segment.startTime,
      endTime: segment.endTime,
      exportSettings: settings,
      projectId: segment.project.id
    });
    
    res.json({
      success: true,
      message: 'Clip generation started',
      segmentId,
      estimatedDuration: Math.round(segment.duration)
    });
    
  } catch (error) {
    console.error('Generate clip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start clip generation',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

smartClipperRouter.post('/generate-clips/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { segmentIds, exportSettings, createCompilation, compilationTitle } = req.body;
    
    if (!Array.isArray(segmentIds) || segmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No segments specified'
      });
    }
    
    const project = await prisma.smartClipperProject.findFirst({
      where: { id: projectId, userId: req.userId },
      include: {
        video: true,
        highlightSegments: {
          where: { id: { in: segmentIds } }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    if (project.status !== 'ready') {
      return res.status(400).json({
        success: false,
        message: 'Project must be ready to generate clips'
      });
    }
    
    const { clipGeneration } = await import('../services/clip-generation.service');
    
    const batchOptions = {
      segments: segmentIds,
      exportSettings: {
        format: 'mp4',
        quality: 'medium',
        includeAudio: true,
        ...exportSettings
      },
      createCompilation: createCompilation || false,
      compilationTitle: compilationTitle || `${project.video.originalName} Highlights`
    };
    
    clipGeneration.generateBatchClips(projectId, segmentIds, batchOptions)
      .then(progress => {
        console.log(`Batch export completed for project ${projectId}:`, progress);
      })
      .catch(error => {
        console.error(`Batch export failed for project ${projectId}:`, error);
      });
    
    res.json({
      success: true,
      message: 'Batch clip generation started',
      projectId,
      segmentCount: segmentIds.length,
      createCompilation: batchOptions.createCompilation
    });
    
  } catch (error) {
    console.error('Generate clips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start batch clip generation',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

smartClipperRouter.get('/export-options', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clipGeneration } = await import('../services/clip-generation.service');
    
    const formats = await clipGeneration.getExportFormats();
    const qualities = await clipGeneration.getQualityPresets();
    
    res.json({
      success: true,
      formats,
      qualities,
      resolutions: [
        { value: '720p', name: '720p HD', description: 'Good for social media' },
        { value: '1080p', name: '1080p Full HD', description: 'Standard high quality' },
        { value: '1440p', name: '1440p 2K', description: 'Enhanced quality' },
        { value: '4k', name: '4K Ultra HD', description: 'Maximum quality' },
        { value: 'original', name: 'Original', description: 'Keep source resolution' }
      ],
      aspectRatios: [
        { value: 'original', name: 'Original', description: 'Keep source aspect ratio' },
        { value: '16:9', name: 'Widescreen (16:9)', description: 'Standard video format' },
        { value: '9:16', name: 'Portrait (9:16)', description: 'Mobile/vertical video' },
        { value: '1:1', name: 'Square (1:1)', description: 'Instagram square format' }
      ]
    });
    
  } catch (error) {
    console.error('Get export options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get export options',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

smartClipperRouter.post('/estimate-clip', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { duration, quality, resolution } = req.body;
    
    if (!duration || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration'
      });
    }
    
    const { clipGeneration } = await import('../services/clip-generation.service');
    
    const estimate = await clipGeneration.estimateClipSize(
      duration,
      quality || 'medium',
      resolution
    );
    
    res.json({
      success: true,
      estimate: {
        duration,
        quality: quality || 'medium',
        resolution: resolution || 'original',
        estimatedSizeMB: estimate.estimatedSizeMB,
        estimatedProcessingTime: estimate.estimatedProcessingTime,
        estimatedSizeText: estimate.estimatedSizeMB < 1 
          ? `${Math.round(estimate.estimatedSizeMB * 1000)}KB`
          : `${estimate.estimatedSizeMB}MB`
      }
    });
    
  } catch (error) {
    console.error('Estimate clip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate clip details',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export { smartClipperRouter };