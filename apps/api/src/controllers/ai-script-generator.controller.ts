import { Request, Response } from 'express';
import { AIScriptGeneratorService } from '../services/ai-script-generator.service';
import { generateTTSAudio, storeAudioInfo } from '../services/tts-service';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { uploadFile, generateKey } from '../lib/s3';

interface AuthRequest extends Request {
  userId?: string;
}

interface VideoLibraryItem {
  id: string;
  title: string;
  filename: string;
  duration: number;
  thumbnailUrl?: string;
  s3Url?: string;
  createdAt: string;
}

interface NarrationRequest {
  scriptId: string;
  videoId: string;
  voice?: string;
  speed?: number;
  addSubtitles?: boolean;
}

const scriptService = new AIScriptGeneratorService();
const prisma = new PrismaClient();

export const generateScript = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] generateScript called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User ID:', req.userId);

  try {
    const { prompt, targetAudience, scriptLength, tone, format } = req.body;
    
    if (!prompt || !req.userId) {
      console.error('Missing required fields:', { prompt: !!prompt, userId: !!req.userId });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Prompt and user authentication are required'
      });
    }

    if (prompt.length < 10) {
      return res.status(400).json({ 
        error: 'Prompt too short',
        details: 'Please provide a more detailed prompt (at least 10 characters)'
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ 
        error: 'Prompt too long',
        details: 'Please limit your prompt to 2000 characters or less'
      });
    }

    console.log(`Generating script for prompt: "${prompt.substring(0, 50)}..."`);
    
    const result = await scriptService.generateScript(
      prompt,
      {
        targetAudience,
        scriptLength,
        tone,
        format
      },
      req.userId
    );

    console.log(`Script generated successfully for project ${result.projectId}`);
    console.log(`Word count: ${result.script.wordCount}, Duration: ${result.script.estimatedDuration}s`);

    const response = {
      success: true,
      projectId: result.projectId,
      script: result.script,
      message: 'Script generated successfully'
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] generateScript error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error
    });

    if (error instanceof Error && error.message.includes('API key')) {
      return res.status(503).json({ 
        error: 'Service temporarily unavailable',
        details: 'AI service is currently unavailable. Please try again later.'
      });
    }

    if (error instanceof Error && error.message.includes('quota')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        details: 'Too many requests. Please try again later.'
      });
    }

    res.status(500).json({ 
      error: 'Script generation failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const regenerateScript = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] regenerateScript called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { projectId } = req.params;
    const { tone, length, additionalInstructions } = req.body;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Regenerating script for project ${projectId}`);
    
    const script = await scriptService.regenerateScript(projectId, {
      tone,
      length,
      additionalInstructions
    });

    console.log(`Script regenerated successfully for project ${projectId}`);

    res.json({
      success: true,
      script,
      message: 'Script regenerated successfully'
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] regenerateScript error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Script project not found' });
    }

    res.status(500).json({ 
      error: 'Script regeneration failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const getUserScripts = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] getUserScripts called');
  console.log('User ID:', req.userId);

  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scripts = await scriptService.getUserScripts(req.userId);
    
    console.log(`Found ${scripts.length} script projects for user`);

    res.json({
      success: true,
      scripts,
      total: scripts.length
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] getUserScripts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scripts',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const getScriptProject = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] getScriptProject called');
  console.log('Project ID:', req.params.projectId);
  console.log('User ID:', req.userId);

  try {
    const { projectId } = req.params;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const project = await scriptService.getScriptProject(projectId, req.userId);
    
    if (!project) {
      console.log('Script project not found');
      return res.status(404).json({ error: 'Script project not found' });
    }

    console.log(`Script project found: ${project.title}`);
    console.log(`Versions: ${project.generatedScripts.length}, API calls: ${project.scriptApiUsage.length}`);

    res.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] getScriptProject error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch script project',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const updateScriptFeedback = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] updateScriptFeedback called');
  
  try {
    const { scriptId } = req.params;
    const { rating, feedback } = req.body;
    
    if (!scriptId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updatedScript = await scriptService.updateScriptFeedback(scriptId, {
      userRating: rating,
      userFeedback: feedback
    });

    console.log(`Feedback updated for script ${scriptId}`);

    res.json({
      success: true,
      message: 'Feedback updated successfully'
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] updateScriptFeedback error:', error);
    res.status(500).json({ 
      error: 'Failed to update feedback',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const deleteScriptProject = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] deleteScriptProject called');
  
  try {
    const { projectId } = req.params;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await scriptService.deleteScriptProject(projectId, req.userId);
    
    console.log(`Script project ${projectId} deleted`);

    res.json({
      success: true,
      message: 'Script project deleted successfully'
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] deleteScriptProject error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Script project not found' });
    }

    res.status(500).json({ 
      error: 'Failed to delete script project',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const getScriptTemplates = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] getScriptTemplates called');
  
  try {
    const templates = [
      {
        id: 'gameplay-story',
        name: 'Gameplay Story',
        description: 'Perfect for adding narrative to gameplay footage',
        prompt: 'Create a 10-15 second engaging story for this gameplay: [TOPIC]. Make it exciting and match the action.',
        defaultOptions: {
          tone: 'dramatic',
          format: 'gaming',
          targetAudience: 'casual',
          scriptLength: 'short'
        }
      },
      {
        id: 'mystery-story',
        name: 'Mystery Story',
        description: 'Perfect for mysterious topics, unsolved cases, or conspiracy theories',
        prompt: 'Create a mysterious and engaging script about [TOPIC]. Focus on building suspense and intrigue.',
        defaultOptions: {
          tone: 'mysterious',
          format: 'youtube',
          targetAudience: 'casual'
        }
      },
      {
        id: 'educational',
        name: 'Educational Explainer',
        description: 'Great for tutorials, how-to videos, and educational content',
        prompt: 'Explain [TOPIC] in an engaging and easy-to-understand way. Break down complex concepts into digestible points.',
        defaultOptions: {
          tone: 'professional',
          format: 'educational',
          targetAudience: 'educational'
        }
      },
      {
        id: 'viral-tiktok',
        name: 'Viral TikTok',
        description: 'Quick, punchy content designed for TikTok engagement',
        prompt: 'Create a viral TikTok script about [TOPIC]. Make it quick, engaging, and shareable.',
        defaultOptions: {
          tone: 'conversational',
          format: 'tiktok',
          targetAudience: 'casual',
          scriptLength: 'short'
        }
      },
      {
        id: 'product-marketing',
        name: 'Product Marketing',
        description: 'Promotional content that highlights benefits and drives action',
        prompt: 'Create a compelling marketing script for [TOPIC]. Focus on benefits, value proposition, and call-to-action.',
        defaultOptions: {
          tone: 'professional',
          format: 'marketing',
          targetAudience: 'marketing'
        }
      },
      {
        id: 'story-time',
        name: 'Story Time',
        description: 'Narrative-driven content perfect for personal stories or Reddit stories',
        prompt: 'Turn this into an engaging story: [TOPIC]. Make it personal, relatable, and emotionally engaging.',
        defaultOptions: {
          tone: 'conversational',
          format: 'youtube',
          targetAudience: 'casual'
        }
      }
    ];

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] getScriptTemplates error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch templates',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};


export const getVideoLibrary = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] getVideoLibrary called');
  console.log('User ID:', req.userId);

  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const libraryItems = await prisma.library.findMany({
      where: { 
        status: 'active'
      },
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
        thumbnailUrl: true,
        duration: true,
        fileSize: true,
        mimeType: true,
        category: true,
        tags: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${libraryItems.length} global library items`);

    res.json({
      success: true,
      videos: libraryItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        filename: item.title,
        duration: item.duration || 0,
        thumbnailUrl: item.thumbnailUrl,
        s3Url: item.videoUrl,
        createdAt: item.createdAt.toISOString(),
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        category: item.category,
        tags: item.tags
      }))
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] getVideoLibrary error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video library',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const generateGameplayScript = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] generateGameplayScript called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { prompt, videoId, targetAudience, tone, scriptLength, format } = req.body;
    
    if (!prompt || !videoId || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Prompt, video ID, and user authentication are required'
      });
    }

    const libraryItem = await prisma.library.findFirst({
      where: { 
        id: videoId,
        status: 'active'
      }
    });

    if (!libraryItem) {
      return res.status(404).json({ 
        error: 'Video not found',
        details: 'Selected video not found in your library'
      });
    }

    console.log(`Generating 10-15 sec script for video: ${libraryItem.title}`);
    
    const result = await scriptService.generateScript(
      `${prompt} (Create a punchy 15-45 second narration perfect for short video platforms like TikTok, Instagram Reels, or YouTube Shorts. Keep it engaging and concise.)`,
      {
        targetAudience,
        scriptLength: scriptLength || 'very-short', // Use provided length or default to very-short
        tone: tone || 'dramatic',
        format: format || 'tiktok'
      },
      req.userId
    );

    console.log(`Gameplay script generated for video ${videoId}`);

    res.status(201).json({
      success: true,
      projectId: result.projectId,
      script: result.script,
      videoId: videoId,
      videoTitle: libraryItem.title,
      message: 'Gameplay script generated successfully'
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] generateGameplayScript error:', error);
    res.status(500).json({ 
      error: 'Gameplay script generation failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const generateNarration = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] generateNarration called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { scriptId, voice, speed } = req.body;
    
    if (!scriptId || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Script ID and user authentication are required'
      });
    }

    const scriptProject = await prisma.scriptProject.findFirst({
      where: { 
        id: scriptId, 
        userId: req.userId 
      },
      include: {
        generatedScripts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!scriptProject || !scriptProject.generatedScripts.length) {
      return res.status(404).json({ 
        error: 'Script not found',
        details: 'Script project not found or no generated content available'
      });
    }

    const script = scriptProject.generatedScripts[0];
    const textToNarrate = script.content || script.hook || '';

    if (!textToNarrate) {
      return res.status(400).json({ 
        error: 'No script content',
        details: 'No text content available for narration'
      });
    }

    console.log(`Generating narration for script: "${textToNarrate.substring(0, 50)}..."`);

    try {
      console.log('[TTS] Using Fish Audio TTS service...');
      
      const ttsOptions = {
        text: textToNarrate,
        voice: {
          languageCode: 'en-US',
          name: voice || 'default',
          ssmlGender: 'MALE' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: speed || 1.0,
          pitch: 0,
        }
      };

      console.log(`[TTS] Generating audio with options:`, ttsOptions);
      
      const audioResult = await generateTTSAudio(ttsOptions);
      
      if (!audioResult.success) {
        throw new Error(audioResult.error || 'TTS generation failed');
      }

      console.log(`[TTS] Audio generated successfully: ${audioResult.duration}s (${audioResult.type})`);
      console.log(`[TTS] Audio URL: ${audioResult.audioUrl}`);

      await storeAudioInfo(
        scriptId, 
        audioResult.audioUrl!, 
        audioResult.duration!, 
        audioResult.type,
        req.userId
      );

      res.json({
        success: true,
        message: `Audio generated successfully using ${audioResult.type === 'fish-audio' ? 'Fish Audio' : 'fallback method'}`,
        audioFilename: audioResult.audioUrl!.split('/').pop(),
        audioPath: audioResult.audioUrl,
        duration: audioResult.duration,
        text: textToNarrate,
        audioType: audioResult.type
      });

    } catch (ttsError) {
      console.error('TTS Error:', ttsError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to generate narration audio',
        error: ttsError instanceof Error ? ttsError.message : 'Unknown TTS error',
        details: 'Please check your Google Cloud TTS configuration and try again'
      });
    }
  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] generateNarration error:', error);
    res.status(500).json({ 
      error: 'Narration generation failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const combineVideoWithNarration = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] combineVideoWithNarration called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { scriptId, videoId, addSubtitles } = req.body;
    
    if (!scriptId || !videoId || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields'
      });
    }

    console.log('[SCRIPT_CONTROLLER] Starting video combination process with S3 audio...');
    
    const audioInfo = await scriptService.getAudioInfo(scriptId, req.userId);
    
    if (!audioInfo || !audioInfo.audioUrl) {
      return res.status(400).json({ 
        error: 'Audio not found',
        details: 'No audio file found for this script. Please generate audio first.'
      });
    }

    console.log(`[SCRIPT_CONTROLLER] Found audio: ${audioInfo.audioUrl}`);
    console.log(`[SCRIPT_CONTROLLER] Audio duration: ${audioInfo.duration}s`);
    
    const isMockAudio = audioInfo.audioUrl.startsWith('mock://');
    if (isMockAudio) {
      console.log(`[SCRIPT_CONTROLLER] Processing with mock/fallback audio`);
    }
    
    const libraryVideo = await prisma.library.findUnique({
      where: { id: videoId }
    });

    if (!libraryVideo) {
      return res.status(404).json({ error: 'Library video not found' });
    }

    console.log('[SCRIPT_CONTROLLER] Found script and video, starting processing...');
    console.log(`[SCRIPT_CONTROLLER] Library video: ${libraryVideo.title}`);
    
    try {
      let result;
      
      if (isMockAudio) {
        console.log(`[SCRIPT_CONTROLLER] Processing video without audio overlay (mock audio)`);
        
        const libraryVideo = await prisma.library.findUnique({
          where: { id: videoId }
        });

        if (!libraryVideo) {
          return res.status(404).json({ error: 'Library video not found' });
        }

        result = {
          videoUrl: libraryVideo.videoUrl // Use the library video directly
        };
        
        console.log(`[SCRIPT_CONTROLLER] Using library video directly: ${result.videoUrl}`);
        
      } else {
        console.log(`[SCRIPT_CONTROLLER] Using S3 audio URL: ${audioInfo.audioUrl}`);
        
        result = await scriptService.prepareFinalVideo(
          req.userId,
          scriptId,
          audioInfo.audioUrl,
          audioInfo.duration,
          videoId
        );
      }
      
      console.log('[SCRIPT_CONTROLLER] Video processed and uploaded to S3:', result.videoUrl);
      
      const timestamp = Date.now();
      
      res.json({
        success: true,
        message: 'Video combined and uploaded successfully',
        outputFilename: `ai_script_video_${scriptId}_${timestamp}.mp4`,
        videoUrl: result.videoUrl,
        jobId: `job-${timestamp}`,
        status: 'completed'
      });
      
    } catch (processingError) {
      console.error('[SCRIPT_CONTROLLER] Video processing failed:', processingError);
      
      if (processingError instanceof Error && 
          (processingError.message.includes('AWS') || 
           processingError.message.includes('S3') ||
           processingError.message.includes('credentials'))) {
        
        return res.status(503).json({
          error: 'Video processing service unavailable',
          details: 'AWS S3 or video processing service is not properly configured',
          message: 'Please check your AWS credentials and S3 bucket configuration'
        });
      }
      
      return res.status(500).json({
        error: 'Failed to process video',
        details: processingError instanceof Error ? processingError.message : 'Video processing error'
      });
    }

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] combineVideoWithNarration error:', error);
    res.status(500).json({ 
      error: 'Video combination failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const getProcessingStatus = async (req: AuthRequest, res: Response) => {
  console.log('[SCRIPT_CONTROLLER] getProcessingStatus called');

  try {
    const { jobId } = req.params;
    
    if (!jobId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const job = await prisma.project.findFirst({
      where: { 
        id: jobId, 
        userId: req.userId 
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      status: job.status,
      progress: job.progress || 0,
      message: getStatusMessage(job.status),
      outputUrl: job.status === 'completed' ? job.outputPath : null
    });

  } catch (error) {
    console.error('[SCRIPT_CONTROLLER] getProcessingStatus error:', error);
    res.status(500).json({ 
      error: 'Failed to get processing status',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};


function getStatusMessage(status: string): string {
  switch (status) {
    case 'processing': return 'Combining video with narration...';
    case 'completed': return 'Your gameplay story is ready!';
    case 'failed': return 'Processing failed. Please try again.';
    default: return 'Processing...';
  }
}