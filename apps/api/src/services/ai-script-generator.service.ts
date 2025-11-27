import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma';

interface ScriptGenerationOptions {
  targetAudience?: 'casual' | 'formal' | 'educational' | 'entertainment' | 'marketing';
  scriptLength?: 'short' | 'medium' | 'long'; // 30s, 60s, 120s+
  tone?: 'dramatic' | 'conversational' | 'professional' | 'humorous' | 'mysterious';
  format?: 'tiktok' | 'youtube' | 'instagram' | 'marketing' | 'educational';
}

interface StructuredScript {
  hook: string;
  keyPoints: string[];
  conclusion: string;
  fullScript: string;
  estimatedDuration: number;
  wordCount: number;
}

export class AIScriptGeneratorService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API key is required for script generation');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    // Use Gemini Pro for enhanced script generation
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
  }

  async generateScript(
    prompt: string,
    options: ScriptGenerationOptions = {},
    userId: string
  ): Promise<{ projectId: string; script: StructuredScript }> {
    const startTime = Date.now();
    
    try {
      // Create script project in database
      const project = await prisma.scriptProject.create({
        data: {
          userId,
          title: this.generateTitle(prompt),
          originalPrompt: prompt,
          targetAudience: options.targetAudience,
          scriptLength: options.scriptLength,
          tone: options.tone,
          format: options.format,
          status: 'generating'
        }
      });

      // Build enhanced prompt with filtering
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, options);
      
      console.log(`[SCRIPT-GEN] Generating script for project ${project.id}`);
      console.log(`[SCRIPT-GEN] Enhanced prompt length: ${enhancedPrompt.length} characters`);

      // Generate script using Gemini
      const result = await this.model.generateContent(enhancedPrompt);
      const response = await result.response;
      const scriptContent = response.text();

      // Parse structured content
      const structuredScript = this.parseStructuredScript(scriptContent, options);
      
      const responseTime = Date.now() - startTime;

      // Save generated script
      const generatedScript = await prisma.generatedScript.create({
        data: {
          projectId: project.id,
          content: structuredScript.fullScript,
          structuredContent: structuredScript as any,
          hook: structuredScript.hook,
          keyPoints: structuredScript.keyPoints,
          conclusion: structuredScript.conclusion,
          wordCount: structuredScript.wordCount,
          estimatedDuration: structuredScript.estimatedDuration,
          confidence: this.calculateConfidence(structuredScript)
        }
      });

      // Log API usage
      await this.logApiUsage(
        project.id,
        'gemini-1.5-pro',
        'script-generation',
        enhancedPrompt.length,
        scriptContent.length,
        responseTime,
        true
      );

      // Update project status
      await prisma.scriptProject.update({
        where: { id: project.id },
        data: { 
          status: 'completed',
          actualCost: await this.estimateCost(enhancedPrompt.length, scriptContent.length)
        }
      });

      console.log(`[SCRIPT-GEN] Script generated successfully for project ${project.id}`);
      console.log(`[SCRIPT-GEN] Word count: ${structuredScript.wordCount}, Duration: ${structuredScript.estimatedDuration}s`);

      return {
        projectId: project.id,
        script: structuredScript
      };

    } catch (error) {
      console.error('[SCRIPT-GEN] Error generating script:', error);
      
      // Log failed API usage if we have a project
      const projects = await prisma.scriptProject.findMany({
        where: { userId, status: 'generating' },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      if (projects.length > 0) {
        await this.logApiUsage(
          projects[0].id,
          'gemini-1.5-pro',
          'script-generation',
          prompt.length,
          0,
          Date.now() - startTime,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );

        await prisma.scriptProject.update({
          where: { id: projects[0].id },
          data: { 
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      throw error;
    }
  }

  private buildEnhancedPrompt(prompt: string, options: ScriptGenerationOptions): string {
    const targetAudience = options.targetAudience || 'casual';
    const scriptLength = options.scriptLength || 'medium';
    const tone = options.tone || 'conversational';
    const format = options.format || 'youtube';

    const lengthGuide = {
      short: '30-45 seconds (75-110 words)',
      medium: '60-90 seconds (150-225 words)', 
      long: '120+ seconds (300+ words)'
    };

    const formatGuide = {
      tiktok: 'TikTok-style with quick hooks, trending language, and fast-paced content',
      youtube: 'YouTube format with strong intro, clear segments, and call-to-action',
      instagram: 'Instagram Reels style with visual cues and engaging captions',
      marketing: 'Marketing video with clear value proposition and persuasive language',
      educational: 'Educational content with structured learning points and clear explanations'
    };

    const toneGuide = {
      dramatic: 'dramatic and suspenseful language with strong emotional impact',
      conversational: 'casual, friendly tone like talking to a friend',
      professional: 'authoritative and polished business communication',
      humorous: 'light-hearted with appropriate humor and wit',
      mysterious: 'intriguing and suspenseful with question-based hooks'
    };

    return `You are an expert script writer for ${format} content. Create an engaging narration script based on this topic: "${prompt}"

REQUIREMENTS:
- Target Audience: ${targetAudience}
- Script Length: ${lengthGuide[scriptLength]}
- Tone: ${toneGuide[tone]}
- Format: ${formatGuide[format]}

STRUCTURE YOUR RESPONSE EXACTLY AS FOLLOWS:

**HOOK:**
[Write a compelling 1-2 sentence opening that immediately grabs attention and makes viewers want to keep watching]

**KEY POINTS:**
1. [First main point or key information]
2. [Second main point or key information]  
3. [Third main point or key information]
[Continue with additional points as needed]

**CONCLUSION:**
[Strong closing that reinforces the main message and includes a call-to-action appropriate for ${format}]

**FULL SCRIPT:**
[Complete narration script written in natural speaking language, ready to be read aloud. Include natural pauses with "..." and emphasize important words with ALL CAPS when appropriate for dramatic effect.]

GUIDELINES:
- Use ${tone} tone throughout
- Target ${targetAudience} audience level
- Include specific details and examples when possible
- Make it engaging and memorable
- Ensure smooth flow between sections
- Add strategic pauses for emphasis
- Include emotional triggers appropriate for the topic
- End with a strong call-to-action

Generate the script now:`;
  }

  private parseStructuredScript(content: string, options: ScriptGenerationOptions): StructuredScript {
    try {
      // Extract sections using regex patterns
      const hookMatch = content.match(/\*\*HOOK:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
      const keyPointsMatch = content.match(/\*\*KEY POINTS:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
      const conclusionMatch = content.match(/\*\*CONCLUSION:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
      const fullScriptMatch = content.match(/\*\*FULL SCRIPT:\*\*\s*([\s\S]*?)$/i);

      const hook = hookMatch ? hookMatch[1].trim() : '';
      const keyPointsText = keyPointsMatch ? keyPointsMatch[1].trim() : '';
      const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';
      const fullScript = fullScriptMatch ? fullScriptMatch[1].trim() : content;

      // Parse key points
      const keyPoints = keyPointsText
        .split(/\d+\.\s/)
        .filter(point => point.trim().length > 0)
        .map(point => point.trim());

      // Calculate metrics
      const wordCount = this.countWords(fullScript);
      const estimatedDuration = this.estimateDuration(wordCount);

      return {
        hook,
        keyPoints,
        conclusion,
        fullScript,
        wordCount,
        estimatedDuration
      };
    } catch (error) {
      console.error('[SCRIPT-GEN] Error parsing structured script:', error);
      
      // Fallback to basic parsing
      const wordCount = this.countWords(content);
      return {
        hook: content.substring(0, 100) + '...',
        keyPoints: ['Main content point'],
        conclusion: 'Thank you for watching!',
        fullScript: content,
        wordCount,
        estimatedDuration: this.estimateDuration(wordCount)
      };
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private estimateDuration(wordCount: number): number {
    // Average speaking rate is 150-160 words per minute
    return Math.ceil((wordCount / 155) * 60); // Convert to seconds
  }

  private calculateConfidence(script: StructuredScript): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on structure completeness
    if (script.hook.length > 10) confidence += 0.15;
    if (script.keyPoints.length >= 2) confidence += 0.15;
    if (script.conclusion.length > 10) confidence += 0.1;
    if (script.wordCount > 50 && script.wordCount < 500) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateTitle(prompt: string): string {
    // Generate a title from the first few words of the prompt
    const words = prompt.trim().split(/\s+/).slice(0, 6);
    let title = words.join(' ');
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'AI Generated Script';
  }

  private async estimateCost(inputLength: number, outputLength: number): Promise<number> {
    // Gemini Pro pricing (approximate)
    const inputCostPer1K = 0.00025; // $0.00025 per 1K input tokens
    const outputCostPer1K = 0.0005; // $0.0005 per 1K output tokens
    
    // Rough estimation: 4 characters per token
    const inputTokens = Math.ceil(inputLength / 4);
    const outputTokens = Math.ceil(outputLength / 4);
    
    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;
    
    return inputCost + outputCost;
  }

  private async logApiUsage(
    projectId: string,
    modelName: string,
    operationType: string,
    inputLength: number,
    outputLength: number,
    responseTimeMs: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.scriptApiUsage.create({
        data: {
          projectId,
          modelName,
          operationType,
          inputTokens: Math.ceil(inputLength / 4),
          outputTokens: Math.ceil(outputLength / 4),
          promptLength: inputLength,
          responseLength: outputLength,
          costUsd: success ? await this.estimateCost(inputLength, outputLength) : 0,
          responseTimeMs,
          success,
          errorMessage
        }
      });
    } catch (error) {
      console.error('[SCRIPT-GEN] Error logging API usage:', error);
    }
  }

  // Regenerate script with modifications
  async regenerateScript(
    projectId: string,
    modifications: {
      tone?: string;
      length?: string;
      additionalInstructions?: string;
    }
  ): Promise<StructuredScript> {
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      include: { generatedScripts: true }
    });

    if (!project) {
      throw new Error('Script project not found');
    }

    // Build modified prompt
    const modifiedPrompt = `${project.originalPrompt}

MODIFICATIONS REQUESTED:
${modifications.tone ? `- Change tone to: ${modifications.tone}` : ''}
${modifications.length ? `- Change length to: ${modifications.length}` : ''}
${modifications.additionalInstructions ? `- Additional instructions: ${modifications.additionalInstructions}` : ''}

Please regenerate the script with these modifications while maintaining the same structure.`;

    const options: ScriptGenerationOptions = {
      targetAudience: project.targetAudience as any,
      scriptLength: modifications.length as any || project.scriptLength as any,
      tone: modifications.tone as any || project.tone as any,
      format: project.format as any
    };

    const result = await this.generateScript(modifiedPrompt, options, project.userId);
    
    // Increment version number
    const maxVersion = Math.max(...project.generatedScripts.map(s => s.version), 0);
    
    await prisma.generatedScript.updateMany({
      where: { projectId },
      data: { isActive: false }
    });

    await prisma.generatedScript.create({
      data: {
        projectId,
        version: maxVersion + 1,
        content: result.script.fullScript,
        structuredContent: result.script as any,
        hook: result.script.hook,
        keyPoints: result.script.keyPoints,
        conclusion: result.script.conclusion,
        wordCount: result.script.wordCount,
        estimatedDuration: result.script.estimatedDuration,
        confidence: this.calculateConfidence(result.script),
        isActive: true
      }
    });

    return result.script;
  }

  // Get user's script projects
  async getUserScripts(userId: string): Promise<any[]> {
    return prisma.scriptProject.findMany({
      where: { userId },
      include: {
        generatedScripts: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1
        },
        _count: {
          select: { generatedScripts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get specific script project
  async getScriptProject(projectId: string, userId: string): Promise<any> {
    return prisma.scriptProject.findFirst({
      where: { id: projectId, userId },
      include: {
        generatedScripts: {
          orderBy: { version: 'desc' }
        },
        scriptApiUsage: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }

  // Update script feedback
  async updateScriptFeedback(scriptId: string, feedback: { userRating?: number; userFeedback?: string }): Promise<any> {
    return prisma.generatedScript.update({
      where: { id: scriptId },
      data: {
        userRating: feedback.userRating,
        userFeedback: feedback.userFeedback,
        updatedAt: new Date()
      }
    });
  }

  // Delete script project
  async deleteScriptProject(projectId: string, userId: string): Promise<void> {
    const project = await prisma.scriptProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Script project not found');
    }

    // Delete all related data (Prisma will handle cascading)
    await prisma.scriptProject.delete({
      where: { id: projectId }
    });
  }
}