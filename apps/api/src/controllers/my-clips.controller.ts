import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getSignedDownloadUrl } from '../lib/s3';

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Get all clips for the authenticated user
 * Supports filtering by favorites, tags, and sorting
 */
export const getMyClips = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      favorite, 
      tags, 
      sortBy = 'createdAt', 
      order = 'desc',
      limit,
      offset = 0 
    } = req.query;

    const where: any = { 
      userId: req.userId,
      status: 'uploaded' // Only show successfully uploaded videos
    };

    // Filter by favorite
    if (favorite === 'true') {
      where.isFavorite = true;
    }

    // Filter by tags
    if (tags) {
      const tagArray = typeof tags === 'string' ? tags.split(',') : tags;
      where.tags = {
        hasSome: tagArray
      };
    }

    const orderBy: any = {};
    orderBy[sortBy as string] = order;

    const videos = await prisma.video.findMany({
      where,
      orderBy,
      take: limit ? parseInt(limit as string) : undefined,
      skip: parseInt(offset as string),
      select: {
        id: true,
        originalName: true,
        title: true,
        description: true,
        filePath: true,
        thumbnailPath: true,
        duration: true,
        size: true,
        mimeType: true,
        tags: true,
        isFavorite: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            smartClipperProjects: true
          }
        }
      }
    });

    // Generate signed URLs for videos and thumbnails
    const clipsWithUrls = await Promise.all(
      videos.map(async (video) => {
        const videoUrl = await getSignedDownloadUrl(video.filePath);
        const thumbnailUrl = video.thumbnailPath 
          ? await getSignedDownloadUrl(video.thumbnailPath)
          : null;

        return {
          ...video,
          videoUrl,
          thumbnailUrl,
          projectCount: video._count.projects + video._count.smartClipperProjects
        };
      })
    );

    // Get total count for pagination
    const totalCount = await prisma.video.count({ where });

    res.json({
      clips: clipsWithUrls,
      pagination: {
        total: totalCount,
        offset: parseInt(offset as string),
        limit: limit ? parseInt(limit as string) : clipsWithUrls.length
      }
    });
  } catch (error) {
    console.error('Get my clips error:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
};

/**
 * Get a specific clip by ID
 */
export const getClipById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findFirst({
      where: { 
        id, 
        userId: req.userId 
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        smartClipperProjects: {
          select: {
            id: true,
            contentType: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const videoUrl = await getSignedDownloadUrl(video.filePath);
    const thumbnailUrl = video.thumbnailPath 
      ? await getSignedDownloadUrl(video.thumbnailPath)
      : null;

    res.json({
      clip: {
        ...video,
        videoUrl,
        thumbnailUrl
      }
    });
  } catch (error) {
    console.error('Get clip by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch clip' });
  }
};

/**
 * Update clip metadata (title, description, tags)
 */
export const updateClipMetadata = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;

    // Verify ownership
    const video = await prisma.video.findFirst({
      where: { id, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: updateData
    });

    res.json({ clip: updatedVideo });
  } catch (error) {
    console.error('Update clip metadata error:', error);
    res.status(500).json({ error: 'Failed to update clip' });
  }
};

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findFirst({
      where: { id, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: { isFavorite: !video.isFavorite }
    });

    res.json({ 
      clip: updatedVideo,
      message: updatedVideo.isFavorite ? 'Added to favorites' : 'Removed from favorites'
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
};

/**
 * Search clips by name, title, or tags
 */
export const searchMyClips = async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = q.toLowerCase();

    const videos = await prisma.video.findMany({
      where: {
        userId: req.userId,
        status: 'uploaded',
        OR: [
          {
            originalName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        title: true,
        description: true,
        thumbnailPath: true,
        duration: true,
        tags: true,
        isFavorite: true,
        createdAt: true
      }
    });

    const clipsWithUrls = await Promise.all(
      videos.map(async (video) => {
        const thumbnailUrl = video.thumbnailPath 
          ? await getSignedDownloadUrl(video.thumbnailPath)
          : null;

        return {
          ...video,
          thumbnailUrl
        };
      })
    );

    res.json({ clips: clipsWithUrls });
  } catch (error) {
    console.error('Search clips error:', error);
    res.status(500).json({ error: 'Failed to search clips' });
  }
};

/**
 * Increment usage count when a clip is reused
 */
export const incrementClipUsage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findFirst({
      where: { id, userId: req.userId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });

    res.json({ clip: updatedVideo });
  } catch (error) {
    console.error('Increment clip usage error:', error);
    res.status(500).json({ error: 'Failed to update clip usage' });
  }
};
