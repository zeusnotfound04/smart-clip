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

    // Get video details from database
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

    // Process videos directly
    try {
      console.log(`[${requestId}] Starting video combination...`);
      const combineStart = Date.now();
      
      const outputBuffer = await combineVideos(webcamVideo.filePath, gameplayVideo.filePath, layoutConfig);
      
      console.log(`[${requestId}] Video combination completed (${Date.now() - combineStart}ms)`);
      
      // Upload combined video to S3
      console.log(`[${requestId}] Uploading to S3...`);
      const uploadStart = Date.now();
      
      const { uploadFile, generateKey } = await import('../lib/s3');
      const outputKey = generateKey(req.userId, `${project.id}_combined.mp4`, 'video');
      
      const outputUrl = await uploadFile(outputKey, outputBuffer, 'video/mp4');
      console.log(`[${requestId}] S3 upload completed (${Date.now() - uploadStart}ms)`);
      
      console.log(`💾 [${requestId}] Updating project status to completed...`);
      await prisma.project.update({
        where: { id: project.id },
        data: { 
          status: 'completed',
          outputPath: outputUrl
        }
      });
      
      const totalTime = Date.now() - projectStart;
      console.log(`[${requestId}] Process completed (${totalTime}ms)`);

      res.json({
        message: 'Video combination completed',
        projectId: project.id,
        status: 'completed',
        outputUrl
      });
    } catch (processingError) {
      console.error(`[${requestId}] Processing error:`, processingError);
      
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'failed' }
      });
      
      throw processingError;
    }
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

    // Get original videos
    const [webcamVideo, gameplayVideo] = await Promise.all([
      prisma.video.findUnique({ where: { id: config.webcamVideoId } }),
      prisma.video.findUnique({ where: { id: config.gameplayVideoId } })
    ]);

    if (!webcamVideo || !gameplayVideo) {
      return res.status(404).json({ error: 'Original videos not found' });
    }

    // Regenerate video with new layout
    const outputBuffer = await combineVideos(webcamVideo.filePath, gameplayVideo.filePath, layoutConfig);
    
    // Upload updated video to S3
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

    // In a real implementation, you would stream the file from S3
    // For now, return the URL
    res.redirect(project.outputPath);
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