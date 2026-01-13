import { prisma } from '../lib/prisma';

interface SegmentScoreFactors {
  geminiFlashScore: number;
  geminiProScore: number;
  embeddingScore?: number;
  audioEnergyScore: number;
  confidenceScore: number;
  contentTypeWeight: number;
  durationOptimalityScore: number;
  silenceRatioScore: number;
  sceneChangeScore?: number;
}

interface ScoreWeights {
  geminiPro: number;
  geminiFlash: number;
  embedding: number;
  audioEnergy: number;
  confidence: number;
  duration: number;
  silence: number;
  sceneChange: number;
}

interface ScoringConfig {
  contentType: string;
  weights: ScoreWeights;
  penalties: {
    lowConfidence: number;
    poorDuration: number;
    highSilence: number;
  };
  bonuses: {
    perfectDuration: number;
    highConfidence: number;
    multiModal: number;
  };
}

export class SegmentScoringService {
  private defaultWeights: Record<string, ScoreWeights> = {
    gaming: {
      geminiPro: 0.4,
      geminiFlash: 0.2,
      embedding: 0.15,
      audioEnergy: 0.1,
      confidence: 0.1,
      duration: 0.025,
      silence: 0.02,
      sceneChange: 0.005
    },
    podcast: {
      geminiPro: 0.45,
      geminiFlash: 0.25,
      embedding: 0.15,
      audioEnergy: 0.05,
      confidence: 0.08,
      duration: 0.015,
      silence: 0.005,
      sceneChange: 0.0
    },
    vlog: {
      geminiPro: 0.4,
      geminiFlash: 0.2,
      embedding: 0.2,
      audioEnergy: 0.08,
      confidence: 0.09,
      duration: 0.02,
      silence: 0.01,
      sceneChange: 0.0
    },
    tutorial: {
      geminiPro: 0.5,
      geminiFlash: 0.2,
      embedding: 0.15,
      audioEnergy: 0.05,
      confidence: 0.08,
      duration: 0.015,
      silence: 0.005,
      sceneChange: 0.0
    }
  };

  async scoreSegments(projectId: string): Promise<void> {
    console.log(`Starting segment scoring for project ${projectId}`);

    try {
      const project = await prisma.smartClipperProject.findUnique({
        where: { id: projectId },
        include: {
          highlightSegments: true,
          video: true
        }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const contentConfig = await prisma.contentTypeConfig.findUnique({
        where: { type: project.contentType }
      });

      if (!contentConfig) {
        throw new Error(`Content type config not found for ${project.contentType}`);
      }

      const scoringConfig = this.buildScoringConfig(project.contentType, contentConfig);
      
      console.log(`Scoring ${project.highlightSegments.length} segments for ${project.contentType} content`);

      for (const segment of project.highlightSegments) {
        const finalScore = await this.calculateFinalScore(segment, scoringConfig, project);
        const qualityGrade = this.calculateQualityGrade(finalScore, segment.confidenceLevel);
        
        await prisma.highlightSegment.update({
          where: { id: segment.id },
          data: {
            finalScore: Math.round(finalScore),
            updatedAt: new Date()
          }
        });

        console.log(`Segment ${segment.id}: ${Math.round(finalScore)} (${qualityGrade})`);
      }

      await this.rankAndFilterSegments(projectId, contentConfig.maxSegments);
      
      console.log(`Segment scoring completed for project ${projectId}`);

    } catch (error) {
      console.error(`Segment scoring failed for project ${projectId}:`, error);
      throw error;
    }
  }

  private async calculateFinalScore(
    segment: any,
    config: ScoringConfig,
    project: any
  ): Promise<number> {
    const factors = this.extractScoreFactors(segment, project, config);
    
    let finalScore = 0;

    finalScore += (factors.geminiProScore * config.weights.geminiPro);
    finalScore += (factors.geminiFlashScore * config.weights.geminiFlash);
    
    if (factors.embeddingScore !== undefined) {
      finalScore += (factors.embeddingScore * config.weights.embedding);
    }

    finalScore += (factors.audioEnergyScore * config.weights.audioEnergy);
    finalScore += (factors.confidenceScore * config.weights.confidence);
    finalScore += (factors.durationOptimalityScore * config.weights.duration);
    finalScore += (factors.silenceRatioScore * config.weights.silence);
    
    if (factors.sceneChangeScore !== undefined) {
      finalScore += (factors.sceneChangeScore * config.weights.sceneChange);
    }

    finalScore = this.applyBonusesAndPenalties(finalScore, factors, config);

    return Math.max(0, Math.min(100, finalScore));
  }

  private extractScoreFactors(
    segment: any,
    project: any,
    config: ScoringConfig
  ): SegmentScoreFactors {
    const duration = segment.endTime - segment.startTime;
    const contentConfig = this.getContentConfig(config.contentType);
    
    return {
      geminiFlashScore: segment.flashScore || 0,
      geminiProScore: segment.proScore || 0,
      embeddingScore: segment.embeddingScore,
      audioEnergyScore: this.normalizeAudioEnergyScore(segment.audioEnergyAvg || 0),
      confidenceScore: (segment.confidenceLevel || 0) * 100,
      contentTypeWeight: 1.0,
      durationOptimalityScore: this.calculateDurationScore(duration, contentConfig),
      silenceRatioScore: this.calculateSilenceScore(segment.silenceRatio || 0),
      sceneChangeScore: segment.sceneChanges ? this.normalizeSceneChangeScore(segment.sceneChanges) : undefined
    };
  }

  private calculateDurationScore(duration: number, contentConfig: any): number {
    const optimal = contentConfig.preferredClipLength;
    const min = contentConfig.minClipLength;
    const max = contentConfig.maxClipLength;
    
    if (duration < min || duration > max) {
      return 0;
    }
    
    if (duration === optimal) {
      return 100;
    }
    
    const distance = Math.abs(duration - optimal);
    const maxDistance = Math.max(optimal - min, max - optimal);
    
    return Math.max(0, 100 - (distance / maxDistance) * 100);
  }

  private calculateSilenceScore(silenceRatio: number): number {
    if (silenceRatio <= 0.1) return 100;
    if (silenceRatio <= 0.2) return 80;
    if (silenceRatio <= 0.3) return 60;
    if (silenceRatio <= 0.4) return 40;
    return 20;
  }

  private normalizeAudioEnergyScore(energy: number): number {
    return Math.min(100, energy * 100);
  }

  private normalizeSceneChangeScore(sceneChanges: number): number {
    return Math.min(100, (sceneChanges / 10) * 100);
  }

  private applyBonusesAndPenalties(
    score: number,
    factors: SegmentScoreFactors,
    config: ScoringConfig
  ): number {
    let adjustedScore = score;

    if (factors.confidenceScore < 60) {
      adjustedScore *= (1 - config.penalties.lowConfidence);
    } else if (factors.confidenceScore > 85) {
      adjustedScore *= (1 + config.bonuses.highConfidence);
    }

    if (factors.durationOptimalityScore > 90) {
      adjustedScore *= (1 + config.bonuses.perfectDuration);
    } else if (factors.durationOptimalityScore < 50) {
      adjustedScore *= (1 - config.penalties.poorDuration);
    }

    if (factors.silenceRatioScore < 40) {
      adjustedScore *= (1 - config.penalties.highSilence);
    }

    if (factors.embeddingScore && factors.embeddingScore > 80) {
      adjustedScore *= (1 + config.bonuses.multiModal);
    }

    return adjustedScore;
  }

  private async rankAndFilterSegments(projectId: string, maxSegments: number): Promise<void> {
    console.log(`Ranking and filtering segments for project ${projectId}`);

    const segments = await prisma.highlightSegment.findMany({
      where: { projectId },
      orderBy: { finalScore: 'desc' }
    });

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isRecommended = i < maxSegments && segment.finalScore >= 60;
      
      await prisma.highlightSegment.update({
        where: { id: segment.id },
        data: {
          status: isRecommended ? 'recommended' : 'available',
          updatedAt: new Date()
        }
      });
    }

    console.log(`Marked ${Math.min(maxSegments, segments.filter((s: any) => s.finalScore >= 60).length)} segments as recommended`);
  }

  private buildScoringConfig(contentType: string, contentConfig: any): ScoringConfig {
    return {
      contentType,
      weights: this.defaultWeights[contentType] || this.defaultWeights.gaming,
      penalties: {
        lowConfidence: 0.2,
        poorDuration: 0.15,
        highSilence: 0.1
      },
      bonuses: {
        perfectDuration: 0.05,
        highConfidence: 0.1,
        multiModal: 0.15
      }
    };
  }

  private getContentConfig(contentType: string) {
    const configs = {
      gaming: { preferredClipLength: 30, minClipLength: 15, maxClipLength: 60 },
      podcast: { preferredClipLength: 60, minClipLength: 30, maxClipLength: 90 },
      vlog: { preferredClipLength: 45, minClipLength: 20, maxClipLength: 75 },
      tutorial: { preferredClipLength: 75, minClipLength: 45, maxClipLength: 120 }
    };
    
    return configs[contentType as keyof typeof configs] || configs.gaming;
  }

  private calculateQualityGrade(score: number, confidence: number): string {
    if (score >= 85 && confidence >= 0.8) return 'Excellent';
    if (score >= 75 && confidence >= 0.7) return 'Very Good';
    if (score >= 65 && confidence >= 0.6) return 'Good';
    if (score >= 55 && confidence >= 0.5) return 'Fair';
    return 'Poor';
  }

  async getSegmentAnalytics(projectId: string): Promise<any> {
    const segments = await prisma.highlightSegment.findMany({
      where: { projectId },
      orderBy: { finalScore: 'desc' }
    });

    const analytics = {
      totalSegments: segments.length,
      averageScore: segments.reduce((sum, s) => sum + s.finalScore, 0) / segments.length,
      scoreDistribution: {
        excellent: segments.filter((s: any) => s.finalScore >= 85).length,
        veryGood: segments.filter((s: any) => s.finalScore >= 75 && s.finalScore < 85).length,
        good: segments.filter((s: any) => s.finalScore >= 65 && s.finalScore < 75).length,
        fair: segments.filter((s: any) => s.finalScore >= 55 && s.finalScore < 65).length,
        poor: segments.filter((s: any) => s.finalScore < 55).length
      },
      recommendedSegments: segments.filter((s: any) => s.status === 'recommended').length,
      topScores: segments.slice(0, 5).map(s => ({
        id: s.id,
        score: s.finalScore,
        type: s.highlightType,
        duration: s.duration
      }))
    };

    return analytics;
  }

  async rebalanceScores(
    projectId: string,
    userFeedback: Array<{
      segmentId: string;
      userRating: number;
      feedback: string;
    }>
  ): Promise<void> {
    console.log(`Rebalancing scores for project ${projectId} based on user feedback`);
    
    for (const feedback of userFeedback) {
      const segment = await prisma.highlightSegment.findUnique({
        where: { id: feedback.segmentId }
      });

      if (!segment) continue;

      const aiScore = segment.finalScore;
      const userScore = feedback.userRating * 20;
      const difference = userScore - aiScore;
      
      const adjustment = difference * 0.1;
      const newScore = Math.max(0, Math.min(100, aiScore + adjustment));

      await prisma.highlightSegment.update({
        where: { id: feedback.segmentId },
        data: { 
          finalScore: Math.round(newScore),
          updatedAt: new Date()
        }
      });

      console.log(`Adjusted segment ${feedback.segmentId} score from ${aiScore} to ${Math.round(newScore)}`);
    }
  }
}

export const segmentScoring = new SegmentScoringService();