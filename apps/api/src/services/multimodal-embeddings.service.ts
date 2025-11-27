import { GoogleAuth } from 'google-auth-library';
import { prisma } from '../lib/prisma';

interface EmbeddingAnalysisConfig {
  contentType: string;
  highlightPrototypes: string[];
  similarityThreshold: number;
  maxEmbeddingRequests: number;
}

interface EmbeddingResult {
  segmentId: string;
  embeddingScore: number;
  similarityScores: Array<{
    prototype: string;
    similarity: number;
  }>;
  interestingnessScore: number;
  viralityScore: number;
}

interface MultimodalEmbeddingResponse {
  embedding: number[];
}

export class GoogleMultimodalEmbeddingsService {
  private auth?: GoogleAuth;
  private apiEndpoint?: string;
  private useMockData: boolean;

  constructor() {
    this.useMockData = process.env.USE_MOCK_GEMINI === 'true' || true; // Default to true for now
    
    if (!this.useMockData) {
      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      this.apiEndpoint = 'https://aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/multimodalembedding@001';
    }
  }

  async analyzeSegmentsWithEmbeddings(
    segments: Array<{
      id: string;
      startTime: number;
      endTime: number;
      videoPath: string;
      proScore: number;
      highlightType: string;
    }>,
    config: EmbeddingAnalysisConfig,
    projectId: string
  ): Promise<EmbeddingResult[]> {
    console.log(`[${projectId}] Starting multimodal embeddings analysis for ${segments.length} segments`);

    try {
      if (this.useMockData) {
        console.log(`[${projectId}] Using mock embeddings analysis for development testing`);
        return this.generateMockEmbeddingResults(segments, config, projectId);
      }

      const prototypes = this.getHighlightPrototypes(config.contentType);
      const prototypeEmbeddings = await this.getPrototypeEmbeddings(prototypes, projectId);
      
      const results: EmbeddingResult[] = [];

      for (const segment of segments.slice(0, config.maxEmbeddingRequests)) {
        console.log(`[${projectId}] Processing embeddings for segment ${segment.id} (${segment.startTime}s-${segment.endTime}s)`);
        
        const segmentEmbedding = await this.getSegmentEmbedding(segment, projectId);
        const similarityScores = this.calculateSimilarityScores(segmentEmbedding, prototypeEmbeddings);
        
        const embeddingScore = this.calculateEmbeddingScore(similarityScores, segment.proScore);
        const interestingnessScore = this.calculateInterestingnessScore(similarityScores, segment.highlightType);
        const viralityScore = this.calculateViralityScore(similarityScores, segment.highlightType);

        results.push({
          segmentId: segment.id,
          embeddingScore,
          similarityScores,
          interestingnessScore,
          viralityScore
        });

        await this.logEmbeddingUsage(projectId, segment.id, segmentEmbedding.length);
      }

      console.log(`[${projectId}] Embeddings analysis completed for ${results.length} segments`);
      return results;

    } catch (error) {
      console.error(`[${projectId}] Embeddings analysis failed:`, error);
      throw error;
    }
  }

  private getHighlightPrototypes(contentType: string): string[] {
    const prototypes = {
      gaming: [
        'epic gaming moment with incredible skill display and crowd cheering',
        'hilarious gaming fail with funny reaction and commentary',
        'clutch play under pressure with intense music and excitement',
        'surprising plot twist or unexpected game event',
        'achievement unlock or rare accomplishment celebration',
        'competitive gaming highlight reel moment',
        'viral gaming meme or trending moment'
      ],
      
      podcast: [
        'insightful revelation with passionate explanation and engaged discussion',
        'hilarious comedy moment with natural laughter and wit',
        'heated debate with compelling arguments and emotional intensity',
        'surprising confession or personal story revelation',
        'expert knowledge sharing with clear explanations',
        'viral podcast clip trending on social media',
        'thought-provoking insight that changes perspectives'
      ],
      
      vlog: [
        'authentic emotional moment with genuine reaction and relatability',
        'beautiful travel or lifestyle content with stunning visuals',
        'funny daily life situation with natural humor',
        'inspiring personal growth or achievement celebration',
        'unexpected adventure or spontaneous experience',
        'viral vlog moment perfect for social sharing',
        'heartwarming human connection or relationship moment'
      ],
      
      tutorial: [
        'clear educational explanation with visual demonstration',
        'impressive before and after transformation reveal',
        'helpful tip or hack that solves common problems',
        'step-by-step technique demonstration with results',
        'expert knowledge sharing with practical applications',
        'viral educational content perfect for learning',
        'satisfying completion or successful outcome reveal'
      ]
    };

    return prototypes[contentType as keyof typeof prototypes] || prototypes.gaming;
  }

  private async getPrototypeEmbeddings(prototypes: string[], projectId: string): Promise<Map<string, number[]>> {
    const embeddings = new Map<string, number[]>();

    for (const prototype of prototypes) {
      try {
        const embedding = await this.getTextEmbedding(prototype, projectId);
        embeddings.set(prototype, embedding);
      } catch (error) {
        console.error(`[${projectId}] Failed to get prototype embedding for "${prototype}":`, error);
      }
    }

    return embeddings;
  }

  private async getSegmentEmbedding(
    segment: { videoPath: string; startTime: number; endTime: number },
    projectId: string
  ): Promise<number[]> {
    try {
      const videoClipData = await this.extractVideoClipData(segment);
      const response = await this.callEmbeddingAPI({
        instances: [{
          video: {
            bytesBase64Encoded: videoClipData
          }
        }]
      });

      return response.predictions[0].videoEmbedding || [];
    } catch (error) {
      console.error(`[${projectId}] Failed to get segment embedding:`, error);
      return [];
    }
  }

  private async getTextEmbedding(text: string, projectId: string): Promise<number[]> {
    try {
      const response = await this.callEmbeddingAPI({
        instances: [{
          text: text
        }]
      });

      return response.predictions[0].textEmbedding || [];
    } catch (error) {
      console.error(`[${projectId}] Failed to get text embedding:`, error);
      return [];
    }
  }

  private async callEmbeddingAPI(payload: any): Promise<any> {
    if (!this.auth || !this.apiEndpoint) {
      throw new Error('Authentication or API endpoint not initialized for embeddings service');
    }
    
    const authClient = await this.auth.getClient();
    const accessToken = await authClient.getAccessToken();

    const response = await fetch(`${this.apiEndpoint}:predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Embedding API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private calculateSimilarityScores(
    segmentEmbedding: number[],
    prototypeEmbeddings: Map<string, number[]>
  ): Array<{ prototype: string; similarity: number }> {
    const similarities: Array<{ prototype: string; similarity: number }> = [];

    for (const [prototype, prototypeEmbedding] of prototypeEmbeddings) {
      const similarity = this.cosineSimilarity(segmentEmbedding, prototypeEmbedding);
      similarities.push({ prototype, similarity });
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private calculateEmbeddingScore(
    similarities: Array<{ prototype: string; similarity: number }>,
    proScore: number
  ): number {
    const maxSimilarity = similarities[0]?.similarity || 0;
    const avgTopSimilarities = similarities
      .slice(0, 3)
      .reduce((sum, s) => sum + s.similarity, 0) / 3;
    
    // Combine Pro score with embedding similarities (weighted 60/40)
    const embeddingComponent = Math.max(maxSimilarity, avgTopSimilarities) * 100;
    const finalScore = Math.round(proScore * 0.6 + embeddingComponent * 0.4);
    
    return Math.min(100, Math.max(0, finalScore));
  }

  private calculateInterestingnessScore(
    similarities: Array<{ prototype: string; similarity: number }>,
    highlightType: string
  ): number {
    // Look for prototypes that indicate general interest/engagement
    const interestKeywords = ['epic', 'incredible', 'amazing', 'insightful', 'compelling'];
    
    let interestScore = 0;
    for (const sim of similarities) {
      const hasInterestKeyword = interestKeywords.some(keyword => 
        sim.prototype.toLowerCase().includes(keyword)
      );
      if (hasInterestKeyword) {
        interestScore = Math.max(interestScore, sim.similarity);
      }
    }

    return Math.round(interestScore * 100);
  }

  private calculateViralityScore(
    similarities: Array<{ prototype: string; similarity: number }>,
    highlightType: string
  ): number {
    // Look for prototypes that indicate viral potential
    const viralKeywords = ['viral', 'trending', 'social', 'hilarious', 'shocking', 'epic'];
    
    let viralScore = 0;
    for (const sim of similarities) {
      const hasViralKeyword = viralKeywords.some(keyword => 
        sim.prototype.toLowerCase().includes(keyword)
      );
      if (hasViralKeyword) {
        viralScore = Math.max(viralScore, sim.similarity);
      }
    }

    // Boost score for certain highlight types
    const viralTypes = ['funny', 'epic_moment', 'surprising', 'skillful'];
    const typeBoost = viralTypes.includes(highlightType) ? 1.2 : 1.0;
    
    return Math.round(viralScore * 100 * typeBoost);
  }

  private async extractVideoClipData(segment: {
    videoPath: string;
    startTime: number;
    endTime: number;
  }): Promise<string> {
    // This would use FFmpeg to extract the specific video segment
    // For now, return mock data
    return Buffer.from('mock-video-segment-data').toString('base64');
  }

  private async logEmbeddingUsage(
    projectId: string,
    segmentId: string,
    embeddingDimensions: number
  ): Promise<void> {
    try {
      await prisma.geminiApiUsage.create({
        data: {
          projectId,
          modelName: 'multimodalembedding@001',
          operationType: 'segment-embedding',
          inputTokens: embeddingDimensions,
          outputTokens: embeddingDimensions,
          costUsd: 0.0001, // Estimate: $0.0001 per embedding
          success: true
        }
      });
    } catch (error) {
      console.error('Failed to log embedding usage:', error);
    }
  }

  async enhanceSegmentsWithEmbeddings(
    projectId: string,
    segments: any[],
    contentType: string
  ): Promise<void> {
    console.log(`[${projectId}] Enhancing ${segments.length} segments with embeddings`);

    const config: EmbeddingAnalysisConfig = {
      contentType,
      highlightPrototypes: this.getHighlightPrototypes(contentType),
      similarityThreshold: 0.7,
      maxEmbeddingRequests: Math.min(segments.length, 10) // Limit for cost control
    };

    const embeddingResults = await this.analyzeSegmentsWithEmbeddings(
      segments.map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        videoPath: s.videoPath,
        proScore: s.proScore,
        highlightType: s.highlightType
      })),
      config,
      projectId
    );

    // Update segments with embedding scores
    for (const result of embeddingResults) {
      await prisma.highlightSegment.update({
        where: { id: result.segmentId },
        data: {
          embeddingScore: result.embeddingScore,
          finalScore: result.embeddingScore, // Use enhanced score as final
          updatedAt: new Date()
        }
      });
    }

    console.log(`[${projectId}] Successfully enhanced segments with embedding scores`);
  }

  private generateMockEmbeddingResults(
    segments: Array<{
      id: string;
      startTime: number;
      endTime: number;
      videoPath: string;
      proScore: number;
      highlightType: string;
    }>,
    config: EmbeddingAnalysisConfig,
    projectId: string
  ): EmbeddingResult[] {
    return segments.map(segment => {
      // Generate realistic similarity scores based on highlight type and content type
      const mockSimilarities = config.highlightPrototypes.map(prototype => ({
        prototype,
        similarity: this.getMockSimilarity(segment.highlightType, prototype, config.contentType)
      }));

      // Calculate enhanced scores based on Pro score and mock similarities
      const maxSimilarity = Math.max(...mockSimilarities.map(s => s.similarity));
      const embeddingScore = Math.min(100, segment.proScore + (maxSimilarity * 15)); // Boost by similarity
      
      return {
        segmentId: segment.id,
        embeddingScore,
        similarityScores: mockSimilarities,
        interestingnessScore: Math.random() * 0.3 + 0.7, // 0.7-1.0
        viralityScore: Math.random() * 0.4 + 0.6 // 0.6-1.0
      };
    });
  }

  private getMockSimilarity(highlightType: string, prototype: string, contentType: string): number {
    // Create realistic similarity mappings based on content relationships
    const similarityMatrix: { [key: string]: { [key: string]: number } } = {
      educational: {
        'educational_moment': 0.9,
        'skill_demonstration': 0.7,
        'key_insight': 0.8,
        'problem_solving': 0.6,
        'before_after': 0.5
      },
      funny: {
        'comedic_timing': 0.9,
        'unexpected_reaction': 0.8,
        'humorous_fail': 0.7,
        'witty_comment': 0.6,
        'funny_interaction': 0.8
      },
      epic_moment: {
        'high_intensity': 0.9,
        'achievement_unlock': 0.8,
        'clutch_play': 0.9,
        'spectacular_skill': 0.8,
        'dramatic_moment': 0.7
      },
      emotional: {
        'genuine_reaction': 0.9,
        'heartfelt_story': 0.8,
        'personal_moment': 0.9,
        'touching_scene': 0.7,
        'authentic_emotion': 0.8
      }
    };

    const typeMatrix = similarityMatrix[highlightType] || {};
    const baseSimilarity = typeMatrix[prototype] || 0.3;
    
    // Add some randomness and content type bonus
    const randomVariation = (Math.random() - 0.5) * 0.2; // ±0.1 variation
    const contentBonus = contentType === 'tutorial' && prototype.includes('educational') ? 0.1 : 0;
    
    return Math.max(0.1, Math.min(1.0, baseSimilarity + randomVariation + contentBonus));
  }
}

export const multimodalEmbeddings = new GoogleMultimodalEmbeddingsService();