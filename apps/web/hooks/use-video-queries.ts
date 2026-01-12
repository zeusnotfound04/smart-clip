'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Query keys for cache management
export const videoKeys = {
  all: ['videos'] as const,
  lists: () => [...videoKeys.all, 'list'] as const,
  list: (filters: string) => [...videoKeys.lists(), filters] as const,
  details: () => [...videoKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoKeys.details(), id] as const,
};

export interface Video {
  id: string;
  title: string;
  description?: string;
  status: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideosResponse {
  videos: Video[];
  total: number;
  page: number;
  limit: number;
}

export interface VideoFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// 🔥 Hook: Fetch Videos List with filters
export function useVideos(filters: VideoFilters = {}) {
  const { session } = useAuth();
  
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.order) params.append('order', filters.order);

  const filterString = params.toString();

  return useQuery({
    queryKey: videoKeys.list(filterString),
    queryFn: async (): Promise<VideosResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/videos?${filterString}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      return response.json();
    },
    enabled: !!session?.accessToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

// 🔥 Hook: Fetch Single Video Details
export function useVideo(videoId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: videoKeys.detail(videoId || ''),
    queryFn: async (): Promise<Video> => {
      const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch video');
      }

      const data = await response.json();
      return data.video;
    },
    enabled: !!session?.accessToken && !!videoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// 🔥 Hook: Delete Video
export function useDeleteVideo() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      return response.json();
    },
    onSuccess: (_, videoId) => {
      // Invalidate all video lists
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() });
      // Remove the specific video from cache
      queryClient.removeQueries({ queryKey: videoKeys.detail(videoId) });
      // Update user stats (video count changed)
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      toast.success('Video deleted successfully');
    },
    onError: (error) => {
      console.error('Delete video error:', error);
      toast.error('Failed to delete video');
    },
  });
}
