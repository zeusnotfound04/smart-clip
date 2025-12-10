import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getPresignedUploadUrl, deleteFile, getSignedDownloadUrl } from '../lib/s3';
import { ffmpegPreprocessing } from '../services/ffmpeg-preprocessing.service';
import path from 'path';
import fs from 'fs';



interface AuthRequest extends Request {
  userId?: string;
}

export const getPresignedUrl = async (req: AuthRequest, res: Response) => {
  console.log('🔵 [VIDEO_CONTROLLER] getPresignedUrl called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 User ID:', req.userId);
  
  try {
    const { filename, fileType } = req.body;
    
    if (!filename || !fileType || !req.userId) {
      console.error('❌ Missing required fields:', { filename, fileType, userId: req.userId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const s3Key = `videos/${req.userId}/${Date.now()}-${filename}`;
    console.log('🔑 Generated S3 key:', s3Key);
    
    const presignedUrl = await getPresignedUploadUrl(s3Key, fileType);
    console.log('✅ Presigned URL generated successfully');
    
    const response = { presignedUrl, s3Key };
    console.log('📤 Sending response:', { ...response, presignedUrl: '[REDACTED]' });
    res.json(response);
  } catch (error) {
    console.error('❌ [VIDEO_CONTROLLER] getPresignedUrl error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

export const confirmUpload = async (req: AuthRequest, res: Response) => {
  console.log('🟢 [VIDEO_CONTROLLER] confirmUpload called');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 User ID:', req.userId);
  
  try {
    const { s3Key, originalName, size, mimeType, language } = req.body;
    
    if (!s3Key || !originalName || !req.userId) {
      console.error('❌ Missing required fields:', { s3Key, originalName, userId: req.userId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (language) {
      console.log('🌍 Language specified:', language);
    }

    console.log('💾 Creating video record in database...');
    const video = await prisma.video.create({
      data: {
        userId: req.userId,
        originalName,
        filePath: s3Key,
        size: size || 0,
        mimeType: mimeType || 'video/mp4',
        status: 'uploaded'
      }
    });
    console.log('✅ Video record created:', video.id);

    const response = { video };
    console.log('📤 Sending confirmation response');
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ [VIDEO_CONTROLLER] confirmUpload error:', error);
    console.error('🔍 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error
    });
    res.status(500).json({ error: 'Upload confirmation failed' });
  }
};

export const list = async (req: AuthRequest, res: Response) => {
  try {
    const videos = await prisma.video.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        projects: {
          select: { id: true, name: true, type: true, status: true }
        }
      }
    });

    res.json({ videos });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

export const deleteVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const video = await prisma.video.findFirst({
      where: { id, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    try {
      await deleteFile(video.filePath);
    } catch (error) {
      console.log('S3 delete failed, continuing with DB cleanup');
    }

    await prisma.video.delete({
      where: { id }
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};

export const generateClip = async (req: AuthRequest, res: Response) => {
  console.log('🎬 [GENERATE_CLIP] Request received');
  console.log('📝 Request params:', req.params);
  console.log('📝 Request body:', req.body);
  
  try {
    // Accept videoId from either URL params or request body for flexibility
    const videoId = req.params.id || req.body.videoId;
    const { startTime, endTime, format = 'mp4' } = req.body;
    
    if (!videoId || startTime === undefined || endTime === undefined || !req.userId) {
      console.error('❌ Missing required fields:', { videoId, startTime, endTime, userId: req.userId });
      return res.status(400).json({ error: 'Missing required fields: videoId, startTime, endTime' });
    }

    console.log(`🔍 Looking for video ${videoId} for user ${req.userId}`);
    
    // Validate video ownership
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: req.userId }
    });

    if (!video) {
      console.error('❌ Video not found or access denied');
      return res.status(404).json({ error: 'Video not found' });
    }

    console.log(`✅ Video found: ${video.originalName} (${video.filePath})`);

    // Generate clip using FFmpeg service
    const outputDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilename = `clip_${videoId}_${Math.floor(startTime)}s-${Math.floor(endTime)}s_${Date.now()}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log(`🎥 Generating clip: ${startTime}s to ${endTime}s`);
    console.log(`📁 Output path: ${outputPath}`);
    
    try {
      // Use the FFmpeg service to extract the clip
      await ffmpegPreprocessing.extractClip(
        video.filePath, // S3 path
        startTime,
        endTime,
        outputPath,
        req.userId
      );
      
      console.log('✅ Clip generated successfully');

      // Set response headers for download
      res.setHeader('Content-Type', `video/${format}`);
      res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream the file to response
      const fileStream = fs.createReadStream(outputPath);
      
      // Handle streaming errors
      fileStream.on('error', (streamError) => {
        console.error('❌ File stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream clip' });
        }
      });
      
      // Clean up temp file after streaming
      fileStream.on('end', () => {
        console.log('📤 Clip streamed successfully, cleaning up temp file');
        fs.unlink(outputPath, (err) => {
          if (err) {
            console.error('⚠️ Failed to cleanup temp file:', err);
          } else {
            console.log('🗑️ Temp file cleaned up successfully');
          }
        });
      });

      // Handle response close (user cancelled download)
      res.on('close', () => {
        console.log('🚫 Response closed, cleaning up temp file');
        fs.unlink(outputPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('⚠️ Failed to cleanup temp file on close:', err);
          }
        });
      });
      
      fileStream.pipe(res);
      
    } catch (ffmpegError) {
      console.error('❌ FFmpeg service error:', ffmpegError);
      
      // Cleanup temp file if it exists
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
        console.log('🗑️ Cleaned up failed temp file');
      }
      
      return res.status(500).json({ 
        error: 'Failed to generate clip', 
        details: ffmpegError instanceof Error ? ffmpegError.message : 'Unknown error' 
      });
    }
    
  } catch (error) {
    console.error('❌ Generate clip error:', error);
    res.status(500).json({ error: 'Failed to generate clip' });
  }
};

export const streamVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const video = await prisma.video.findFirst({
      where: { id, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Get presigned URL for streaming
    const streamUrl = await getSignedDownloadUrl(video.filePath, 3600); // 1 hour expiry
    
    // Redirect to the presigned URL for streaming
    res.redirect(streamUrl);
    
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
};

