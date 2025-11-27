import { Request, Response } from 'express';
import { AIScriptGeneratorService } from '../services/ai-script-generator.service';

interface AuthRequest extends Request {
  userId?: string;
}

const scriptService = new AIScriptGeneratorService();

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