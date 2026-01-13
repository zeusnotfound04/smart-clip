import { Request, Response } from 'express';

/**
 * API Documentation endpoint
 */
export async function apiDocs(req: Request, res: Response): Promise<void> {
  const baseUrl = `${req.protocol}://${req.get('host')}/api`;
  
  const endpoints = {
    "SmartClips API": "Complete video processing and AI-powered content creation API",
    "version": "1.0.0",
    "baseUrl": baseUrl,
    "endpoints": {
      "Authentication": {
        "POST /auth/register": "Register new user",
        "POST /auth/login": "Login user",
        "POST /auth/logout": "Logout user",
        "GET /auth/me": "Get current user info"
      },
      "Videos": {
        "GET /videos": "List user videos",
        "POST /videos/upload-url": "Get presigned URL for video upload",
        "POST /videos/confirm-upload": "Confirm video upload completion",
        "DELETE /videos/:id": "Delete video"
      },
      "Projects": {
        "GET /projects": "List user projects",
        "POST /projects": "Create new project",
        "GET /projects/:id": "Get project details",
        "DELETE /projects/:id": "Delete project"
      },
      "Auto Subtitles": {
        "POST /subtitles/generate": "Generate subtitles for video (AI-powered)",
        "GET /subtitles/:videoId": "Get video subtitles",
        "PUT /subtitles/:id": "Update subtitle text/timing",
        "POST /subtitles/export/:videoId": "Export video with embedded subtitles",
        "GET /subtitles/download/:videoId": "Download SRT subtitle file"
      },
      "Split Streamer": {
        "POST /split-streamer/combine": "Combine webcam and gameplay videos",
        "POST /split-streamer/preview": "Generate preview frame for composition"
      },
      "Smart Clipper": {
        "POST /smart-clipper/analyze": "Analyze video for highlights (AI-powered)",
        "POST /smart-clipper/extract": "Extract clip from video",
        "GET /smart-clipper/clips/:videoId": "Get clips for a video"
      },
      "AI Script Generator": {
        "POST /script-generator/generate": "Generate script from prompt (AI-powered)",
        "GET /script-generator/templates": "Get available script templates",
        "POST /script-generator/refine": "Refine existing script"
      },
      "Video Processing": {
        "POST /video-processing/compress": "Compress video for web delivery",
        "POST /video-processing/convert": "Convert video format",
        "POST /video-processing/watermark": "Add watermark to video",
        "POST /video-processing/extract-audio": "Extract audio from video"
      },
      "Thumbnails": {
        "POST /thumbnails/generate": "Generate video thumbnail",
        "POST /thumbnails/sprite": "Generate thumbnail sprite sheet",
        "GET /thumbnails/metadata": "Get video metadata"
      },
      "Status & Monitoring": {
        "GET /status/job/:type/:jobId": "Check job processing status",
        "GET /status/project/:projectId": "Check project status",
        "GET /health": "Basic health check",
        "GET /health/detailed": "Detailed service health check",
        "GET /health/status": "Service statistics and metrics"
      }
    },
    "features": {
      "AI-Powered": [
        "Google Cloud Speech-to-Text for subtitle generation",
        "Google Cloud Video Intelligence for highlight detection",
        "Google Gemini AI for script generation",
        "Google Text-to-Speech for conversation videos"
      ],
      "Video Processing": [
        "FFmpeg-based video manipulation",
        "Format conversion (MP4, WebM, MOV, AVI)",
        "Video compression with quality options",
        "Clip extraction and trimming",
        "Watermark addition",
        "Audio extraction"
      ],
      "Storage": [
        "AWS S3 integration with presigned URLs",
        "Direct client-to-S3 uploads",
        "Automatic file management"
      ],
      "Background Processing": [
        "Redis-backed job queues",
        "Progress tracking for long-running tasks",
        "Automatic retry on failures",
        "Status monitoring"
      ]
    },
    "authentication": {
      "type": "Bearer Token (JWT)",
      "header": "Authorization: Bearer <token>",
      "note": "Most endpoints require authentication"
    },
    "rateLimits": {
      "default": "1000 requests per 15 minutes per IP",
      "note": "Rate limits may vary by endpoint"
    },
    "supportedFormats": {
      "video": ["mp4", "webm", "mov", "avi", "mkv"],
      "audio": ["mp3", "wav", "aac", "m4a"],
      "image": ["jpg", "jpeg", "png", "gif"]
    }
  };

  res.json(endpoints);
}