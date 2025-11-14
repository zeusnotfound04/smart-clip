import { videoProcessingQueue, subtitleQueue, aiQueue } from '../lib/queues';
import Bull from 'bull';
import { extractAudioFromVideo, generateSubtitles, generateSRT } from '../services/auto-subtitles.service';
import { combineVideos } from '../services/split-streamer.service';
import { detectHighlights } from '../services/smart-clipper.service';
import { generateScript } from '../services/script-generator.service';
import { createConversationVideo } from '../services/fake-conversations.service';
import { prisma } from '../lib/prisma';

videoProcessingQueue.process('combine-videos', async (job) => {
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

subtitleQueue.process('generate-subtitles', async (job) => {
  const { videoId, s3Key } = job.data;
  
  try {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing' }
    });

    const audioBuffer = await extractAudioFromVideo(s3Key);
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

aiQueue.process('detect-highlights', async (job) => {
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

aiQueue.process('generate-script', async (job) => {
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

aiQueue.process('create-conversation', async (job) => {
  const { messages, config, projectId } = job.data;
  
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing' }
    });

    const video = await createConversationVideo(messages, config);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'completed',
        outputPath: `conversations/${projectId}/output.mp4`
      }
    });

    return video;
  } catch (error) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'failed' }
    });
    throw error;
  }
});

// Extract clip queue and processor
export const extractClipQueue = new Bull('extract-clip', {
  redis: { host: 'localhost', port: 6379 }
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