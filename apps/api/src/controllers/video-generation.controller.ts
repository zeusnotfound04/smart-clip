import { Request, Response } from 'express';
import { z } from 'zod';

interface AuthRequest extends Request {
  userId?: string;
}
import { AIScriptGeneratorService } from '../services/ai-script-generator.service.js';

// 🎬 Video Generation Request Schema
const generateVideoSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  selectedVideoId: z.string().uuid('Invalid video ID'),
  options: z.object({
    targetAudience: z.string().optional(),
    scriptLength: z.enum(['short', 'medium', 'long']).optional(),
    tone: z.enum(['professional', 'casual', 'energetic', 'educational', 'humorous']).optional(),
    format: z.enum(['hook_content_cta', 'story_based', 'list_format', 'problem_solution', 'tutorial']).optional()
  }).optional(),
  voiceConfig: z.object({
    voice: z.string().optional(),
    speed: z.number().min(0.25).max(4.0).optional(),
    pitch: z.number().min(-20).max(20).optional()
  }).optional()
});

export class VideoGenerationController {
  private aiScriptService: AIScriptGeneratorService;

  constructor() {
    this.aiScriptService = new AIScriptGeneratorService();
  }

  // 🎬 Generate Complete Video with Narration
  generateVideo = async (req: AuthRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.log(`🎬 [VIDEO-CONTROLLER] Starting video generation request`);
      console.log(`🎬 [VIDEO-CONTROLLER] Request body:`, JSON.stringify(req.body, null, 2));
      
      // Validate request
      const validation = generateVideoSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        });
        return;
      }

      const { prompt, selectedVideoId, options, voiceConfig } = validation.data;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      console.log(`🎬 [VIDEO-CONTROLLER] Validated request for user: ${userId}`);
      console.log(`🎬 [VIDEO-CONTROLLER] Video ID: ${selectedVideoId}`);
      console.log(`🎬 [VIDEO-CONTROLLER] Prompt: "${prompt.substring(0, 50)}..."`);

      // Generate complete video
      const result = await this.aiScriptService.generateVideoWithNarration(
        prompt,
        selectedVideoId,
        options as any || {},
        userId
      );

      const totalTime = Date.now() - startTime;
      console.log(`🎉 [VIDEO-CONTROLLER] Video generation completed in ${totalTime}ms`);

      res.status(200).json({
        success: true,
        message: 'Video generated successfully',
        data: {
          projectId: result.projectId,
          script: {
            hook: result.script.hook,
            keyPoints: result.script.keyPoints,
            conclusion: result.script.conclusion,
            fullScript: result.script.fullScript,
            wordCount: result.script.wordCount,
            estimatedDuration: result.script.estimatedDuration
          },
          audio: {
            url: result.audioUrl,
            duration: result.audioDuration
          },
          video: {
            url: result.finalVideoUrl,
            duration: result.videoDuration
          }
        },
        processingTime: totalTime
      });

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [VIDEO-CONTROLLER] Video generation failed after ${totalTime}ms:`, error);

      // Determine error type and status code
      let statusCode = 500;
      let errorMessage = 'Failed to generate video';

      // Check for credit errors
      const isInsufficientCredits = 
        error.message?.toLowerCase().includes('insufficient credit') ||
        error.message?.toLowerCase().includes('out of credit') ||
        error.message?.toLowerCase().includes('not enough credit');
      
      if (isInsufficientCredits) {
        statusCode = 402;
        errorMessage = 'Insufficient Credits';
      } else if (error.message?.includes('Library video not found')) {
        statusCode = 404;
        errorMessage = 'Selected video not found in library';
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'API rate limit exceeded. Please try again later.';
      } else if (error.message?.includes('authentication') || error.message?.includes('credentials')) {
        statusCode = 503;
        errorMessage = 'Service temporarily unavailable due to configuration issues';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: isInsufficientCredits ? 'Hey! You ran out of credits. Please upgrade to remove watermark and generate videos!' : undefined,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        processingTime: totalTime
      });
    }
  };

  // 🎬 Get Video Generation Status
  getVideoStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      const project = await this.aiScriptService.getProjectById(projectId, userId);

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          projectId: project.id,
          status: project.status,
          title: project.title,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          hasError: !!project.errorMessage,
          errorMessage: project.errorMessage
        }
      });

    } catch (error: any) {
      console.error(`❌ [VIDEO-CONTROLLER] Failed to get video status:`, error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get video status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // 📚 Get Library Videos
  getLibraryVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(`📚 [VIDEO-CONTROLLER] Fetching library videos`);
      
      const videos = await this.aiScriptService.getLibraryVideos();

      res.status(200).json({
        success: true,
        message: `Found ${videos.length} library videos`,
        data: videos.map(video => ({
          id: video.id,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          category: video.category,
          tags: video.tags
        }))
      });

    } catch (error: any) {
      console.error(`❌ [VIDEO-CONTROLLER] Failed to get library videos:`, error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get library videos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // 🔥 NEW PHASE METHODS
  
  // Phase 1: Generate Script Only
  generateScript = async (req: AuthRequest, res: Response): Promise<void> => {
    const generateScriptSchema = z.object({
      prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
      projectName: z.string().optional().default('Untitled Project'),
      options: z.object({
        targetAudience: z.string().optional(),
        scriptLength: z.enum(['short', 'medium', 'long']).optional(),
        tone: z.string().optional(),
        format: z.string().optional()
      }).optional()
    });

    try {
      console.log(`📝 [SCRIPT-GENERATION] Starting script generation`);
      
      const validation = generateScriptSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        });
        return;
      }

      const { prompt, projectName, options } = validation.data;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Generate script using existing service method
      const scriptResult = await this.aiScriptService.generateScript(prompt, options as any, userId);
      
      console.log(`✅ [SCRIPT-GENERATION] Script generated successfully`);
      console.log(`📊 [SCRIPT-GENERATION] Stats: ${scriptResult.script.wordCount} words, ~${scriptResult.script.estimatedDuration}s`);
      
      res.status(200).json({
        success: true,
        projectId: scriptResult.projectId,
        script: {
          fullScript: scriptResult.script.fullScript,
          wordCount: scriptResult.script.wordCount,
          estimatedDuration: scriptResult.script.estimatedDuration,
          hook: scriptResult.script.hook || '',
          keyPoints: scriptResult.script.keyPoints || [],
          conclusion: scriptResult.script.conclusion || ''
        }
      });

    } catch (error: any) {
      console.error(`❌ [SCRIPT-GENERATION] Failed:`, error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate script',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

  // Phase 2a: Get Available Voices
  getAvailableVoices = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(`🎤 [VOICE-GENERATION] Fetching available voices`);
      
      const voices = await this.aiScriptService.getAvailableVoices();
      
      res.status(200).json({
        success: true,
        voices: voices
      });

    } catch (error: any) {
      console.error(`❌ [VOICE-GENERATION] Failed to get voices:`, error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get available voices',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Phase 2b: Generate Audio from Script
  generateAudio = async (req: AuthRequest, res: Response): Promise<void> => {
    const generateAudioSchema = z.object({
      projectId: z.string().min(1, 'Project ID is required'),
      script: z.string().min(1, 'Script is required'),
      voiceConfig: z.object({
        name: z.string(),
        referenceId: z.string().optional(),
        languageCode: z.string(),
        ssmlGender: z.enum(['MALE', 'FEMALE', 'NEUTRAL']),
        audioEncoding: z.string(),
        speed: z.number().optional(),
        pitch: z.number().optional()
      })
    });

    try {
      console.log(`🎵 [AUDIO-GENERATION] Starting audio generation`);
      
      const validation = generateAudioSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        });
        return;
      }

      const { projectId, script, voiceConfig } = validation.data;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Generate TTS audio
      const audioResult = await this.aiScriptService.generateTTSAudio(script, voiceConfig);
      
      console.log(`✅ [AUDIO-GENERATION] Audio generated successfully`);
      console.log(`📊 [AUDIO-GENERATION] Duration: ${audioResult.duration}s`);
      
      res.status(200).json({
        success: true,
        audioUrl: audioResult.audioUrl,
        audioDuration: audioResult.duration
      });

    } catch (error: any) {
      console.error(`❌ [AUDIO-GENERATION] Failed:`, error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate audio',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

  // Phase 3: Prepare Final Video (Combine Audio + Video)
  prepareFinalVideo = async (req: AuthRequest, res: Response): Promise<void> => {
    const prepareFinalSchema = z.object({
      projectId: z.string().min(1, 'Project ID is required'),
      audioUrl: z.string().url('Valid audio URL is required'),
      audioDuration: z.number().positive('Audio duration must be positive'),
      selectedVideo: z.object({
        id: z.string(),
        url: z.string().optional(),
        duration: z.number().optional()
      })
    });

    try {
      console.log(`🎬 [FINAL-VIDEO] Starting final video preparation`);
      
      const validation = prepareFinalSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        });
        return;
      }

      const { projectId, audioUrl, audioDuration, selectedVideo } = validation.data;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Prepare final video using existing service method
      const finalResult = await this.aiScriptService.prepareFinalVideo(
        userId,
        projectId,
        audioUrl,
        audioDuration,
        selectedVideo.id
      );
      
      console.log(`✅ [FINAL-VIDEO] Video prepared successfully`);
      console.log(`📊 [FINAL-VIDEO] Final video URL: ${finalResult.videoUrl}`);
      
      res.status(200).json({
        success: true,
        videoUrl: finalResult.videoUrl,
        duration: finalResult.duration
      });

    } catch (error: any) {
      console.error(`❌ [FINAL-VIDEO] Failed:`, error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to prepare final video',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
}
