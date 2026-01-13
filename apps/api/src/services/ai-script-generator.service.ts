import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma';
import { fishAudioService } from './fish-audio.service';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

interface ScriptGenerationOptions {
  targetAudience?: string;
  scriptLength?: '10s' | '15s' | '30s' | '45s' | '60s';
  tone?: 'dramatic' | 'conversational' | 'professional' | 'humorous' | 'mysterious';
  format?: string;
}

interface StructuredScript {
  hook: string;
  keyPoints: string[];
  conclusion: string;
  fullScript: string;
  estimatedDuration: number;
  wordCount: number;
}

interface VideoGenerationResult {
  projectId: string;
  script: StructuredScript;
  audioUrl?: string;
  audioDuration?: number;
  finalVideoUrl?: string;
  videoDuration?: number;
}

export class AIScriptGeneratorService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string = '';
  private static availableModels: string[] | null = null;
  private s3Client!: S3Client;

  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API key is required for script generation');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    try {
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.warn('AWS credentials not found. Video upload to S3 will not work.');
        console.warn('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
      }

      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });

      console.log('[TTS/S3] Clients initialized successfully');
      
    } catch (error) {
      console.error('[TTS/S3] Failed to initialize clients:', error);
      console.error('Make sure Google Cloud and AWS credentials are properly configured');
    }
  }

  private async ensureModelInitialized(): Promise<void> {
    if (!this.model || !this.modelName) {
      await this.initializeModel();
    }
  }

  private async initializeModel() {
    const availableModels = await this.getAvailableModels();
    
    const modelPriority = [
      'gemini-2.5-pro',          // BEST: Latest Pro with advanced reasoning and creativity
      'gemini-2.5-flash',        // Good alternative: Fast and efficient
      'gemini-2.0-flash',        // Stable fallback
      'gemini-2.5-flash-lite',   // Cost-efficient option
      'gemini-2.0-flash-exp',    // Experimental fallback
    ];
    
    let modelInitialized = false;
    
    for (const modelName of modelPriority) {
      if (!availableModels.includes(modelName)) {
        console.log(`[SCRIPT-GEN] Model ${modelName} not in available models list`);
        continue;
      }
      
      try {
        console.log(`[SCRIPT-GEN] Attempting to initialize model: ${modelName}`);
        
        this.model = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        });
        
        await this.testModel(modelName);
        
        this.modelName = modelName;
        console.log(`[SCRIPT-GEN] Successfully initialized with model: ${this.modelName}`);
        modelInitialized = true;
        break;
        
      } catch (error) {
        console.warn(`[SCRIPT-GEN] Model ${modelName} failed:`, error instanceof Error ? error.message : String(error));
        continue;
      }
    }
    
    if (!modelInitialized) {
      throw new Error(`Failed to initialize any supported Gemini model. Available models: ${availableModels.join(', ')}`);
    }
  }

  private async getAvailableModels(): Promise<string[]> {
    if (AIScriptGeneratorService.availableModels) {
      return AIScriptGeneratorService.availableModels;
    }

    console.log('[SCRIPT-GEN] Using verified working models from testing...');
    
    const verifiedWorkingModels = [
      'gemini-2.5-pro',        // Verified working - BEST for script generation
      'gemini-2.5-flash',      // Verified working - Fast and efficient  
      'gemini-2.5-flash-lite', // Verified working - Cost efficient
      'gemini-2.0-flash',      // Verified working - Stable
      'gemini-2.0-flash-exp'   // Verified working - Experimental
    ];
    
    AIScriptGeneratorService.availableModels = verifiedWorkingModels;
    console.log(`[SCRIPT-GEN] Using ${verifiedWorkingModels.length} verified models: ${verifiedWorkingModels.join(', ')}`);
    
    return verifiedWorkingModels;
  }

  private async testModel(modelName: string): Promise<void> {
    try {
      const result = await this.model.generateContent('Test');
      const response = await result.response;
      response.text(); // This will throw if the response is invalid
    } catch (error) {
      throw new Error(`Model ${modelName} failed test: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateScript(
    prompt: string,
    options: ScriptGenerationOptions = {},
    userId: string
  ): Promise<{ projectId: string; script: StructuredScript }> {
    const startTime = Date.now();
    
    try {
      await this.ensureModelInitialized();
      const project = await prisma.scriptProject.create({
        data: {
          userId,
          title: this.generateTitle(prompt),
          originalPrompt: prompt,
          scriptLength: options.scriptLength,
          tone: options.tone,
          status: 'generating'
        }
      });

      const enhancedPrompt = this.buildEnhancedPrompt(prompt, options);
      
      console.log(`[SCRIPT-GEN] Generating script for project ${project.id}`);
      console.log(`[SCRIPT-GEN] Using model: ${this.modelName}`);
      console.log(`[SCRIPT-GEN] Enhanced prompt length: ${enhancedPrompt.length} characters`);

      let result;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[SCRIPT-GEN] Attempt ${attempt}/${maxRetries} with model ${this.modelName}`);
          result = await this.model.generateContent(enhancedPrompt);
          console.log(`[SCRIPT-GEN] Successfully generated content on attempt ${attempt}`);
          break;
        } catch (error) {
          lastError = error;
          console.error(`[SCRIPT-GEN] Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
          
          if (attempt < maxRetries) {
            const delay = 1000 * attempt; // Exponential backoff
            console.log(`[SCRIPT-GEN] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!result) {
        throw lastError || new Error(`Failed to generate content after ${maxRetries} attempts`);
      }

      const response = await result.response;
      const scriptContent = response.text();
      
      console.log(`[SCRIPT-GEN] Generated script content: ${scriptContent.length} characters`);

      const structuredScript = this.parseStructuredScript(scriptContent, options);
      
      const responseTime = Date.now() - startTime;

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

      await this.logApiUsage(
        project.id,
        this.modelName,
        'script-generation',
        enhancedPrompt.length,
        scriptContent.length,
        responseTime,
        true
      );

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
      
      const projects = await prisma.scriptProject.findMany({
        where: { userId, status: 'generating' },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      if (projects.length > 0) {
        await this.logApiUsage(
          projects[0].id,
          this.modelName,
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
    const scriptLength = options.scriptLength || '30s';
    const tone = options.tone || 'conversational';

    const lengthGuide = {
      '10s': '10 seconds (25-30 words)',
      '15s': '15 seconds (35-40 words)',
      '30s': '30 seconds (75-85 words)',
      '45s': '45 seconds (110-120 words)',
      '60s': '60 seconds (150-160 words)'
    };

    const toneGuide = {
      dramatic: 'dramatic and suspenseful language with strong emotional impact',
      conversational: 'casual, friendly tone like talking to a friend',
      professional: 'authoritative and polished business communication',
      humorous: 'light-hearted with appropriate humor and wit',
      mysterious: 'intriguing and suspenseful with question-based hooks'
    };

    return `You are an expert script writer for short-form vertical video content. Create an engaging narration script based on this topic: "${prompt}"

REQUIREMENTS:
- Script Length: ${lengthGuide[scriptLength]} - THIS IS CRITICAL, DO NOT EXCEED THIS WORD COUNT
- Tone: ${toneGuide[tone]}
- Content Type: Short-form vertical video optimized for maximum engagement (TikTok, Instagram Reels, YouTube Shorts)

STRUCTURE YOUR RESPONSE EXACTLY AS FOLLOWS:

**HOOK:**
[Write a compelling 1-2 sentence opening that immediately grabs attention and makes viewers want to keep watching]

**KEY POINTS:**
1. [First main point or key information]
2. [Second main point or key information]  
3. [Third main point or key information]
[Continue with additional points as needed]

**CONCLUSION:**
[Strong closing that reinforces the main message and includes a compelling call-to-action]

**FULL SCRIPT:**
[Complete narration script written in natural speaking language, ready to be read aloud. Include natural pauses with "..." and emphasize important words with ALL CAPS when appropriate for dramatic effect.]

GUIDELINES:
- Use ${tone} tone throughout
- STRICTLY adhere to the ${lengthGuide[scriptLength]} word count limit
- Perfect for short-form vertical video content
- Include specific details and examples when possible
- Make it engaging and memorable with quick pacing
- Ensure smooth flow between sections
- Add strategic pauses for emphasis
- Include emotional triggers appropriate for the topic
- End with a strong call-to-action
- Keep sentences short and punchy for maximum impact

Generate the script now:`;
  }

  private parseStructuredScript(content: string, options: ScriptGenerationOptions): StructuredScript {
    try {
      const hookMatch = content.match(/\*\*HOOK:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
      const keyPointsMatch = content.match(/\*\*KEY POINTS:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
      const conclusionMatch = content.match(/\*\*CONCLUSION:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
      const fullScriptMatch = content.match(/\*\*FULL SCRIPT:\*\*\s*([\s\S]*?)$/i);

      const hook = hookMatch ? hookMatch[1].trim() : '';
      const keyPointsText = keyPointsMatch ? keyPointsMatch[1].trim() : '';
      const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';
      const fullScript = fullScriptMatch ? fullScriptMatch[1].trim() : content;

      const keyPoints = keyPointsText
        .split(/\d+\.\s/)
        .filter(point => point.trim().length > 0)
        .map(point => point.trim());

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
    return Math.ceil((wordCount / 155) * 60); // Convert to seconds
  }

  private calculateConfidence(script: StructuredScript): number {
    let confidence = 0.5; // Base confidence

    if (script.hook.length > 10) confidence += 0.15;
    if (script.keyPoints.length >= 2) confidence += 0.15;
    if (script.conclusion.length > 10) confidence += 0.1;
    if (script.wordCount > 50 && script.wordCount < 500) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateTitle(prompt: string): string {
    const words = prompt.trim().split(/\s+/).slice(0, 6);
    let title = words.join(' ');
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'AI Generated Script';
  }

  private async estimateCost(inputLength: number, outputLength: number): Promise<number> {
    const inputCostPer1K = 0.00025; // $0.00025 per 1K input tokens
    const outputCostPer1K = 0.0005; // $0.0005 per 1K output tokens
    
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

  async regenerateScript(
    projectId: string,
    modifications: {
      tone?: string;
      length?: string;
      additionalInstructions?: string;
    }
  ): Promise<StructuredScript> {
    await this.ensureModelInitialized();
    
    const project = await prisma.scriptProject.findUnique({
      where: { id: projectId },
      include: { generatedScripts: true }
    });

    if (!project) {
      throw new Error('Script project not found');
    }

    const modifiedPrompt = `${project.originalPrompt}

MODIFICATIONS REQUESTED:
${modifications.tone ? `- Change tone to: ${modifications.tone}` : ''}
${modifications.length ? `- Change length to: ${modifications.length}` : ''}
${modifications.additionalInstructions ? `- Additional instructions: ${modifications.additionalInstructions}` : ''}

Please regenerate the script with these modifications while maintaining the same structure.`;

    const options: ScriptGenerationOptions = {
      scriptLength: modifications.length as any || project.scriptLength as any,
      tone: modifications.tone as any || project.tone as any
    };

    const result = await this.generateScript(modifiedPrompt, options, project.userId);
    
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

  async deleteScriptProject(projectId: string, userId: string): Promise<void> {
    const project = await prisma.scriptProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Script project not found');
    }

    await prisma.scriptProject.delete({
      where: { id: projectId }
    });
  }

  async generateVideoWithNarration(
    prompt: string,
    selectedVideoId: string,
    options: ScriptGenerationOptions = {},
    userId: string,
    voiceConfig?: {
      voice?: string;
      speed?: number;
      pitch?: number;
    }
  ): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[VIDEO-GEN] Starting complete video generation for user ${userId}`);
      console.log(`[VIDEO-GEN] Selected library video: ${selectedVideoId}`);
      
      this.validateVideoGenerationRequirements();
      
      console.log(`[VIDEO-GEN] Step 1: Generating script...`);
      const scriptResult = await this.generateScript(prompt, options, userId);
      
      console.log(`[VIDEO-GEN] Step 2: Getting library video...`);
      const libraryVideo = await prisma.library.findUnique({
        where: { id: selectedVideoId }
      });
      
      if (!libraryVideo) {
        throw new Error(`Library video not found: ${selectedVideoId}`);
      }
      
      console.log(`[VIDEO-GEN] Library video found: ${libraryVideo.title} (${libraryVideo.duration}s)`);
      
      console.log(`[VIDEO-GEN] Step 3: Generating narration audio...`);
      const audioResult = await this.generateNarrationAudio(
        scriptResult.script.fullScript,
        voiceConfig
      );
      
      console.log(`[VIDEO-GEN] Audio generated: ${audioResult.duration}s duration`);
      
      console.log(`[VIDEO-GEN] Step 4: Processing video to match audio duration...`);
      const finalVideoResult = await this.processVideoWithAudio(
        libraryVideo.videoUrl,
        audioResult.audioPath,
        audioResult.duration,
        scriptResult.projectId
      );
      
      console.log(`[VIDEO-GEN] Final video created: ${finalVideoResult.finalVideoUrl}`);
      
      await prisma.scriptProject.update({
        where: { id: scriptResult.projectId },
        data: {
          status: 'completed_with_video',
          actualCost: await this.estimateCost(prompt.length, scriptResult.script.fullScript.length)
        }
      });
      
      const totalTime = Date.now() - startTime;
      console.log(`[VIDEO-GEN] Complete video generation finished in ${totalTime}ms`);
      
      return {
        projectId: scriptResult.projectId,
        script: scriptResult.script,
        audioUrl: audioResult.audioUrl,
        audioDuration: audioResult.duration,
        finalVideoUrl: finalVideoResult.finalVideoUrl,
        videoDuration: audioResult.duration // Video trimmed to match audio
      };
      
    } catch (error) {
      console.error('[VIDEO-GEN] Complete video generation failed:', error);
      throw error;
    }
  }

  private async generateNarrationAudio(
    script: string,
    voiceConfig?: { voice?: string; speed?: number; pitch?: number }
  ): Promise<{ audioPath: string; audioUrl: string; duration: number }> {
    try {
      console.log(`[TTS] Generating audio for script: "${script.substring(0, 50)}..."`);
      
      const result = await fishAudioService.generateTTS({
        text: script,
        format: 'mp3',
        mp3Bitrate: 192,
        latency: 'normal',
        model: 's1',
        speed: voiceConfig?.speed || 1.0,
        volume: voiceConfig?.pitch || 0,
        referenceId: voiceConfig?.voice || process.env.FISH_AUDIO_REFERENCE_ID,
      });

      if (!result.success || !result.audioUrl) {
        throw new Error(result.error || 'Fish Audio generation failed');
      }

      console.log(`[TTS] Audio generated successfully: ${result.duration}s, uploaded to ${result.audioUrl}`);
      
      return {
        audioPath: result.audioPath || '',
        audioUrl: result.audioUrl,
        duration: result.duration || 0
      };
      
    } catch (error) {
      console.error('[TTS] Failed to generate narration audio:', error);
      throw error;
    }
  }

  private async processVideoWithAudio(
    libraryVideoUrl: string,
    audioPath: string,
    audioDuration: number,
    projectId: string
  ): Promise<{ finalVideoUrl: string }> {
    const tempDir = path.join(process.cwd(), 'temp');
    const outputFilename = `final_video_${projectId}_${Date.now()}.mp4`;
    const outputPath = path.join(tempDir, outputFilename);
    const videoFilename = `temp_video_${uuidv4()}.mp4`;
    const videoPath = path.join(tempDir, videoFilename);
    
    try {
      console.log(`[VIDEO] Processing video with audio overlay...`);
      console.log(`[VIDEO] Library video: ${libraryVideoUrl}`);
      console.log(`[VIDEO] Target duration: ${audioDuration}s`);
      
      console.log(`[VIDEO] Downloading library video...`);
      await this.downloadFile(libraryVideoUrl, videoPath);
      
      await new Promise<void>((resolve, reject) => {
        console.log(`[FFMPEG] Starting video processing...`);
        
        ffmpeg(videoPath)
          .input(audioPath)
          .audioCodec('aac')
          .videoCodec('libx264')
          .duration(audioDuration) // Trim video to match audio duration
          .outputOptions([
            '-map 0:v:0',  // Use video from first input
            '-map 1:a:0',  // Use audio from second input
            '-shortest',   // Stop when shortest stream ends
            '-y'           // Overwrite output file
          ])
          .on('start', (commandLine: string) => {
            console.log(`[FFMPEG] Command: ${commandLine}`);
          })
          .on('progress', (progress: any) => {
            console.log(`[FFMPEG] Processing: ${Math.round(progress.percent || 0)}%`);
          })
          .on('end', () => {
            console.log(`[FFMPEG] Video processing completed`);
            resolve();
          })
          .on('error', (err: any) => {
            console.error(`[FFMPEG] Processing failed:`, err);
            reject(err);
          })
          .save(outputPath);
      });
      
      const s3Key = `final-videos/${outputFilename}`;
      const finalVideoUrl = await this.uploadToS3(outputPath, s3Key, 'video/mp4');
      
      await this.cleanupTempFiles([videoPath, audioPath, outputPath]);
      
      console.log(`[VIDEO] Final video processed and uploaded: ${finalVideoUrl}`);
      
      return { finalVideoUrl };
      
    } catch (error) {
      console.error('[VIDEO] Failed to process video with audio:', error);
      await this.cleanupTempFiles([videoPath, audioPath, outputPath]).catch((cleanupErr) =>
        console.warn('[VIDEO] Failed to cleanup temp files after error:', cleanupErr)
      );
      throw error;
    }
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          resolve(Math.ceil(duration));
        }
      });
    });
  }

  private async uploadToS3(filePath: string, s3Key: string, contentType: string): Promise<string> {
    try {
      console.log(`[S3] Uploading file to S3...`);
      console.log(`[S3] File path: ${filePath}`);
      console.log(`[S3] S3 key: ${s3Key}`);
      console.log(`[S3] Content type: ${contentType}`);
      
      const fileContent = await fs.readFile(filePath);
      
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      
      const region = process.env.AWS_REGION || 'ap-south-1';
      const bucketName = process.env.AWS_S3_BUCKET;
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
      
      console.log(`[S3] File uploaded successfully: ${publicUrl}`);
      
      return publicUrl;
      
    } catch (error) {
      console.error('[S3] Failed to upload file:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('NoSuchBucket')) {
          throw new Error(`S3 bucket '${process.env.AWS_S3_BUCKET}' does not exist or is not accessible.`);
        }
        if (error.message.includes('AccessDenied')) {
          throw new Error('S3 access denied. Please check your AWS credentials and bucket permissions.');
        }
        if (error.message.includes('InvalidAccessKeyId')) {
          throw new Error('Invalid AWS access key ID. Please check your AWS_ACCESS_KEY_ID environment variable.');
        }
      }
      
      throw error;
    }
  }

  private async downloadFile(url: string, destinationPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    await fs.writeFile(destinationPath, Buffer.from(buffer));
  }

  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);
          console.log(`Cleaned up temp file: ${filePath}`);
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp file ${filePath}:`, error);
      }
    }
  }

  private validateVideoGenerationRequirements(): void {
    const missingEnvVars: string[] = [];
    
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      missingEnvVars.push('GOOGLE_CLOUD_PROJECT_ID');
    }
    
    if (!process.env.AWS_ACCESS_KEY_ID) {
      missingEnvVars.push('AWS_ACCESS_KEY_ID');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      missingEnvVars.push('AWS_SECRET_ACCESS_KEY');
    }
    if (!process.env.AWS_S3_BUCKET) {
      missingEnvVars.push('AWS_S3_BUCKET');
    }
    
    if (missingEnvVars.length > 0) {
      throw new Error(
        `Video generation requires the following environment variables: ${missingEnvVars.join(', ')}. ` +
        `Please configure these in your environment to enable complete video generation with audio narration.`
      );
    }
    
    console.log(`[VALIDATION] All video generation requirements satisfied`);
  }

  async getLibraryVideos() {
    try {
      console.log(`[SERVICE] Fetching library videos`);
      
      const videos = await prisma.library.findMany({
        where: {
          status: 'active'
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          duration: true,
          category: true,
          tags: true,
          createdAt: true
        }
      });

      console.log(`[SERVICE] Found ${videos.length} library videos`);
      return videos;
      
    } catch (error) {
      console.error('[SERVICE] Failed to get library videos:', error);
      throw error;
    }
  }

  async getProjectById(projectId: string, userId: string) {
    try {
      console.log(`[SERVICE] Fetching project ${projectId} for user ${userId}`);
      
      const project = await prisma.scriptProject.findFirst({
        where: { 
          id: projectId,
          userId 
        },
        include: {
          generatedScripts: {
            where: { isActive: true },
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      });

      if (!project) {
        console.log(`[SERVICE] Project ${projectId} not found for user ${userId}`);
        return null;
      }

      console.log(`[SERVICE] Found project: ${project.title}`);
      return project;
      
    } catch (error) {
      console.error('[SERVICE] Failed to get project:', error);
      throw error;
    }
  }


  async getAvailableVoices() {
    try {
      console.log(`[SERVICE] Fetching available Fish Audio TTS voices`);
      
      const voices = [
        {
          name: 'Adam',
          referenceId: '728f6ff2240d49308e8137ffe66008e2',
          languageCode: 'en-US',
          ssmlGender: 'MALE',
          naturalSampleRateHertz: 44100,
          displayName: 'Adam',
          category: 'fish-audio'
        },
        {
          name: 'Grandma',
          referenceId: '26de115f3ab4476bbc529906d4675a6d',
          languageCode: 'en-US',
          ssmlGender: 'FEMALE',
          naturalSampleRateHertz: 44100,
          displayName: 'Grandma',
          category: 'fish-audio'
        },
        {
          name: 'Khai Le',
          referenceId: '1936333080804be19655c6749b2ae7b2',
          languageCode: 'en-US',
          ssmlGender: 'MALE',
          naturalSampleRateHertz: 44100,
          displayName: 'Khai Le',
          category: 'fish-audio'
        },
        {
          name: 'Mr.puzzles',
          referenceId: '036ad8aaa86b4bf286058d6533cb723a',
          languageCode: 'en-US',
          ssmlGender: 'MALE',
          naturalSampleRateHertz: 44100,
          displayName: 'Mr.puzzles',
          category: 'fish-audio'
        },
        {
          name: 'Adrian',
          referenceId: 'bf322df2096a46f18c579d0baa36f41d',
          languageCode: 'en-US',
          ssmlGender: 'MALE',
          naturalSampleRateHertz: 44100,
          displayName: 'Adrian',
          category: 'fish-audio'
        },
        {
          name: 'Sonic',
          referenceId: 'e1ccd2d156104873a651bd3916951e8a',
          languageCode: 'en-US',
          ssmlGender: 'MALE',
          naturalSampleRateHertz: 44100,
          displayName: 'Sonic',
          category: 'fish-audio'
        },
        {
          name: 'WNBA',
          referenceId: 'fb7ec16ca51a45a5a4db881244d7990a',
          languageCode: 'en-US',
          ssmlGender: 'FEMALE',
          naturalSampleRateHertz: 44100,
          displayName: 'WNBA',
          category: 'fish-audio'
        }
      ];
      
      console.log(`[SERVICE] Found ${voices.length} Fish Audio voices`);
      return voices;
      
    } catch (error) {
      console.error('[SERVICE] Failed to get available voices:', error);
      throw error;
    }
  }

  async storeAudioInfo(scriptId: string, audioUrl: string, duration: number, voiceConfig: any, userId: string) {
    try {
      console.log(`[SERVICE] Storing audio info for script ${scriptId}`);
      
      let videoProject = await prisma.videoGenerationProject.findFirst({
        where: { 
          scriptProjectId: scriptId,
          userId: userId
        }
      });

      if (videoProject) {
        await prisma.videoGenerationProject.update({
          where: { id: videoProject.id },
          data: {
            audioUrl: audioUrl,
            audioDuration: duration,
            selectedVoice: voiceConfig.name,
            voiceSpeed: voiceConfig.speed,
            voicePitch: voiceConfig.pitch,
            voiceStatus: 'completed',
            currentPhase: 3, // Move to video selection phase
            overallStatus: 'video_selection',
            updatedAt: new Date()
          }
        });
      } else {
        const scriptProject = await prisma.scriptProject.findUnique({
          where: { id: scriptId }
        });

        if (scriptProject) {
          await prisma.videoGenerationProject.create({
            data: {
              userId: userId,
              title: scriptProject.title,
              originalPrompt: scriptProject.originalPrompt,
              scriptLength: scriptProject.scriptLength,
              tone: scriptProject.tone,
              format: scriptProject.format,
              scriptProjectId: scriptId,
              scriptStatus: 'completed',
              audioUrl: audioUrl,
              audioDuration: duration,
              selectedVoice: voiceConfig.name,
              voiceSpeed: voiceConfig.speed,
              voicePitch: voiceConfig.pitch,
              voiceStatus: 'completed',
              currentPhase: 3,
              overallStatus: 'video_selection'
            }
          });
        }
      }
      
      console.log(`[SERVICE] Audio info stored successfully in VideoGenerationProject`);
      
    } catch (error) {
      console.error('[SERVICE] Failed to store audio info:', error);
    }
  }

  async getAudioInfo(scriptId: string, userId: string) {
    try {
      console.log(`[SERVICE] Getting audio info for script ${scriptId}`);
      
      const videoProject = await prisma.videoGenerationProject.findFirst({
        where: { 
          scriptProjectId: scriptId,
          userId: userId
        },
        select: {
          audioUrl: true,
          audioDuration: true,
          selectedVoice: true,
          voiceSpeed: true,
          voicePitch: true
        }
      });

      if (videoProject && videoProject.audioUrl) {
        console.log(`[SERVICE] Found audio info: ${videoProject.audioUrl} (${videoProject.audioDuration}s)`);
        return {
          audioUrl: videoProject.audioUrl,
          duration: videoProject.audioDuration || 30,
          voiceConfig: {
            name: videoProject.selectedVoice,
            speed: videoProject.voiceSpeed,
            pitch: videoProject.voicePitch
          }
        };
      }
      
      console.log(`[SERVICE] No audio info found for script ${scriptId}`);
      return null;
      
    } catch (error) {
      console.error('[SERVICE] Failed to get audio info:', error);
      return null;
    }
  }

  async generateTTSAudio(script: string, voiceConfig: any) {
    try {
      console.log(`[SERVICE] Generating TTS audio with Fish Audio`);
      console.log(`[SERVICE] Voice: ${voiceConfig.name}`);
      console.log(`[SERVICE] Reference ID: ${voiceConfig.referenceId}`);
      console.log(`[SERVICE] Script length: ${script.length} characters`);
      
      const result = await fishAudioService.generateTTS({
        text: script,
        format: 'mp3',
        mp3Bitrate: 192,
        latency: 'normal',
        model: 's1',
        speed: voiceConfig.speed || 1.0,
        volume: voiceConfig.pitch || 0,
        referenceId: voiceConfig.referenceId || voiceConfig.name || process.env.FISH_AUDIO_REFERENCE_ID,
      });

      if (!result.success || !result.audioUrl) {
        throw new Error(result.error || 'Fish Audio generation failed');
      }

      console.log(`[TTS] Audio generated successfully: ${result.duration}s, uploaded to ${result.audioUrl}`);
      
      return {
        audioUrl: result.audioUrl,
        duration: result.duration || 0
      };
      
    } catch (error) {
      console.error('[SERVICE] Failed to generate TTS audio:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('AWS')) {
          throw new Error('AWS S3 upload failed. Please check your AWS credentials and bucket configuration.');
        }
        if (error.message.includes('ffprobe') || error.message.includes('ffmpeg')) {
          throw new Error('Audio processing failed. Please ensure FFmpeg is installed and properly configured.');
        }
      }
      
      throw error;
    }
  }

  private async generateFallbackAudio(script: string, voiceConfig: any) {
    console.log(`[FALLBACK] Generating fallback audio for ${script.length} character script`);
    
    const wordsPerMinute = 150;
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.max(5, Math.ceil((wordCount / wordsPerMinute) * 60));
    
    console.log(`[FALLBACK] Estimated duration: ${estimatedDuration}s for ${wordCount} words`);

    const fileName = `narrations/fallback_audio_${uuidv4()}.mp3`;
    const audioPath = path.join(process.cwd(), 'temp', `fallback_${uuidv4()}.mp3`);
    
    const tempDir = path.dirname(audioPath);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(`anullsrc=channel_layout=stereo:sample_rate=44100`)
          .inputFormat('lavfi')
          .audioCodec('mp3')
          .duration(estimatedDuration)
          .audioFilters('volume=0.01') // Very quiet
          .on('end', () => {
            console.log(`[FALLBACK] Audio file created: ${estimatedDuration}s`);
            resolve();
          })
          .on('error', (err: any) => {
            console.error('[FALLBACK] FFmpeg error:', err);
            reject(err);
          })
          .save(audioPath);
      });

      const audioUrl = await this.uploadToS3(audioPath, fileName, 'audio/mpeg');
      
      await fs.unlink(audioPath).catch(console.error);
      
      console.log(`[FALLBACK] Fallback audio uploaded to S3: ${audioUrl}`);
      
      return {
        audioUrl,
        duration: estimatedDuration
      };

    } catch (ffmpegError) {
      console.error('[FALLBACK] FFmpeg fallback failed:', ffmpegError);
      
      return {
        audioUrl: `mock://fallback-audio-${Date.now()}.mp3`,
        duration: estimatedDuration
      };
    }
  }

  async prepareFinalVideo(
    userId: string,
    projectId: string,
    audioUrl: string,
    audioDuration: number,
    selectedVideoId: string
  ) {
    try {
      console.log(`[SERVICE] Preparing final video`);
      console.log(`[SERVICE] Project: ${projectId}`);
      console.log(`[SERVICE] Audio duration: ${audioDuration}s`);
      console.log(`[SERVICE] Selected video: ${selectedVideoId}`);
      
      const libraryVideo = await prisma.library.findUnique({
        where: { id: selectedVideoId }
      });

      if (!libraryVideo || !libraryVideo.videoUrl) {
        throw new Error(`Library video ${selectedVideoId} not found or has no URL`);
      }

      console.log(`[SERVICE] Using library video: ${libraryVideo.title}`);
      
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const audioFilename = `temp_audio_${uuidv4()}.mp3`;
      const audioPath = path.join(tempDir, audioFilename);
      
      console.log(`[SERVICE] Downloading audio from: ${audioUrl}`);
      await this.downloadFile(audioUrl, audioPath);
      
      const result = await this.processVideoWithAudio(
        libraryVideo.videoUrl,
        audioPath,
        audioDuration,
        projectId
      );
      
      console.log(`[SERVICE] Final video prepared successfully`);
      
      return {
        videoUrl: result.finalVideoUrl,
        duration: audioDuration
      };
      
    } catch (error) {
      console.error('[SERVICE] Failed to prepare final video:', error);
      throw error;
    }
  }

  async combineVideoWithExistingAudio(
    libraryVideoUrl: string,
    audioPath: string,
    audioDuration: number,
    projectId: string
  ): Promise<{ finalVideoUrl: string }> {
    try {
      console.log(`[SERVICE] Combining video with existing audio...`);
      console.log(`[SERVICE] Video URL: ${libraryVideoUrl}`);
      console.log(`[SERVICE] Audio Path: ${audioPath}`);
      console.log(`[SERVICE] Duration: ${audioDuration}s`);
      
      if (!libraryVideoUrl || !audioPath || !audioDuration || !projectId) {
        throw new Error('Missing required parameters for video combination');
      }
      
      if (!fsSync.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }
      
      const result = await this.processVideoWithAudio(
        libraryVideoUrl,
        audioPath,
        audioDuration,
        projectId
      );
      
      return result;
      
    } catch (error) {
      console.error('[SERVICE] Failed to combine video with existing audio:', error);
      throw error;
    }
  }
}