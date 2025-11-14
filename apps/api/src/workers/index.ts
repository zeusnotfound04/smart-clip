import { videoProcessingQueue, subtitleQueue, aiQueue } from '../lib/queues';
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