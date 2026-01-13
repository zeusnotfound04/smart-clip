import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma';
import { downloadFile } from '../lib/s3';
import { promises as fs } from 'fs';

interface VideoAnalysisConfig {
  contentType: string;
  chunkDuration: number;
  minClipLength: number;
  maxClipLength: number;
  maxSegments: number;
  minimumConfidence: number;
}

interface FlashAnalysisResult {
  segments: Array<{
    startTime: number;
    endTime: number;
    score: number;
    reasoning: string;
    confidence: number;
    highlightType: string;
  }>;
  totalProcessingTime: number;
  tokensUsed: number;
  costEstimate: number;
}

interface ProAnalysisResult {
  refinedSegments: Array<{
    startTime: number;
    endTime: number;
    score: number;
    reasoning: string;
    confidence: number;
    highlightType: string;
    classification: string;
    contentTags: string[];
    suggestedAdjustments: {
      startAdjustment: number;
      endAdjustment: number;
      reasoning: string;
    };
  }>;
  totalProcessingTime: number;
  tokensUsed: number;
  costEstimate: number;
}

export class GeminiVideoAnalysisService {
  private genAI: GoogleGenerativeAI;
  private flashModel: any;
  private proModel: any;
  private useMockData: boolean;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.flashModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    this.proModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-pro-exp' });
    this.useMockData = process.env.USE_MOCK_GEMINI === 'true' || true; // Default to true for now
  }

  async analyzeVideoWithFlash(
    videoPath: string,
    config: VideoAnalysisConfig,
    projectId: string
  ): Promise<FlashAnalysisResult> {
    console.log(`[${projectId}] Starting Gemini Flash analysis for content type: ${config.contentType}`);
    const startTime = Date.now();

    try {
      if (this.useMockData) {
        console.log(`[${projectId}] Using mock analysis for development testing`);
        
        const mockSegments = this.generateMockSegments(config);
        const processingTime = Date.now() - startTime;

        await this.logApiUsage(projectId, 'gemini-2.0-flash-exp', 'mock-analysis', {
          inputTokens: 100,
          outputTokens: 200,
          videoDurationSeconds: config.chunkDuration,
          success: true
        });

        console.log(`[${projectId}] Mock analysis completed: ${mockSegments.length} segments found in ${processingTime}ms`);

        return {
          segments: mockSegments.slice(0, config.maxSegments),
          totalProcessingTime: processingTime,
          tokensUsed: 300,
          costEstimate: 0.001
        };
      }

      console.log(`[${projectId}] Using real Gemini analysis`);
      
      const prompt = this.buildFlashPrompt(config);
      const videoChunks = await this.createVideoChunks(videoPath, config.chunkDuration);
      
      const allSegments = [];
      let totalTokensUsed = 0;

      for (let i = 0; i < videoChunks.length; i++) {
        const chunk = videoChunks[i];
        console.log(`[${projectId}] Analyzing chunk ${i + 1}/${videoChunks.length} (${chunk.startTime}s-${chunk.endTime}s)`);

        const result = await this.flashModel.generateContent([
          {
            inlineData: {
              mimeType: 'video/mp4',
              data: chunk.videoData
            }
          },
          prompt
        ]);

        const response = result.response;
        const chunkSegments = this.parseFlashResponse(response.text(), chunk.startTime);
        
        allSegments.push(...chunkSegments);
        totalTokensUsed += this.estimateTokenUsage(response.text(), chunk.duration);

        await this.logApiUsage(projectId, 'gemini-2.0-flash-exp', 'chunk-analysis', {
          inputTokens: this.estimateInputTokens(chunk.duration),
          outputTokens: response.text().length / 4,
          videoDurationSeconds: chunk.duration,
          success: true
        });
      }

      const processingTime = Date.now() - startTime;
      const costEstimate = this.calculateFlashCost(totalTokensUsed, videoChunks.length);

      console.log(`[${projectId}] Flash analysis completed: ${allSegments.length} segments found in ${processingTime}ms`);

      return {
        segments: allSegments.slice(0, config.maxSegments * 2),
        totalProcessingTime: processingTime,
        tokensUsed: totalTokensUsed,
        costEstimate
      };

    } catch (error) {
      console.error(`[${projectId}] Flash analysis failed:`, error);
      await this.logApiUsage(projectId, 'gemini-2.0-flash-exp', 'chunk-analysis', {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private generateMockSegments(config: VideoAnalysisConfig): Array<{
    startTime: number;
    endTime: number;
    score: number;
    reasoning: string;
    confidence: number;
    highlightType: string;
  }> {
    const segments = [];
    
    const segmentCount = Math.min(config.maxSegments + 2, 5); // Generate a few extra for Pro to choose from
    const videoDuration = config.chunkDuration || 300; // Assume 5 minutes if not specified
    
    const contentTypeTemplates = {
      gaming: [
        { type: 'epic_moment', reason: 'Incredible clutch play with amazing reaction' },
        { type: 'skillful', reason: 'Masterful technique demonstration' },
        { type: 'funny', reason: 'Hilarious reaction to unexpected game event' },
        { type: 'achievement', reason: 'Epic achievement unlock moment' },
        { type: 'fail', reason: 'Spectacular fail with great reaction' }
      ],
      tutorial: [
        { type: 'educational', reason: 'Key concept explanation with visual demonstration' },
        { type: 'educational', reason: 'Important technique being taught step-by-step' },
        { type: 'educational', reason: 'Before and after comparison showing results' },
        { type: 'tip', reason: 'Expert tip that saves time and effort' },
        { type: 'demonstration', reason: 'Perfect execution of difficult technique' }
      ],
      podcast: [
        { type: 'emotional', reason: 'Engaging personal story with emotional depth' },
        { type: 'surprising', reason: 'Controversial topic discussion with strong opinions' },
        { type: 'educational', reason: 'Expert insights on complex topic' },
        { type: 'funny', reason: 'Hilarious anecdote that had everyone laughing' },
        { type: 'revelation', reason: 'Shocking revelation about industry secrets' }
      ],
      vlog: [
        { type: 'emotional', reason: 'Genuine emotional reaction to beautiful scenery' },
        { type: 'funny', reason: 'Spontaneous funny moment with friends' },
        { type: 'surprising', reason: 'Unexpected encounter during travel' },
        { type: 'adventure', reason: 'Thrilling adventure activity' },
        { type: 'authentic', reason: 'Raw and authentic life moment' }
      ]
    };

    const templates = contentTypeTemplates[config.contentType as keyof typeof contentTypeTemplates] || contentTypeTemplates.gaming;
    
    for (let i = 0; i < Math.min(segmentCount, templates.length); i++) {
      const template = templates[i];
      
      const minDuration = Math.max(config.minClipLength, 10); // At least 10 seconds
      const maxDuration = Math.min(config.maxClipLength, 60); // At most 60 seconds
      const duration = Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;
      
      const maxStartTime = Math.max(0, videoDuration - duration - 10); // Leave some buffer
      const startTime = Math.floor(Math.random() * maxStartTime);
      const endTime = startTime + duration;
      
      segments.push({
        startTime,
        endTime,
        score: Math.floor(Math.random() * 25 + 70), // 70-95 score range
        reasoning: template.reason,
        confidence: Math.random() * 0.25 + 0.75, // 0.75-1.0 confidence range
        highlightType: template.type
      });
    }

    return segments.sort((a, b) => a.startTime - b.startTime);
  }

  async refineSegmentsWithPro(
    flashSegments: FlashAnalysisResult['segments'],
    videoPath: string,
    config: VideoAnalysisConfig,
    projectId: string
  ): Promise<ProAnalysisResult> {
    console.log(`[${projectId}] Starting Gemini Pro refinement for ${flashSegments.length} segments`);
    const startTime = Date.now();

    try {
      if (this.useMockData) {
        console.log(`[${projectId}] Using mock Pro refinement for development testing`);
        
        const refinedSegments = this.generateMockRefinedSegments(flashSegments, config);
        const processingTime = Date.now() - startTime;

        await this.logApiUsage(projectId, 'gemini-2.0-pro-exp', 'mock-refinement', {
          inputTokens: flashSegments.length * 50,
          outputTokens: refinedSegments.length * 100,
          success: true
        });

        console.log(`[${projectId}] Mock Pro refinement completed: ${refinedSegments.length} final segments in ${processingTime}ms`);

        return {
          refinedSegments,
          totalProcessingTime: processingTime,
          tokensUsed: 400,
          costEstimate: 0.004
        };
      }

      console.log(`[${projectId}] Using real Gemini Pro analysis`);
      
      const topCandidates = flashSegments
        .sort((a, b) => b.score - a.score)
        .slice(0, config.maxSegments * 1.5); // Allow some extras for Pro to choose from

      const prompt = this.buildProPrompt(config, topCandidates);
      
      const result = await this.proModel.generateContent([
        {
          inlineData: {
            mimeType: 'video/mp4',
            data: await this.getVideoData(videoPath)
          }
        },
        prompt
      ]);

      const response = result.response;
      const refinedSegments = this.parseProResponse(response.text(), config);
      
      const processingTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokenUsage(response.text(), 0);
      const costEstimate = this.calculateProCost(tokensUsed);

      await this.logApiUsage(projectId, 'gemini-2.0-pro-exp', 'segment-refinement', {
        inputTokens: topCandidates.length * 100,
        outputTokens: response.text().length / 4,
        success: true
      });

      console.log(`[${projectId}] Pro refinement completed: ${refinedSegments.length} final segments in ${processingTime}ms`);

      return {
        refinedSegments,
        totalProcessingTime: processingTime,
        tokensUsed,
        costEstimate
      };

    } catch (error) {
      console.error(`[${projectId}] Pro refinement failed:`, error);
      await this.logApiUsage(projectId, 'gemini-2.0-pro-exp', 'segment-refinement', {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private buildFlashPrompt(config: VideoAnalysisConfig): string {
    const contentTypePrompts = {
      gaming: `
        Analyze this gaming video segment for highlight-worthy moments. Look for:
        - Epic kills, clutch plays, skill displays
        - Funny reactions, rage moments, unexpected events  
        - Achievement unlocks, rare occurrences
        - Intense action sequences with high energy audio
        - Player reactions to wins/losses/surprises
        
        Focus on moments with high emotional intensity, exciting gameplay, and entertaining commentary.`,
      
      podcast: `
        Analyze this podcast/interview segment for engaging moments. Look for:
        - Insightful revelations, key takeaways
        - Funny exchanges, witty banter, humorous stories
        - Heated debates, passionate arguments  
        - Emotional moments, personal stories
        - Surprising statements, controversial topics
        
        Focus on conversational peaks with engaging dialogue and meaningful content.`,
      
      vlog: `
        Analyze this vlog segment for captivating moments. Look for:
        - Emotional reactions, genuine expressions
        - Beautiful scenery, interesting activities
        - Social interactions, meeting people
        - Unexpected events, spontaneous moments
        - Personal revelations, life updates
        
        Focus on authentic, relatable moments with visual interest and emotional engagement.`,
      
      tutorial: `
        Analyze this tutorial segment for educational highlights. Look for:
        - Key explanations of important concepts
        - Demonstration of techniques or skills
        - Before/after comparisons, results reveals
        - Problem-solving moments, troubleshooting
        - Tips, tricks, and best practices
        
        Focus on instructional value and clear demonstrations of learning points.`
    };

    const basePrompt = contentTypePrompts[config.contentType as keyof typeof contentTypePrompts] || contentTypePrompts.gaming;

    return `${basePrompt}

    For each potential highlight moment you find, return a JSON object with this exact structure:
    {
      "segments": [
        {
          "startTime": 15.5,
          "endTime": 32.1,
          "score": 85,
          "reasoning": "High energy gaming moment with excellent player reaction to clutch play",
          "confidence": 0.92,
          "highlightType": "epic_moment"
        }
      ]
    }

    Requirements:
    - Segment length between ${config.minClipLength}-${config.maxClipLength} seconds
    - Score: 0-100 based on excitement/engagement level
    - Confidence: 0.0-1.0 how sure you are this is highlight-worthy
    - Highlight types: epic_moment, funny, emotional, skillful, educational, surprising
    - Only include segments scoring 60+ with confidence 0.6+
    - Ensure clean start/end points (avoid mid-sentence cuts for speech)
    - Maximum ${Math.floor(config.maxSegments * 1.5)} segments per chunk

    Return only valid JSON, no additional text.`;
  }

  private buildProPrompt(config: VideoAnalysisConfig, candidates: any[]): string {
    const candidatesList = candidates.map(c => 
      `${c.startTime}s-${c.endTime}s (Score: ${c.score}, Type: ${c.highlightType}): ${c.reasoning}`
    ).join('\n');

    return `You are an expert video editor refining highlight selections. Review these candidate segments and create the final ${config.maxSegments} best highlights:

    CANDIDATE SEGMENTS:
    ${candidatesList}

    Your tasks:
    1. Select the absolute best ${config.maxSegments} segments
    2. Adjust timing for perfect comedic/dramatic effect
    3. Ensure no overlaps or redundancy
    4. Optimize clip boundaries for natural flow
    5. Classify each segment precisely
    6. Add relevant content tags

    For content type "${config.contentType}", prioritize segments that would perform best as short-form social media content.

    Return JSON with this exact structure:
    {
      "refinedSegments": [
        {
          "startTime": 15.2,
          "endTime": 31.8,
          "score": 92,
          "reasoning": "Perfect comedic timing with audience buildup and punchline delivery",
          "confidence": 0.95,
          "highlightType": "funny",
          "classification": "comedy_gold",
          "contentTags": ["humor", "reaction", "unexpected"],
          "suggestedAdjustments": {
            "startAdjustment": -0.3,
            "endAdjustment": 0.7,
            "reasoning": "Added slight padding for better context and punchline delivery"
          }
        }
      ]
    }

    Classifications: viral_potential, comedy_gold, epic_gaming, educational_key, emotional_peak, skillful_display
    Tags: Choose from: humor, action, skill, education, emotion, surprise, reaction, achievement, fail, clutch

    Return only valid JSON, no additional text.`;
  }

  private parseFlashResponse(response: string, chunkStartTime: number): any[] {
    try {
      const parsed = JSON.parse(response);
      return (parsed.segments || []).map((segment: any) => ({
        ...segment,
        startTime: segment.startTime + chunkStartTime,
        endTime: segment.endTime + chunkStartTime
      }));
    } catch (error) {
      console.error('Failed to parse Flash response:', error);
      return [];
    }
  }

  private generateMockRefinedSegments(flashSegments: any[], config: VideoAnalysisConfig): any[] {
    const topSegments = flashSegments
      .sort((a, b) => b.score - a.score)
      .slice(0, config.maxSegments);
    
    return topSegments.map((segment, index) => ({
      startTime: segment.startTime,
      endTime: segment.endTime,
      score: Math.min(95, segment.score + Math.floor(Math.random() * 10)), // Boost score slightly
      reasoning: `Refined: ${segment.reasoning} - Enhanced for maximum engagement`,
      confidence: Math.min(1.0, segment.confidence + 0.1), // Boost confidence
      highlightType: segment.highlightType,
      classification: this.getClassification(segment.highlightType),
      contentTags: this.getContentTags(segment.highlightType, config.contentType),
      suggestedAdjustments: {
        startAdjustment: Math.random() * 2 - 1, // -1 to +1 seconds
        endAdjustment: Math.random() * 2 - 1,
        reasoning: 'Optimized timing for better narrative flow and engagement'
      }
    }));
  }

  private getClassification(highlightType: string): string {
    const classifications: { [key: string]: string } = {
      epic_moment: 'viral_potential',
      funny: 'comedy_gold',
      skillful: 'skillful_display',
      educational: 'educational_key',
      emotional: 'emotional_peak',
      surprising: 'viral_potential',
      achievement: 'epic_gaming',
      fail: 'comedy_gold',
      tip: 'educational_key',
      demonstration: 'skillful_display',
      revelation: 'viral_potential',
      adventure: 'epic_gaming',
      authentic: 'emotional_peak'
    };
    return classifications[highlightType] || 'viral_potential';
  }

  private getContentTags(highlightType: string, contentType: string): string[] {
    const baseTags: { [key: string]: string[] } = {
      epic_moment: ['action', 'achievement', 'reaction'],
      funny: ['humor', 'reaction', 'entertainment'],
      skillful: ['skill', 'technique', 'mastery'],
      educational: ['education', 'learning', 'insight'],
      emotional: ['emotion', 'authentic', 'personal'],
      surprising: ['surprise', 'unexpected', 'shock'],
      achievement: ['achievement', 'success', 'milestone'],
      fail: ['humor', 'fail', 'reaction'],
      tip: ['education', 'tip', 'helpful'],
      demonstration: ['skill', 'technique', 'demonstration'],
      revelation: ['surprise', 'revelation', 'insight'],
      adventure: ['adventure', 'excitement', 'thrill'],
      authentic: ['authentic', 'real', 'genuine']
    };
    
    const tags = baseTags[highlightType] || ['entertainment'];
    
    if (contentType === 'gaming') tags.push('gaming');
    else if (contentType === 'tutorial') tags.push('tutorial');
    else if (contentType === 'podcast') tags.push('podcast');
    else if (contentType === 'vlog') tags.push('vlog');
    
    return tags.slice(0, 3); // Limit to 3 tags
  }

  private parseProResponse(response: string, config: VideoAnalysisConfig): any[] {
    try {
      const parsed = JSON.parse(response);
      return parsed.refinedSegments || [];
    } catch (error) {
      console.error('Failed to parse Pro response:', error);
      return [];
    }
  }

  private async createVideoChunks(videoPath: string, chunkDuration: number): Promise<any[]> {
    try {
      const videoData = await this.getVideoData(videoPath);
      
      return [
        {
          startTime: 0,
          endTime: chunkDuration,
          duration: chunkDuration,
          videoData: videoData
        }
      ];
    } catch (error) {
      console.error('Failed to create video chunks:', error);
      throw error;
    }
  }

  private async getVideoData(videoPath: string): Promise<string> {
    try {
      let videoBuffer: Buffer;
      
      if (videoPath.startsWith('videos/')) {
        videoBuffer = await downloadFile(videoPath);
      } else {
        videoBuffer = await fs.readFile(videoPath);
      }
      
      return videoBuffer.toString('base64');
    } catch (error) {
      console.error('Failed to get video data:', error);
      throw error;
    }
  }

  private estimateTokenUsage(text: string, videoDuration: number): number {
    return Math.ceil(text.length / 4) + Math.ceil(videoDuration * 10); // Rough estimate
  }

  private estimateInputTokens(videoDuration: number): number {
    return Math.ceil(videoDuration * 15); // Video input token estimation
  }

  private calculateFlashCost(tokensUsed: number, chunkCount: number): number {
    return (tokensUsed / 1000) * 0.001;
  }

  private calculateProCost(tokensUsed: number): number {
    return (tokensUsed / 1000) * 0.01;
  }

  private async logApiUsage(projectId: string, modelName: string, operationType: string, data: any): Promise<void> {
    try {
      await prisma.geminiApiUsage.create({
        data: {
          projectId,
          modelName,
          operationType,
          inputTokens: data.inputTokens || null,
          outputTokens: data.outputTokens || null,
          videoDurationSeconds: data.videoDurationSeconds || null,
          costUsd: data.costEstimate || null,
          responseTimeMs: data.responseTime || null,
          success: data.success,
          errorMessage: data.errorMessage || null
        }
      });
    } catch (error) {
      console.error('Failed to log API usage:', error);
    }
  }
}

export const geminiVideoAnalysis = new GeminiVideoAnalysisService();