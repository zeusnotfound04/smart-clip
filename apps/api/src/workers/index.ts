import { videoProcessingQueue, subtitleQueue, aiQueue, smartClipperQueue } from '../lib/queues';
import Bull from 'bull';
import { generateSubtitles, generateSRT } from '../services/auto-subtitles.service';
import { combineVideos } from '../services/split-streamer.service';
import { detectHighlights } from '../services/smart-clipper.service';
import { generateScript } from '../services/script-generator.service';
import { geminiVideoAnalysis } from '../services/gemini-video-analysis.service';
import { multimodalEmbeddings } from '../services/multimodal-embeddings.service';
import { ffmpegPreprocessing } from '../services/ffmpeg-preprocessing.service';
import { segmentScoring } from '../services/segment-scoring.service';
import { transcriptClipper } from '../services/transcript-clipper.service';
import { prisma } from '../lib/prisma';

videoProcessingQueue.process('combine-videos', 8, async (job) => {
  const { projectId, webcamVideoPath, gameplayVideoPath, layoutConfig, userId, requestId } = job.data;
  
  try {
    console.log(`[${requestId}] Worker: Starting video combination for project ${projectId}`);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing' }
    });

    console.log(`[${requestId}] Worker: Calling combineVideos service...`);
    const outputBuffer = await combineVideos(webcamVideoPath, gameplayVideoPath, layoutConfig);
    
    console.log(`[${requestId}] Worker: Video combination completed, uploading to S3...`);
    
    const { uploadFile, generateKey } = await import('../lib/s3');
    const outputKey = generateKey(userId, `${projectId}_combined.mp4`, 'video');
    
    const outputUrl = await uploadFile(outputKey, outputBuffer, 'video/mp4');
    console.log(`[${requestId}] Worker: S3 upload completed: ${outputUrl}`);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'completed',
        outputPath: outputUrl
      }
    });

    console.log(`[${requestId}] Worker: Project ${projectId} completed successfully`);
    return { projectId, outputUrl };
  } catch (error) {
    console.error(`[${requestId}] Worker: Video combination failed:`, error);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

subtitleQueue.process('generate-subtitles', 7, async (job) => {
  const { videoId, s3Key, userId, language, options } = job.data;
  
  try {
    if (!userId) {
      throw new Error('User ID is required for subtitle generation');
    }

    console.log(`Processing subtitle job: ${job.id} for video: ${videoId}`);
    
    if (options?.style) {
      console.log(`[STYLE CONFIG] Font: ${options.style.fontFamily || 'Arial'}, Size: ${options.style.fontSize || 20}px, Color: ${options.style.primaryColor || '#FFFFFF'}`);
      console.log(`[STYLE CONFIG] Bold: ${options.style.bold || false}, Italic: ${options.style.italic || false}, Alignment: ${options.style.alignment || 'center'}`);
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing' }
    });

    console.log(`Job ${job.id}: Starting subtitle generation (10%)`);
    await job.progress(10);
    
    const { generateVideoWithSubtitles } = await import('../services/auto-subtitles.service');
    
    let lastReportedProgress = 25;
    const progressCallback = async (progress: number) => {
      const mappedProgress = 25 + (progress * 0.65);
      
      if (mappedProgress - lastReportedProgress >= 5) {
        console.log(`Job ${job.id}: Processing at ${mappedProgress.toFixed(1)}%`);
        await job.progress(mappedProgress);
        lastReportedProgress = mappedProgress;
      }
    };
    
    const result = await generateVideoWithSubtitles(videoId, s3Key, userId, {
      onProgress: progressCallback,
      language: language,
      ...options
    });
    
    console.log(`Job ${job.id}: Finalizing video record (90%)`);
    await job.progress(90);
    
    await prisma.video.update({
      where: { id: videoId },
      data: { 
        status: 'completed',
        subtitledVideoUrl: result.subtitledVideoUrl,
        subtitleConfig: {
          srtS3Key: result.srtS3Key,
          audioS3Key: result.audioS3Key,
          detectedLanguages: result.detectedLanguages,
          segmentCount: result.segments.length
        }
      }
    });

    console.log(`Job ${job.id}: Completed (100%)`);
    await job.progress(100);

    console.log(`Subtitle job ${job.id} completed successfully`);
    console.log(`[SUBTITLE] Updated video with subtitled URL: ${result.subtitledVideoUrl}`);
    console.log(`[SUBTITLE] SRT S3 Key: ${result.srtS3Key}`);
    console.log(`[SUBTITLE] Total segments: ${result.segments.length}`);
    
    return { 
      videoId,
      subtitledVideoUrl: result.subtitledVideoUrl,
      srtS3Key: result.srtS3Key,
      segmentCount: result.segments.length
    };
  } catch (error: any) {
    console.error(`Subtitle job ${job.id} failed:`, error.message);
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

subtitleQueue.process('download-and-generate-subtitles', 5, async (job) => {
  const { videoId, url, userId, language, options, platform } = job.data;
  
  let downloadedFilePath: string | null = null;
  
  try {
    if (!userId) {
      throw new Error('User ID is required for subtitle generation');
    }

    console.log(`Processing download+subtitle job: ${job.id} for video: ${videoId}`);
    console.log(`Platform: ${platform}, URL: ${url}`);
    
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'downloading' }
    });

    console.log(`[${job.id}] Starting video download using yt-dlp...`);
    await job.progress(5);
    
    const { videoDownloader } = await import('../services/video-downloader.service');
    
    const downloadResult = await videoDownloader.downloadAndGetDuration(url, userId);
    downloadedFilePath = downloadResult.localPath;
    
    console.log(`[${job.id}] Video downloaded: ${downloadResult.videoInfo.title}`);
    console.log(`[${job.id}] Local path: ${downloadedFilePath}`);
    console.log(`[${job.id}] Duration: ${downloadResult.duration}s`);
    await job.progress(20);
    
    console.log(`[${job.id}] Uploading to S3...`);
    const { promises: fs } = await import('fs');
    const fileBuffer = await fs.readFile(downloadedFilePath);
    
    const { uploadFile, generateKey } = await import('../lib/s3');
    const s3Key = generateKey(userId, downloadResult.fileName, 'video');
    const s3Url = await uploadFile(s3Key, fileBuffer, 'video/mp4');
    
    console.log(`[${job.id}] Uploaded to S3: ${s3Url}`);
    await job.progress(30);
    
    await prisma.video.update({
      where: { id: videoId },
      data: {
        filePath: s3Url,
        duration: downloadResult.duration,
        size: fileBuffer.length,
        status: 'processing'
      }
    });
    
    await videoDownloader.cleanupFile(downloadedFilePath);
    downloadedFilePath = null;
    
    console.log(`[${job.id}] Starting subtitle generation...`);
    await job.progress(40);
    
    const { generateVideoWithSubtitles } = await import('../services/auto-subtitles.service');
    
    let lastReportedProgress = 40;
    const progressCallback = async (progress: number) => {
      const mappedProgress = 40 + (progress * 0.55);
      
      if (mappedProgress - lastReportedProgress >= 5) {
        console.log(`Job ${job.id}: Processing at ${mappedProgress.toFixed(1)}%`);
        await job.progress(mappedProgress);
        lastReportedProgress = mappedProgress;
      }
    };
    
    const result = await generateVideoWithSubtitles(videoId, s3Key, userId, {
      onProgress: progressCallback,
      language: language,
      ...options
    });
    
    await job.progress(95);
    
    await prisma.video.update({
      where: { id: videoId },
      data: { 
        status: 'completed',
        subtitledVideoUrl: result.subtitledVideoUrl,
        subtitleConfig: {
          srtS3Key: result.srtS3Key,
          audioS3Key: result.audioS3Key,
          detectedLanguages: result.detectedLanguages,
          segmentCount: result.segments.length
        }
      }
    });

    await job.progress(100);

    console.log(`Job ${job.id} completed successfully`);
    console.log(`Subtitled URL: ${result.subtitledVideoUrl}`);
    
    return { 
      videoId,
      subtitledVideoUrl: result.subtitledVideoUrl,
      srtS3Key: result.srtS3Key,
      segmentCount: result.segments.length
    };
  } catch (error: any) {
    console.error(`Download+subtitle job ${job.id} failed:`, error.message);
    
    if (downloadedFilePath) {
      try {
        const { videoDownloader } = await import('../services/video-downloader.service');
        await videoDownloader.cleanupFile(downloadedFilePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

aiQueue.process('detect-highlights', 2, async (job) => {
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

aiQueue.process('generate-script', 2, async (job) => {
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

extractClipQueue.process('extract-clip', 2, async (job) => {
  try {
    const { projectId, videoUrl, startTime, endTime, highlightType } = job.data;
    
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing', progress: 20 }
    });

    let clipSegments = [];
    if (highlightType === 'auto') {
      const highlights = await detectHighlights(videoUrl);
      clipSegments = highlights.filter(h => 
        h.startTime >= startTime && h.endTime <= endTime
      );
    } else {
      clipSegments = [{ startTime, endTime, confidence: 1.0 }];
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { progress: 60 }
    });

    const { extractClip } = await import('../services/video-processing.service');
    const clipUrl = await extractClip(videoUrl, startTime, endTime, projectId);
    
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

console.log('Setting up Smart Clipper processor...');

smartClipperQueue.on('waiting', (jobId) => {
  console.log(`Smart Clipper job ${jobId} is waiting to be processed`);
});

smartClipperQueue.on('active', (job, jobPromise) => {
  console.log(`Smart Clipper job ${job.id} started processing`);
});

smartClipperQueue.on('progress', (job, progress) => {
  console.log(`Smart Clipper job ${job.id} progress: ${progress}%`);
});

smartClipperQueue.on('completed', (job, result) => {
  console.log(`Smart Clipper job ${job.id} completed successfully`);
});

smartClipperQueue.on('failed', (job, error) => {
  console.error(`Smart Clipper job ${job?.id} failed:`, error.message);
});

smartClipperQueue.on('stalled', (job) => {
  console.warn(`Smart Clipper job ${job.id} stalled`);
});

smartClipperQueue.process('analyze-video-complete', 10, async (job) => {
  const { projectId, videoPath, videoDuration, contentType, config, requestId } = job.data;
  
  console.log(`Smart Clipper: Starting analysis for project ${projectId}`);
  
  try {
    console.log(`[${requestId}] Starting complete Smart Clipper analysis for project ${projectId}`);

    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'analyzing',
        processingStage: 'preprocessing'
      }
    });

    console.log(`[${requestId}] Stage 1: FFmpeg preprocessing`);
    console.log(`[${requestId}] Video path: ${videoPath}`);
    
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

    const topSegments = proResult.refinedSegments
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(5, proResult.refinedSegments.length)); // Top 5 for cost control

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

    const actualCost = (flashResult.costEstimate || 0) + 
                      (proResult.costEstimate || 0) + 
                      (topSegments.length * 0.0001); // Embedding cost estimate

    console.log(`[${requestId}] Stage 5: Segment scoring and ranking`);
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { processingStage: 'scoring' }
    });

    await segmentScoring.scoreSegments(projectId);

    console.log(`[${requestId}] Stage 6: Generating video clips`);
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { processingStage: 'generating-clips' }
    });

    const recommendedSegments = await prisma.highlightSegment.findMany({
      where: {
        projectId,
        status: 'recommended'
      },
      orderBy: { finalScore: 'desc' },
      take: 5 // Generate top 5 clips
    });

    console.log(`[${requestId}] Generating ${recommendedSegments.length} video clips`);

    const { clipGeneration } = await import('../services/clip-generation.service');
    const { uploadClip } = await import('../lib/s3');
    const { unlink } = await import('fs/promises');
    
    const project = await prisma.smartClipperProject.findUnique({
      where: { id: projectId },
      include: { user: true }
    });
    const userId = project?.user.id;
    
    if (!userId) {
      throw new Error('User ID not found for project');
    }

    const generatedClips = [];
    for (const segment of recommendedSegments) {
      try {
        const localClipPath = await clipGeneration.generateSingleClip(
          segment.id,
          videoPath,
          segment.startTime,
          segment.endTime,
          userId,
          {
            format: 'mp4',
            quality: 'medium',
            resolution: 'original',
            includeAudio: true,
            fadeInOut: false
          }
        );
        console.log(`[${requestId}] DEBUG: Local clip generated at: ${localClipPath}`);
        
        if (userId) {
          const s3Url = await uploadClip(localClipPath, userId, segment.id, projectId);
          
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

          try {
            await unlink(localClipPath);
          } catch (cleanupError) {
            console.warn(`[${requestId}] Failed to cleanup local file ${localClipPath}:`, cleanupError);
          }
          
          console.log(`[${requestId}] Clip uploaded to S3: ${s3Url}`);
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

    console.log(`[${requestId}] Smart Clipper completed: ${createdSegments.length} segments, ${generatedClips.length} clips generated`);

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

console.log('Smart Clipper analyze-video-complete processor registered');

smartClipperQueue.process('analyze-podcast-transcript', 5, async (job) => {
  const { projectId, videoPath, videoDuration, contentType, config, requestId } = job.data;
  
  console.log(`[${requestId}] Starting TRANSCRIPT-BASED analysis for ${contentType} project ${projectId}`);
  
  try {
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'analyzing',
        processingStage: 'transcribing'
      }
    });

    console.log(`[${requestId}] Stage 1: Extracting transcript from video...`);
    
    const { extractTranscriptFromVideo } = await import('../services/auto-subtitles.service');
    
    const project = await prisma.smartClipperProject.findUnique({
      where: { id: projectId },
      include: { user: true }
    });
    
    if (!project?.user?.id) {
      throw new Error('User ID not found for project');
    }
    
    const userId = project.user.id;
    
    const transcriptResult = await extractTranscriptFromVideo(videoPath, projectId);
    
    console.log(`[${requestId}] Transcript extracted: ${transcriptResult.segments.length} segments`);
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { processingStage: 'analyzing-transcript' }
    });

    console.log(`[${requestId}] Stage 2: Sending transcript to Gemini Pro...`);
    
    const clipConfig = {
      numberOfClips: config.numberOfClips || 5,
      minClipDuration: config.minClipDuration || 30,
      maxClipDuration: config.maxClipDuration || 90,
      contentType: contentType as 'podcast' | 'interview'
    };
    
    const clipRecommendations = await transcriptClipper.analyzeTranscriptAndGetClips(
      transcriptResult.segments,
      clipConfig,
      projectId
    );
    
    console.log(`[${requestId}] Gemini selected ${clipRecommendations.length} clips`);
    
    if (clipRecommendations.length === 0) {
      throw new Error('Gemini Pro did not return any clip recommendations');
    }
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        processingStage: 'creating-segments',
        geminiProResults: JSON.stringify({ recommendations: clipRecommendations }) as any
      }
    });

    console.log(`[${requestId}] Stage 3: Creating highlight segments...`);
    
    const createdSegments = [];
    for (const clip of clipRecommendations) {
      const segment = await prisma.highlightSegment.create({
        data: {
          projectId,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.endTime - clip.startTime,
          flashScore: null,
          proScore: clip.score,
          finalScore: clip.score,
          confidenceLevel: clip.score / 100,
          highlightType: clip.highlightType,
          reasoning: `${clip.title}\n\n${clip.reasoning}`,
          geminiClassification: clip.highlightType,
          contentTags: [clip.highlightType, contentType],
          audioEnergyAvg: null,
          silenceRatio: null,
          sceneChanges: null,
          status: 'recommended'
        }
      });
      createdSegments.push(segment);
    }
    
    console.log(`[${requestId}] Created ${createdSegments.length} highlight segments`);
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { processingStage: 'generating-clips' }
    });

    console.log(`[${requestId}] Stage 4: Generating video clips with FFmpeg...`);
    
    const { clipGeneration } = await import('../services/clip-generation.service');
    const { uploadClip } = await import('../lib/s3');
    const { unlink } = await import('fs/promises');
    
    const generatedClips = [];
    
    for (const segment of createdSegments) {
      try {
        const localClipPath = await clipGeneration.generateSingleClip(
          segment.id,
          videoPath,
          segment.startTime,
          segment.endTime,
          userId,
          {
            format: 'mp4',
            quality: 'medium',
            resolution: 'original',
            includeAudio: true,
            fadeInOut: false
          }
        );
        
        const s3Url = await uploadClip(localClipPath, userId, segment.id, projectId);
        
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
        
        try {
          await unlink(localClipPath);
        } catch (cleanupError) {
          console.warn(`[${requestId}] Failed to cleanup local file:`, cleanupError);
        }
        
        console.log(`[${requestId}] Clip ${segment.id} uploaded to S3`);
        
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
    
    console.log(`[${requestId}] Generated ${generatedClips.length} clips`);
    
    await prisma.smartClipperProject.update({
      where: { id: projectId },
      data: { 
        status: 'ready',
        processingStage: null,
        totalSegmentsFound: createdSegments.length,
        actualCost: 0.01, // Minimal cost (just Gemini Pro call)
        embeddingScores: {
          method: 'transcript-based',
          transcriptSegments: transcriptResult.segments.length,
          generatedClips: generatedClips.length
        }
      }
    });
    
    console.log(`[${requestId}] Podcast/Interview analysis completed: ${generatedClips.length} clips ready`);
    
    return {
      projectId,
      method: 'transcript-based',
      segmentsGenerated: createdSegments.length,
      clipsGenerated: generatedClips.length
    };
    
  } catch (error) {
    console.error(`[${requestId}] Podcast analysis failed:`, error);
    
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

console.log('Podcast/Interview transcript-based processor registered');

setTimeout(async () => {
  try {
    console.log('Force checking for waiting jobs...');
    const waitingJobs = await smartClipperQueue.getWaiting();
    console.log(`Found ${waitingJobs.length} waiting jobs after processor setup`);
    
    if (waitingJobs.length > 0) {
      console.log('Manually triggering job processing check...');
      
      const jobCounts = await smartClipperQueue.getJobCounts();
      console.log('Job counts after processor registration:', jobCounts);
      
      if (waitingJobs.length > 0) {
        const testJob = waitingJobs[0];
        console.log(`Testing job ${testJob.id} with data:`, Object.keys(testJob.data));
      }
    }
  } catch (error) {
    console.error('Error checking waiting jobs:', error);
  }
}, 3000);

smartClipperQueue.process('generate-clip', 8, async (job) => {
  const { segmentId, videoPath, startTime, endTime, exportSettings, projectId, userId } = job.data;
  
  try {
    console.log(`[${projectId}] Generating clip for segment ${segmentId}: ${startTime}s-${endTime}s`);

    const { clipGeneration } = await import('../services/clip-generation.service');
    
    if (!userId) {
      throw new Error('User ID is required for clip generation');
    }
    
    const outputPath = await clipGeneration.generateSingleClip(
      segmentId,
      videoPath,
      startTime,
      endTime,
      userId,
      exportSettings
    );

    console.log(`[${projectId}] Clip generated successfully for segment ${segmentId}: ${outputPath}`);

    return { segmentId, outputPath };

  } catch (error) {
    console.error(`[${projectId}] Clip generation failed for segment ${segmentId}:`, error);
    throw error;
  }
});

smartClipperQueue.process('score-segments', 6, async (job) => {
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

smartClipperQueue.process('rebalance-scores', 6, async (job) => {
  const { projectId, userFeedback, requestId } = job.data;
  
  try {
    console.log(`[${requestId}] Rebalancing scores for project ${projectId} with ${userFeedback.length} feedback items`);

    await segmentScoring.rebalanceScores(projectId, userFeedback);

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