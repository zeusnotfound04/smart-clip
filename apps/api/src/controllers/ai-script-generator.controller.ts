import { Request, Response } from 'express';
import { AIScriptGeneratorService } from '../services/ai-script-generator.service';
import { PrismaClient } from '@prisma/client';
import * as textToSpeech from '@google-cloud/text-to-speech';
import * as path from 'path';
import * as fs from 'fs';

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
const ttsClient = new textToSpeech.TextToSpeechClient();

export const generateScript = async (req: AuthRequest, res: Response) => {
  console.log('🤖 [SCRIPT_CONTROLLER] generateScript called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 User ID:', req.userId);

  try {
    const { prompt, targetAudience, scriptLength, tone, format } = req.body;
    
    if (!prompt || !req.userId) {
      console.error('❌ Missing required fields:', { prompt: !!prompt, userId: !!req.userId });
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

    console.log(`🎬 Generating script for prompt: "${prompt.substring(0, 50)}..."`);
    
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

    console.log(`✅ Script generated successfully for project ${result.projectId}`);
    console.log(`📊 Word count: ${result.script.wordCount}, Duration: ${result.script.estimatedDuration}s`);

    const response = {
      success: true,
      projectId: result.projectId,
      script: result.script,
      message: 'Script generated successfully'
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] generateScript error:', error);
    console.error('🔍 Error details:', {
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
  console.log('🔄 [SCRIPT_CONTROLLER] regenerateScript called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { projectId } = req.params;
    const { tone, length, additionalInstructions } = req.body;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`🔄 Regenerating script for project ${projectId}`);
    
    const script = await scriptService.regenerateScript(projectId, {
      tone,
      length,
      additionalInstructions
    });

    console.log(`✅ Script regenerated successfully for project ${projectId}`);

    res.json({
      success: true,
      script,
      message: 'Script regenerated successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] regenerateScript error:', error);
    
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
  console.log('📋 [SCRIPT_CONTROLLER] getUserScripts called');
  console.log('👤 User ID:', req.userId);

  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const scripts = await scriptService.getUserScripts(req.userId);
    
    console.log(`📊 Found ${scripts.length} script projects for user`);

    res.json({
      success: true,
      scripts,
      total: scripts.length
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] getUserScripts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scripts',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const getScriptProject = async (req: AuthRequest, res: Response) => {
  console.log('🔍 [SCRIPT_CONTROLLER] getScriptProject called');
  console.log('📋 Project ID:', req.params.projectId);
  console.log('👤 User ID:', req.userId);

  try {
    const { projectId } = req.params;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const project = await scriptService.getScriptProject(projectId, req.userId);
    
    if (!project) {
      console.log('❌ Script project not found');
      return res.status(404).json({ error: 'Script project not found' });
    }

    console.log(`✅ Script project found: ${project.title}`);
    console.log(`📊 Versions: ${project.generatedScripts.length}, API calls: ${project.scriptApiUsage.length}`);

    res.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] getScriptProject error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch script project',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const updateScriptFeedback = async (req: AuthRequest, res: Response) => {
  console.log('📝 [SCRIPT_CONTROLLER] updateScriptFeedback called');
  
  try {
    const { scriptId } = req.params;
    const { rating, feedback } = req.body;
    
    if (!scriptId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update the generated script with user feedback
    const updatedScript = await scriptService.updateScriptFeedback(scriptId, {
      userRating: rating,
      userFeedback: feedback
    });

    console.log(`✅ Feedback updated for script ${scriptId}`);

    res.json({
      success: true,
      message: 'Feedback updated successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] updateScriptFeedback error:', error);
    res.status(500).json({ 
      error: 'Failed to update feedback',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const deleteScriptProject = async (req: AuthRequest, res: Response) => {
  console.log('🗑️ [SCRIPT_CONTROLLER] deleteScriptProject called');
  
  try {
    const { projectId } = req.params;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await scriptService.deleteScriptProject(projectId, req.userId);
    
    console.log(`✅ Script project ${projectId} deleted`);

    res.json({
      success: true,
      message: 'Script project deleted successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] deleteScriptProject error:', error);
    
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
  console.log('📋 [SCRIPT_CONTROLLER] getScriptTemplates called');
  
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
    console.error('❌ [SCRIPT_CONTROLLER] getScriptTemplates error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch templates',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

// New endpoints for video library and narration workflow

export const getVideoLibrary = async (req: AuthRequest, res: Response) => {
  console.log('📹 [SCRIPT_CONTROLLER] getVideoLibrary called');
  console.log('👤 User ID:', req.userId);

  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const libraryItems = await prisma.library.findMany({
      where: { 
        userId: req.userId,
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

    console.log(`📊 Found ${libraryItems.length} library items for user`);

    res.json({
      success: true,
      videos: libraryItems.map(item => ({
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
    console.error('❌ [SCRIPT_CONTROLLER] getVideoLibrary error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video library',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const generateGameplayScript = async (req: AuthRequest, res: Response) => {
  console.log('🎮 [SCRIPT_CONTROLLER] generateGameplayScript called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { prompt, videoId, targetAudience, tone, scriptLength, format } = req.body;
    
    if (!prompt || !videoId || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Prompt, video ID, and user authentication are required'
      });
    }

    // Verify library item exists and belongs to user
    const libraryItem = await prisma.library.findFirst({
      where: { 
        id: videoId, 
        userId: req.userId,
        status: 'active'
      }
    });

    if (!libraryItem) {
      return res.status(404).json({ 
        error: 'Video not found',
        details: 'Selected video not found in your library'
      });
    }

    console.log(`🎬 Generating 10-15 sec script for video: ${libraryItem.title}`);
    
    // Generate ultra-short script specifically for gameplay (0-45 seconds max)
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

    console.log(`✅ Gameplay script generated for video ${videoId}`);

    res.status(201).json({
      success: true,
      projectId: result.projectId,
      script: result.script,
      videoId: videoId,
      videoTitle: libraryItem.title,
      message: 'Gameplay script generated successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] generateGameplayScript error:', error);
    res.status(500).json({ 
      error: 'Gameplay script generation failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const generateNarration = async (req: AuthRequest, res: Response) => {
  console.log('🎙️ [SCRIPT_CONTROLLER] generateNarration called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { scriptId, voice, speed } = req.body;
    
    if (!scriptId || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Script ID and user authentication are required'
      });
    }

    // Get the script content
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

    console.log(`🎙️ Generating narration for script: "${textToNarrate.substring(0, 50)}..."`);

    // Configure Text-to-Speech request
    const request = {
      input: { text: textToNarrate },
      voice: { 
        languageCode: 'en-US', 
        name: voice || 'en-US-Neural2-J',  // Default to a dramatic voice
        ssmlGender: 'MALE' as const
      },
      audioConfig: { 
        audioEncoding: 'MP3' as const,
        speakingRate: speed || 1.0,
        pitch: 0,
        effectsProfileId: ['telephony-class-application']
      }
    };

    // Generate the narration
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content generated');
    }

    // Save audio file
    const audioFilename = `narration_${scriptId}_${Date.now()}.mp3`;
    const audioPath = path.join(process.cwd(), 'uploads', 'narrations', audioFilename);
    
    // Ensure directory exists
    const audioDir = path.dirname(audioPath);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    fs.writeFileSync(audioPath, response.audioContent);

    // Store narration info in structured content
    const updatedContent = {
      ...script.structuredContent as any,
      narration: {
        audioPath: audioPath,
        voice: voice || 'en-US-Neural2-J',
        speed: speed || 1.0,
        filename: audioFilename
      }
    };
    
    await prisma.generatedScript.update({
      where: { id: script.id },
      data: {
        structuredContent: updatedContent
      }
    });

    console.log(`✅ Narration generated and saved: ${audioFilename}`);

    res.json({
      success: true,
      audioPath: audioPath,
      audioFilename: audioFilename,
      duration: Math.ceil(textToNarrate.length / 15), // Rough estimate
      message: 'Narration generated successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] generateNarration error:', error);
    res.status(500).json({ 
      error: 'Narration generation failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const combineVideoWithNarration = async (req: AuthRequest, res: Response) => {
  console.log('🎬 [SCRIPT_CONTROLLER] combineVideoWithNarration called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { scriptId, videoId, addSubtitles } = req.body;
    
    if (!scriptId || !videoId || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields'
      });
    }

    // Get script project with narration
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
      return res.status(404).json({ error: 'Script not found' });
    }

    const script = scriptProject.generatedScripts[0];
    
    const narrationInfo = (script.structuredContent as any)?.narration;
    if (!narrationInfo?.audioPath) {
      return res.status(400).json({ 
        error: 'No narration available',
        details: 'Please generate narration first'
      });
    }

    // Get library item
    const libraryItem = await prisma.library.findFirst({
      where: { 
        id: videoId, 
        userId: req.userId,
        status: 'active'
      }
    });

    if (!libraryItem || !libraryItem.videoUrl) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Create a processing job for video + narration combination
    const outputFilename = `gameplay_story_${Date.now()}.mp4`;
    
    // This would typically be handled by a background job queue
    // For now, we'll create a placeholder response
    
    console.log(`🎬 Creating combined video: ${outputFilename}`);
    console.log(`📹 Video: ${libraryItem.title}`);
    console.log(`🎙️ Narration: ${narrationInfo.audioPath}`);
    console.log(`📝 Subtitles: ${addSubtitles ? 'Yes' : 'No'}`);

    // Create a processing record
    const processingJob = await prisma.project.create({
      data: {
        name: `Gameplay Story: ${libraryItem.title}`,
        type: 'ai-script-generator',
        status: 'processing',
        userId: req.userId,
        config: {
          scriptId: scriptId,
          videoId: videoId,
          addSubtitles: addSubtitles,
          outputFilename: outputFilename
        }
      }
    });

    res.json({
      success: true,
      jobId: processingJob.id,
      outputFilename: outputFilename,
      estimatedTime: '2-3 minutes',
      message: 'Video processing started. You will be notified when complete.',
      nextSteps: addSubtitles ? 'Subtitles will be added automatically' : 'No subtitles will be added'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] combineVideoWithNarration error:', error);
    res.status(500).json({ 
      error: 'Video combination failed',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const getProcessingStatus = async (req: AuthRequest, res: Response) => {
  console.log('📊 [SCRIPT_CONTROLLER] getProcessingStatus called');

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
    console.error('❌ [SCRIPT_CONTROLLER] getProcessingStatus error:', error);
    res.status(500).json({ 
      error: 'Failed to get processing status',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const addToLibrary = async (req: AuthRequest, res: Response) => {
  console.log('📚 [SCRIPT_CONTROLLER] addToLibrary called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { title, description, videoUrl, thumbnailUrl, duration, fileSize, mimeType, category, tags } = req.body;
    
    if (!title || !videoUrl || !req.userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Title, video URL, and user authentication are required'
      });
    }

    const libraryItem = await prisma.library.create({
      data: {
        userId: req.userId,
        title,
        description: description || null,
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration || null,
        fileSize: fileSize || null,
        mimeType: mimeType || 'video/mp4',
        category: category || 'gameplay',
        tags: tags || [],
        isPublic: false,
        uploadSource: 'upload',
        status: 'active'
      }
    });

    console.log(`✅ Added video to library: ${title}`);

    res.status(201).json({
      success: true,
      libraryItem: {
        id: libraryItem.id,
        title: libraryItem.title,
        description: libraryItem.description,
        videoUrl: libraryItem.videoUrl,
        thumbnailUrl: libraryItem.thumbnailUrl,
        duration: libraryItem.duration,
        category: libraryItem.category,
        tags: libraryItem.tags
      },
      message: 'Video added to library successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] addToLibrary error:', error);
    res.status(500).json({ 
      error: 'Failed to add video to library',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const updateLibraryItem = async (req: AuthRequest, res: Response) => {
  console.log('✏️ [SCRIPT_CONTROLLER] updateLibraryItem called');

  try {
    const { libraryId } = req.params;
    const { title, description, category, tags } = req.body;
    
    if (!libraryId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify ownership
    const existingItem = await prisma.library.findFirst({
      where: { 
        id: libraryId, 
        userId: req.userId 
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Library item not found' });
    }

    const updatedItem = await prisma.library.update({
      where: { id: libraryId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(tags && { tags })
      }
    });

    console.log(`✅ Updated library item: ${updatedItem.title}`);

    res.json({
      success: true,
      libraryItem: updatedItem,
      message: 'Library item updated successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] updateLibraryItem error:', error);
    res.status(500).json({ 
      error: 'Failed to update library item',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
};

export const deleteLibraryItem = async (req: AuthRequest, res: Response) => {
  console.log('🗑️ [SCRIPT_CONTROLLER] deleteLibraryItem called');

  try {
    const { libraryId } = req.params;
    
    if (!libraryId || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify ownership
    const existingItem = await prisma.library.findFirst({
      where: { 
        id: libraryId, 
        userId: req.userId 
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Library item not found' });
    }

    // Soft delete by updating status
    await prisma.library.update({
      where: { id: libraryId },
      data: { status: 'deleted' }
    });

    console.log(`✅ Deleted library item: ${existingItem.title}`);

    res.json({
      success: true,
      message: 'Library item deleted successfully'
    });

  } catch (error) {
    console.error('❌ [SCRIPT_CONTROLLER] deleteLibraryItem error:', error);
    res.status(500).json({ 
      error: 'Failed to delete library item',
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