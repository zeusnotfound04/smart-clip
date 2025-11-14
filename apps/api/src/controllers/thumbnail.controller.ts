import { Request, Response } from 'express';
import { generateThumbnail, generateThumbnailSprite, getVideoMetadata } from '../services/thumbnail.service';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Generate single thumbnail
 */
export async function generateVideoThumbnail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl, timestamp = 0, width = 320, height = 180 } = req.body;

    if (!videoUrl) {
      res.status(400).json({ 
        success: false,
        message: 'videoUrl is required'
      });
      return;
    }

    const thumbnailUrl = await generateThumbnail(videoUrl, timestamp, width, height);

    res.json({ 
      success: true,
      thumbnailUrl,
      timestamp
    });

  } catch (error) {
    console.error('Generate thumbnail error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate thumbnail',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate thumbnail sprite sheet
 */
export async function generateSprite(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl, count = 10, width = 160, height = 90 } = req.body;

    if (!videoUrl) {
      res.status(400).json({ 
        success: false,
        message: 'videoUrl is required'
      });
      return;
    }

    const sprite = await generateThumbnailSprite(videoUrl, count, width, height);

    res.json({ 
      success: true,
      ...sprite
    });

  } catch (error) {
    console.error('Generate sprite error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate sprite',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get video metadata
 */
export async function getMetadata(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { videoUrl } = req.query;

    if (!videoUrl || typeof videoUrl !== 'string') {
      res.status(400).json({ 
        success: false,
        message: 'videoUrl query parameter is required'
      });
      return;
    }

    const metadata = await getVideoMetadata(videoUrl);

    res.json({ 
      success: true,
      metadata
    });

  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get video metadata',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}