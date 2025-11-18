import { Request, Response } from 'express';
import { videoProcessingQueue } from '../lib/queues';
import { prisma } from '../lib/prisma';
import { combineVideos } from '../services/split-streamer.service';

interface AuthRequest extends Request {
  userId?: string;
}

export const combine = async (req: AuthRequest, res: Response) => {
  try {
    const { webcamVideoId, gameplayVideoId, layoutConfig } = req.body;
    
    if (!webcamVideoId || !gameplayVideoId || !req.userId) {
      return res.status(400).json({ error: 'Both webcam and gameplay video IDs are required' });
    }

    // Get video details from database
    const [webcamVideo, gameplayVideo] = await Promise.all([
      prisma.video.findUnique({ where: { id: webcamVideoId } }),
      prisma.video.findUnique({ where: { id: gameplayVideoId } })
    ]);

    if (!webcamVideo || !gameplayVideo) {
      return res.status(404).json({ error: 'One or both videos not found' });
    }

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

    // Process videos directly (for now, can be moved to queue later)
    try {
      const outputBuffer = await combineVideos(webcamVideo.filePath, gameplayVideo.filePath, layoutConfig);
      
      // In a real implementation, you would upload the output to S3 and save the URL
      const outputUrl = `https://smart-clip-temp.s3.ap-south-1.amazonaws.com/combined/${project.id}_combined.mp4`;
      
      await prisma.project.update({
        where: { id: project.id },
        data: { 
          status: 'completed',
          outputPath: outputUrl
        }
      });

      res.json({
        message: 'Video combination completed',
        projectId: project.id,
        status: 'completed',
        outputUrl
      });
    } catch (processingError) {
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'failed' }
      });
      throw processingError;
    }
  } catch (error) {
    console.error('Error combining videos:', error);
    res.status(500).json({ error: 'Failed to combine videos' });
  }
};

export const updateLayout = async (req: AuthRequest, res: Response) => {
  try {
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
    
    const outputUrl = `https://smart-clip-temp.s3.ap-south-1.amazonaws.com/combined/${project.id}_combined.mp4`;
    
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