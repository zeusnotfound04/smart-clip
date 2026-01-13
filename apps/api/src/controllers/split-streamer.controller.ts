import { Request, Response } from 'express';
import { videoProcessingQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';
import { combineVideos } from '../services/split-streamer.service';

interface AuthRequest extends Request {
  userId?: string;
}

export const combine = async (req: AuthRequest, res: Response) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] Starting video combination`);
    
    const { webcamVideoId, gameplayVideoId, layoutConfig } = req.body;
    
    if (!webcamVideoId || !gameplayVideoId || !req.userId) {
      console.error(`[${requestId}] Missing required parameters`);
      return res.status(400).json({ error: 'Both webcam and gameplay video IDs are required' });
    }

    console.log(`[${requestId}] Fetching video details...`);
    const dbStart = Date.now();
    
    const [webcamVideo, gameplayVideo] = await Promise.all([
      prisma.video.findUnique({ where: { id: webcamVideoId } }),
      prisma.video.findUnique({ where: { id: gameplayVideoId } })
    ]);
    
    console.log(`[${requestId}] Database query completed (${Date.now() - dbStart}ms)`);

    if (!webcamVideo || !gameplayVideo) {
      console.error(`[${requestId}] One or both videos not found in database`);
      return res.status(404).json({ error: 'One or both videos not found' });
    }

    console.log(`[${requestId}] Creating project record...`);
    const projectStart = Date.now();
    
    const project = await prisma.project.create({
      data: {
        userId: req.userId,
        name: `Split Screen - ${new Date().toLocaleDateString()}`,
        type: 'split-streamer',
        config: JSON.stringify({ 
          webcamVideoId, 
          gameplayVideoId, 
          layoutConfig: layoutConfig || {
            orientation: 'vertical',
            topRatio: 50,
            bottomRatio: 50,
            gap: 4,
            backgroundColor: '#000000',
            cornerRadius: 8,
            swapVideos: false,
            webcamZoom: 1,
            gameplayZoom: 1
          }
        }),
        status: 'processing'
      }
    });
    
    console.log(`[${requestId}] Project created (${Date.now() - projectStart}ms), ID: ${project.id}`);

    console.log(`[${requestId}] Adding job to video processing queue...`);
    
    const job = await videoProcessingQueue.add('combine-videos', {
      projectId: project.id,
      webcamVideoPath: webcamVideo.filePath,
      gameplayVideoPath: gameplayVideo.filePath,
      layoutConfig: layoutConfig || {
        orientation: 'vertical',
        topRatio: 50,
        bottomRatio: 50,
        gap: 4,
        backgroundColor: '#000000',
        cornerRadius: 8,
        swapVideos: false,
        webcamZoom: 1,
        gameplayZoom: 1
      },
      userId: req.userId,
      requestId
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    console.log(`[${requestId}] Job added to queue with ID: ${job.id}`);

    res.json({
      message: 'Video combination started',
      projectId: project.id,
      jobId: job.id,
      status: 'processing'
    });
  } catch (error) {
    console.error(`[${requestId}] Fatal error:`, error);
    res.status(500).json({ error: 'Failed to combine videos' });
  }
};

export const updateLayout = async (req: AuthRequest, res: Response) => {
  const requestId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] Starting layout update`);
    const { projectId } = req.params;
    const { layoutConfig } = req.body;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.userId,
        type: 'split-streamer'
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const config = JSON.parse(String(project.config || '{}'));
    const updatedConfig = { ...config, layoutConfig };

    const [webcamVideo, gameplayVideo] = await Promise.all([
      prisma.video.findUnique({ where: { id: config.webcamVideoId } }),
      prisma.video.findUnique({ where: { id: config.gameplayVideoId } })
    ]);

    if (!webcamVideo || !gameplayVideo) {
      return res.status(404).json({ error: 'Original videos not found' });
    }

    const outputBuffer = await combineVideos(webcamVideo.filePath, gameplayVideo.filePath, layoutConfig);
    
    const { uploadFile, generateKey } = await import('../lib/s3');
    const outputKey = generateKey(req.userId!, `${project.id}_combined_updated.mp4`, 'video');
    const outputUrl = await uploadFile(outputKey, outputBuffer, 'video/mp4');
    
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        config: JSON.stringify(updatedConfig),
        outputPath: outputUrl
      }
    });

    res.json({
      success: true,
      outputUrl
    });
  } catch (error) {
    console.error('Error updating layout:', error);
    res.status(500).json({ error: 'Failed to update layout' });
  }
};

export const downloadCombined = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.userId,
        type: 'split-streamer'
      }
    });

    if (!project || !project.outputPath) {
      return res.status(404).json({ error: 'Combined video not found' });
    }

    try {
      const s3Url = new URL(project.outputPath);
      const s3Key = s3Url.pathname.substring(1); // Remove leading slash
      
      console.log(`Downloading video from S3 key: ${s3Key}`);
      
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { S3Client } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
      
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || 'smart-clip-temp',
        Key: s3Key,
      });
      
      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('File not found in S3');
      }
      
      res.setHeader('Content-Type', response.ContentType || 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename=\"combined_video_${projectId}.mp4\"`);
      if (response.ContentLength) {
        res.setHeader('Content-Length', response.ContentLength.toString());
      }
      res.setHeader('Cache-Control', 'no-cache');
      
      const stream = response.Body as NodeJS.ReadableStream;
      
      stream.on('error', (error) => {
        console.error('S3 stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream error during download' });
        }
      });
      
      res.on('close', () => {
        console.log('Client disconnected during download');
      });
      
      stream.pipe(res);
      
      stream.on('end', () => {
        console.log(`Download completed for project ${projectId}`);
      });
      
    } catch (s3Error) {
      console.error('S3 download error:', s3Error);
      res.redirect(project.outputPath);
    }
  } catch (error) {
    console.error('Error downloading combined video:', error);
    res.status(500).json({ error: 'Failed to download video' });
  }
};

export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId || !req.userId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        userId: req.userId,
        type: 'split-streamer'
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      id: project.id,
      name: project.name,
      status: project.status,
      outputUrl: project.outputPath,
      config: JSON.parse(String(project.config || '{}'))
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
};