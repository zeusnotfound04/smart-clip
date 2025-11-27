import { videoProcessingQueue, subtitleQueue, aiQueue, smartClipperQueue } from '../lib/queues';
import Bull from 'bull';
import { extractAudioFromVideo, generateSubtitles, generateSRT } from '../services/auto-subtitles.service';
import { combineVideos } from '../services/split-streamer.service';
import { detectHighlights } from '../services/smart-clipper.service';
import { generateScript } from '../services/script-generator.service';
import { generateVideoFromConversation } from '../services/fake-conversations.service';
import { geminiVideoAnalysis } from '../services/gemini-video-analysis.service';
import { multimodalEmbeddings } from '../services/multimodal-embeddings.service';
import { ffmpegPreprocessing } from '../services/ffmpeg-preprocessing.service';
import { segmentScoring } from '../services/segment-scoring.service';
import { prisma } from '../lib/prisma';

videoProcessingQueue.process('combine-videos', 1, async (job) => {
  const { webcamS3Key, gameplayS3Key, projectId } = job.data;
  
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing' }
    });

    const result = await combineVideos(webcamS3Key, gameplayS3Key);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'completed',
        outputPath: `processed/${projectId}/combined.mp4`
      }
    });

    return result;
  } catch (error) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

subtitleQueue.process('generate-subtitles', 1, async (job) => {
  const { videoId, s3Key } = job.data;
  
  try {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing' }
    });

    const audioResult = await extractAudioFromVideo(s3Key, videoId);
    const subtitles = await generateSubtitles(s3Key);
    
    for (const subtitle of subtitles) {
      await prisma.subtitle.create({
        data: {
          videoId,
          text: subtitle.text,
          startTime: subtitle.startTime,
          endTime: subtitle.endTime,
          confidence: subtitle.confidence || 0
        }
      });
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'completed' }
    });

    return subtitles;
  } catch (error) {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

aiQueue.process('detect-highlights', 1, async (job) => {
  const { videoS3Key, projectId } = job.data;
  
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing' }
    });

    const highlights = await detectHighlights(videoS3Key);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'completed',
        config: JSON.stringify({ highlights })
      }
    });

    return highlights;
  } catch (error) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

aiQueue.process('generate-script', 1, async (job) => {
  const { prompt, options, projectId } = job.data;
  
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing' }
    });

    const script = await generateScript(prompt, options);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'completed',
        config: JSON.stringify({ script })
      }
    });

    return script;
  } catch (error) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

aiQueue.process('create-conversation', 1, async (job) => {
  const { conversationProjectId, videoSettings } = job.data;
  
  try {
    // Update conversation project status
    await prisma.conversationProject.update({
      where: { id: conversationProjectId },
      data: { status: 'generating' }
    });

    const result = await generateVideoFromConversation(
      conversationProjectId,
      videoSettings || {}
    );
    
    await prisma.conversationProject.update({
      where: { id: conversationProjectId },
      data: { 
        status: 'completed',
        videoOutputPath: result.outputPath,
        videoDuration: result.duration
      }
    });

    return result;
  } catch (error) {
    await prisma.conversationProject.update({
      where: { id: conversationProjectId },
      data: { 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
});

// Extract clip queue and processor using the same Redis config
export const extractClipQueue = new Bull('extract-clip', {
  redis: process.env.REDIS_URL ? {
    host: new URL(process.env.REDIS_URL).hostname,
    port: parseInt(new URL(process.env.REDIS_URL).port || '6379'),
    password: new URL(process.env.REDIS_URL).password,
    username: new URL(process.env.REDIS_URL).username || 'default',
    tls: new URL(process.env.REDIS_URL).protocol === 'rediss:' ? {
      rejectUnauthorized: false
    } : undefined,
    connectTimeout: 60000,
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    family: 4
  } : {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
});

// Process clip extraction jobs
extractClipQueue.process('extract-clip', async (job) => {
  try {
    const { projectId, videoUrl, startTime, endTime, highlightType } = job.data;
    
    // Update status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing', progress: 20 }
    });

    // Extract clip using smart clipper service
    // First detect highlights if needed
    let clipSegments = [];
    if (highlightType === 'auto') {
      const highlights = await detectHighlights(videoUrl);
      clipSegments = highlights.filter(h => 
        h.startTime >= startTime && h.endTime <= endTime
      );
    } else {
      clipSegments = [{ startTime, endTime, confidence: 1.0 }];
    }

    // Update progress
    await prisma.project.update({
      where: { id: projectId },
      data: { progress: 60 }
    });

    // Extract the actual clip using FFmpeg
    const { extractClip } = await import('../services/video-processing.service');
    const clipUrl = await extractClip(videoUrl, startTime, endTime, projectId);
    
    // Update project with results
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'completed',
        progress: 100,
        outputPath: clipUrl,
        config: JSON.stringify({ 
          segments: clipSegments,
          originalStartTime: startTime,
          originalEndTime: endTime
        })
      }
    });

    console.log(`Clip extraction completed for project ${projectId}`);
  } catch (error) {
    console.error('Clip extraction job failed:', error);
    await prisma.project.update({
      where: { id: job.data.projectId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

// Initialize Smart Clipper processor
console.log('🔧 Setting up Smart Clipper processor...');

// Add event listeners to debug job processing
smartClipperQueue.on('waiting', (jobId) => {
  console.log(`📥 Smart Clipper job ${jobId} is waiting to be processed`);
});

smartClipperQueue.on('active', (job, jobPromise) => {
  console.log(`🟢 Smart Clipper job ${job.id} started processing`);
});

smartClipperQueue.on('progress', (job, progress) => {
  console.log(`📊 Smart Clipper job ${job.id} progress: ${progress}%`);
});

smartClipperQueue.on('completed', (job, result) => {
  console.log(`✅ Smart Clipper job ${job.id} completed successfully`);
});

smartClipperQueue.on('failed', (job, error) => {
  console.error(`❌ Smart Clipper job ${job?.id} failed:`, error.message);
});

smartClipperQueue.on('stalled', (job) => {
  console.warn(`⏸️ Smart Clipper job ${job.id} stalled`);
});

// Force process jobs function with higher concurrency
smartClipperQueue.process('analyze-video-complete', 2, async (job) => {
  const { projectId, videoPath, videoDuration, contentType, config, requestId } = job.data;
  
  console.log(`🚀 Smart Clipper: Starting analysis for project ${projectId}`);
  
  try {
    console.log(`[${requestId}] 🚀 Starting complete Smart Clipper analysis for project ${projectId}`);

    // Update project status to preprocessing
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'analyzing',
        processingStage: 'preprocessing'
      }
    });

    // Stage 1: Light preprocessing with FFmpeg
    console.log(`[${requestId}] Stage 1: FFmpeg preprocessing`);
    console.log(`[${requestId}] 🔧 Video path: ${videoPath}`);
    
    let preprocessingResult;
    try {
      preprocessingResult = await ffmpegPreprocessing.preprocessVideo(videoPath, projectId, {
        enableSceneDetection: true,
        enableWaveformGeneration: true,
        silenceThreshold: -30,
        energySampleInterval: 0.5
      });
    } catch (preprocessError) {
      console.error(`[${requestId}] FFmpeg preprocessing failed:`, preprocessError);
      throw new Error(`FFmpeg preprocessing failed: ${preprocessError instanceof Error ? preprocessError.message : String(preprocessError)}`);
    }

    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        processingStage: 'flash-analysis',
        analysisResults: JSON.stringify({
          preprocessing: preprocessingResult
        }) as any
      }
    });

    // Stage 2: Gemini Flash initial analysis
    const flashResult = await geminiVideoAnalysis.analyzeVideoWithFlash(
      videoPath,
      config,
      projectId
    );

    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        processingStage: 'pro-refinement',
        geminiFlashResults: JSON.stringify(flashResult) as any
      }
    });

    // Stage 3: Gemini Pro refinement
    const proResult = await geminiVideoAnalysis.refineSegmentsWithPro(
      flashResult.segments,
      videoPath,
      config,
      projectId
    );

    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        processingStage: 'embedding-scoring',
        geminiProResults: JSON.stringify(proResult) as any
      }
    });

    // Stage 4: Optional embeddings enhancement (for top segments only)
    const topSegments = proResult.refinedSegments
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(5, proResult.refinedSegments.length)); // Top 5 for cost control

    // Create highlight segments in database
    const createdSegments = [];
    for (const segment of proResult.refinedSegments) {
      const highlightSegment = await prisma.highlightSegment.create({
        data: {
          projectId,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.endTime - segment.startTime,
          flashScore: flashResult.segments.find(f => 
            Math.abs(f.startTime - segment.startTime) < 2
          )?.score || null,
          proScore: segment.score,
          finalScore: segment.score,
          confidenceLevel: segment.confidence,
          highlightType: segment.highlightType,
          reasoning: segment.reasoning,
          geminiClassification: segment.classification,
          contentTags: segment.contentTags || [],
          audioEnergyAvg: preprocessingResult.audioAnalysis.averageEnergy,
          silenceRatio: preprocessingResult.audioAnalysis.silenceRatio,
          sceneChanges: preprocessingResult.sceneChanges.totalScenes,
          status: 'pending'
        }
      });
      createdSegments.push(highlightSegment);
    }

    // Enhance top segments with embeddings
    if (topSegments.length > 0) {
      await multimodalEmbeddings.enhanceSegmentsWithEmbeddings(
        projectId,
        createdSegments.slice(0, topSegments.length).map(s => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          videoPath,
          proScore: s.proScore,
          highlightType: s.highlightType
        })),
        contentType
      );
    }

    // Calculate actual cost
    const actualCost = (flashResult.costEstimate || 0) + 
                      (proResult.costEstimate || 0) + 
                      (topSegments.length * 0.0001); // Embedding cost estimate

    // Stage 5: Final scoring and ranking
    console.log(`[${requestId}] Stage 5: Segment scoring and ranking`);
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { processingStage: 'scoring' }
    });

    await segmentScoring.scoreSegments(projectId);

    // Stage 6: Generate actual video clips and upload to S3
    console.log(`[${requestId}] Stage 6: Generating video clips`);
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { processingStage: 'generating-clips' }
    });

    // Get recommended segments for clip generation
    const recommendedSegments = await prisma.highlightSegment.findMany({
      where: {
        projectId,
        status: 'recommended'
      },
      orderBy: { finalScore: 'desc' },
      take: 5 // Generate top 5 clips
    });

    console.log(`[${requestId}] Generating ${recommendedSegments.length} video clips`);

    // Generate clips for each recommended segment
    const { clipGeneration } = await import('../services/clip-generation.service');
    const { uploadClip } = await import('../lib/s3');
    const { unlink } = await import('fs/promises');
    
    const generatedClips = [];
    for (const segment of recommendedSegments) {
      try {
        // Generate clip file locally
        const localClipPath = await clipGeneration.generateSingleClip(
          segment.id,
          videoPath,
          segment.startTime,
          segment.endTime,
          {
            format: 'mp4',
            quality: 'medium',
            resolution: 'original',
            includeAudio: true,
            fadeInOut: false
          }
        );
        console.log(`[${requestId}] 🔧 DEBUG: Local clip generated at: ${localClipPath}`);

        console.log(`[${requestId}] 🔧 DEBUG: Getting user ID for S3 upload...`);
        // Upload clip to S3
        const userId = (await prisma.smartClipperProject.findUnique({
          where: { id: projectId },
          include: { user: true }
        }))?.user.id;
        
        if (userId) {
          const s3Url = await uploadClip(localClipPath, userId, segment.id, projectId);
          
          // Update segment with S3 URL
          await prisma.highlightSegment.update({
            where: { id: segment.id },
            data: {
              s3Url,
              status: 'ready',
              generatedAt: new Date()
            }
          });

          generatedClips.push({
            segmentId: segment.id,
            s3Url,
            startTime: segment.startTime,
            endTime: segment.endTime,
            score: segment.finalScore
          });

          // Clean up local file
          try {
            await unlink(localClipPath);
          } catch (cleanupError) {
            console.warn(`[${requestId}] Failed to cleanup local file ${localClipPath}:`, cleanupError);
          }
          
          console.log(`[${requestId}] ✅ Clip uploaded to S3: ${s3Url}`);
        } else {
          console.error(`[${requestId}] No user ID found, skipping S3 upload`);
        }
      } catch (clipError) {
        console.error(`[${requestId}] Clip generation failed for segment ${segment.id}:`, clipError);
        await prisma.highlightSegment.update({
          where: { id: segment.id },
          data: {
            status: 'failed',
            errorMessage: clipError instanceof Error ? clipError.message : String(clipError)
          }
        });
      }
    }

    console.log(`[${requestId}] Clip generation completed. Generated ${generatedClips.length} clips`);

    // Mark project as ready
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'ready',
        processingStage: null,
        totalSegmentsFound: createdSegments.length,
        actualCost,
        embeddingScores: {
          enhancedSegments: topSegments.length,
          totalCost: actualCost,
          generatedClips: generatedClips.length // Store clips count in embeddingScores JSON
        }
      }
    });

    console.log(`[${requestId}] ✅ Smart Clipper completed: ${createdSegments.length} segments, ${generatedClips.length} clips generated`);

    return {
      projectId,
      segmentsGenerated: createdSegments.length,
      segmentsEnhanced: topSegments.length,
      totalCost: actualCost
    };

  } catch (error) {
    console.error(`[${requestId}] Smart Clipper analysis failed:`, error);
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    
    throw error;
  }
});

console.log('✅ Smart Clipper analyze-video-complete processor registered');

// Force process waiting jobs after setup
setTimeout(async () => {
  try {
    console.log('🔄 Force checking for waiting jobs...');
    const waitingJobs = await smartClipperQueue.getWaiting();
    console.log(`📋 Found ${waitingJobs.length} waiting jobs after processor setup`);
    
    if (waitingJobs.length > 0) {
      console.log('🚀 Manually triggering job processing check...');
      
      // Force check if workers are ready
      const jobCounts = await smartClipperQueue.getJobCounts();
      console.log('📊 Job counts after processor registration:', jobCounts);
      
      // Try to manually activate one job to test
      if (waitingJobs.length > 0) {
        const testJob = waitingJobs[0];
        console.log(`🧪 Testing job ${testJob.id} with data:`, Object.keys(testJob.data));
      }
    }
  } catch (error) {
    console.error('❌ Error checking waiting jobs:', error);
  }
}, 3000);

// Smart Clipper clip generation processor
smartClipperQueue.process('generate-clip', async (job) => {
  const { segmentId, videoPath, startTime, endTime, exportSettings, projectId } = job.data;
  
  try {
    console.log(`[${projectId}] Generating clip for segment ${segmentId}: ${startTime}s-${endTime}s`);

    const { clipGeneration } = await import('../services/clip-generation.service');
    
    const outputPath = await clipGeneration.generateSingleClip(
      segmentId,
      videoPath,
      startTime,
      endTime,
      exportSettings
    );

    console.log(`[${projectId}] Clip generated successfully for segment ${segmentId}: ${outputPath}`);

    return { segmentId, outputPath };

  } catch (error) {
    console.error(`[${projectId}] Clip generation failed for segment ${segmentId}:`, error);
    throw error;
  }
});

// Smart Clipper segment scoring processor
smartClipperQueue.process('score-segments', async (job) => {
  const { projectId, requestId } = job.data;
  
  try {
    console.log(`[${requestId}] Starting segment scoring for project ${projectId}`);

    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'scoring',
        processingStage: 'scoring'
      }
    });

    await segmentScoring.scoreSegments(projectId);

    const analytics = await segmentScoring.getSegmentAnalytics(projectId);
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'ready',
        processingStage: null,
        scoringResults: analytics
      }
    });

    console.log(`[${requestId}] Segment scoring completed for project ${projectId}`);
    console.log(`[${requestId}] Analytics: ${analytics.recommendedSegments} recommended out of ${analytics.totalSegments} total`);

    return analytics;

  } catch (error) {
    console.error(`[${requestId}] Segment scoring failed for project ${projectId}:`, error);
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    
    throw error;
  }
});

// Smart Clipper user feedback processor for score rebalancing
smartClipperQueue.process('rebalance-scores', async (job) => {
  const { projectId, userFeedback, requestId } = job.data;
  
  try {
    console.log(`[${requestId}] Rebalancing scores for project ${projectId} with ${userFeedback.length} feedback items`);

    await segmentScoring.rebalanceScores(projectId, userFeedback);

    // Re-score segments after feedback integration
    await segmentScoring.scoreSegments(projectId);

    const updatedAnalytics = await segmentScoring.getSegmentAnalytics(projectId);
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        scoringResults: updatedAnalytics,
        lastFeedbackProcessed: new Date()
      }
    });

    console.log(`[${requestId}] Score rebalancing completed for project ${projectId}`);

    return updatedAnalytics;

  } catch (error) {
    console.error(`[${requestId}] Score rebalancing failed for project ${projectId}:`, error);
    throw error;
  }
});