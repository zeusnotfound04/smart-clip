import { Request, Response } from 'express';
import axios from 'axios';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Proxy video requests to bypass CORS restrictions
 * This is needed for Twitter/X videos which block direct browser access
 */
export const proxyVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    console.log('🎥 Proxying video request for:', url);

    // Fetch the video with proper headers to bypass CORS
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://twitter.com/',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
    });

    // Set appropriate headers for video streaming
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    // Stream the video data
    response.data.pipe(res);

    response.data.on('error', (error: any) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream video' });
      }
    });

  } catch (error: any) {
    console.error('Video proxy error:', error.message);
    
    if (!res.headersSent) {
      res.status(error.response?.status || 500).json({
        error: 'Failed to proxy video',
        details: error.message,
      });
    }
  }
};
