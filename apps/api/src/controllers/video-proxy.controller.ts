import { Request, Response } from 'express';
import axios from 'axios';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Proxy video requests to bypass CORS restrictions
 * Supports Twitter/X, Instagram, and other video platforms
 */
export const proxyVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    console.log('[Video Proxy] Proxying request for:', url);

    // Determine platform and set appropriate headers
    const isInstagram = url.includes('instagram.com') || url.includes('cdninstagram.com');
    const isTwitter = url.includes('twitter.com') || url.includes('twimg.com');
    
    // Base headers for all requests
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
    };

    // Platform-specific headers
    if (isInstagram) {
      headers['Referer'] = 'https://www.instagram.com/';
      headers['Origin'] = 'https://www.instagram.com';
      headers['sec-ch-ua'] = '"Not(A:Brand";v="8", "Chromium";v="144"';
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = '"Windows"';
      headers['sec-fetch-dest'] = 'video';
      headers['sec-fetch-mode'] = 'cors';
      headers['sec-fetch-site'] = 'cross-site';
      console.log('[Video Proxy] Using Instagram-specific headers');
    } else if (isTwitter) {
      headers['Referer'] = 'https://twitter.com/';
      headers['Origin'] = 'https://twitter.com';
      console.log('[Video Proxy] Using Twitter-specific headers');
    }

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers,
      timeout: 60000, // Increased timeout for large videos
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400, // Accept redirects
    });

    // Log response details
    console.log('[Video Proxy] Response status:', response.status);
    console.log('[Video Proxy] Content-Type:', response.headers['content-type']);
    console.log('[Video Proxy] Content-Length:', response.headers['content-length']);

    // Set response headers
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
    
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }

    // Pipe the video stream to response
    response.data.pipe(res);

    response.data.on('error', (error: any) => {
      console.error('[Video Proxy] Stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream video' });
      }
    });

    // Log when streaming completes
    response.data.on('end', () => {
      console.log('[Video Proxy] Streaming completed successfully');
    });

  } catch (error: any) {
    console.error('[Video Proxy] Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: req.query.url,
    });
    
    if (!res.headersSent) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.code === 'ECONNABORTED' 
        ? 'Request timeout - video may be too large or server is slow'
        : error.code === 'ENOTFOUND'
        ? 'Video URL not found or DNS resolution failed'
        : error.message;

      res.status(statusCode).json({
        error: 'Failed to proxy video',
        details: errorMessage,
        code: error.code,
      });
    }
  }
};
