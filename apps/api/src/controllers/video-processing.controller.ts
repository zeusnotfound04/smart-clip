import { Request, Response } from 'express';
import { 
  compressVideo, 
  convertVideoFormat, 
  addWatermark,
  extractAudio 
} from '../services/video-processing.service';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Compress video for web delivery
 */
export async function compress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl, quality = 'medium' } = req.body;
    const userId = req.userId;

    if (!videoUrl || !userId) {
      res.status(400).json({ 
        success: false,
        message: 'videoUrl is required'
      });
      return;
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name: `Video Compression ${Date.now()}`,
        type: 'VIDEO_COMPRESSION',
        status: 'processing',
        config: JSON.stringify({
          inputUrl: videoUrl,
          quality
        })
      }
    });

    const compressedUrl = await compressVideo(videoUrl, quality);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        outputPath: compressedUrl,
        progress: 100
      }
    });

    res.json({ 
      success: true,
      compressedUrl,
      projectId: project.id
    });

  } catch (error) {
    console.error('Video compression error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to compress video',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Convert video format
 */
export async function convert(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl, targetFormat } = req.body;
    const userId = req.userId;

    if (!videoUrl || !targetFormat || !userId) {
      res.status(400).json({ 
        success: false,
        message: 'videoUrl and targetFormat are required'
      });
      return;
    }

    const validFormats = ['mp4', 'webm', 'mov', 'avi'];
    if (!validFormats.includes(targetFormat)) {
      res.status(400).json({ 
        success: false,
        message: 'Invalid target format. Supported: mp4, webm, mov, avi'
      });
      return;
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name: `Format Conversion ${Date.now()}`,
        type: 'FORMAT_CONVERSION',
        status: 'processing',
        config: JSON.stringify({
          inputUrl: videoUrl,
          targetFormat
        })
      }
    });

    const convertedUrl = await convertVideoFormat(videoUrl, targetFormat);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        outputPath: convertedUrl,
        progress: 100
      }
    });

    res.json({ 
      success: true,
      convertedUrl,
      projectId: project.id
    });

  } catch (error) {
    console.error('Video conversion error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to convert video',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Add watermark to video
 */
export async function watermark(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl, watermarkText, position = 'bottom-right' } = req.body;
    const userId = req.userId;

    if (!videoUrl || !watermarkText || !userId) {
      res.status(400).json({ 
        success: false,
        message: 'videoUrl and watermarkText are required'
      });
      return;
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name: `Add Watermark ${Date.now()}`,
        type: 'ADD_WATERMARK',
        status: 'processing',
        config: JSON.stringify({
          inputUrl: videoUrl,
          watermarkText,
          position
        })
      }
    });

    const watermarkedUrl = await addWatermark(videoUrl, watermarkText, position);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        outputPath: watermarkedUrl,
        progress: 100
      }
    });

    res.json({ 
      success: true,
      watermarkedUrl,
      projectId: project.id
    });

  } catch (error) {
    console.error('Watermark error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add watermark',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Extract audio from video
 */
export async function extractVideoAudio(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl, format = 'mp3' } = req.body;
    const userId = req.userId;

    if (!videoUrl || !userId) {
      res.status(400).json({ 
        success: false,
        message: 'videoUrl is required'
      });
      return;
    }

    const validFormats = ['mp3', 'wav', 'aac'];
    if (!validFormats.includes(format)) {
      res.status(400).json({ 
        success: false,
        message: 'Invalid audio format. Supported: mp3, wav, aac'
      });
      return;
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name: `Extract Audio ${Date.now()}`,
        type: 'EXTRACT_AUDIO',
        status: 'processing',
        config: JSON.stringify({
          inputUrl: videoUrl,
          format
        })
      }
    });

    const audioUrl = await extractAudio(videoUrl, format);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        outputPath: audioUrl,
        progress: 100
      }
    });

    res.json({ 
      success: true,
      audioUrl,
      projectId: project.id
    });

  } catch (error) {
    console.error('Audio extraction error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to extract audio',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}