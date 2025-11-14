import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getPresignedUploadUrl, deleteFile } from '../lib/s3';

interface AuthRequest extends Request {
  userId?: string;
}

export const getPresignedUrl = async (req: AuthRequest, res: Response) => {
  try {
    const { filename, fileType } = req.body;
    
    if (!filename || !fileType || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const s3Key = `videos/${req.userId}/${Date.now()}-${filename}`;
    const presignedUrl = await getPresignedUploadUrl(s3Key, fileType);

    res.json({ presignedUrl, s3Key });
  } catch (error) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

export const confirmUpload = async (req: AuthRequest, res: Response) => {
  try {
    const { s3Key, originalName, size, mimeType } = req.body;
    
    if (!s3Key || !originalName || !req.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    res.status(201).json({ video });
  } catch (error) {
    console.error('Video confirmation error:', error);
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