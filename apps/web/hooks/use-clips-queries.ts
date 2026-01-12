'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Query keys for cache management
export const clipKeys = {
  all: ['clips'] as const,
  lists: () => [...clipKeys.all, 'list'] as const,
  list: (filters: string) => [...clipKeys.lists(), filters] as const,
  details: () => [...clipKeys.all, 'detail'] as const,
  detail: (id: string) => [...clipKeys.details(), id] as const,
};

export interface Clip {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  isFavorite: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface ClipsResponse {
  clips: Clip[];
  total: number;
  page: number;
  limit: number;
}

export interface ClipFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  isFavorite?: boolean;
}

// 🔥 Hook: Fetch Clips List with filters
export function useClips(filters: ClipFilters = {}) {
  const { session } = useAuth();
  
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.order) params.append('order', filters.order);
  if (filters.isFavorite !== undefined) params.append('isFavorite', filters.isFavorite.toString());

  const filterString = params.toString();

  return useQuery({
    queryKey: clipKeys.list(filterString),
    queryFn: async (): Promise<ClipsResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/my-clips?${filterString}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clips');
      }

      return response.json();
    },
    enabled: !!session?.accessToken,
    staleTime: 2 * 60 * 1000, // 2 minutes (clips don't change often)
    placeholderData: (previousData) => previousData,
  });
}

// 🔥 Hook: Fetch Single Clip Details
export function useClip(clipId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: clipKeys.detail(clipId || ''),
    queryFn: async (): Promise<Clip> => {
      const response = await fetch(`${API_BASE_URL}/api/my-clips/${clipId}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clip');
      }

      const data = await response.json();
      return data.clip;
    },
    enabled: !!session?.accessToken && !!clipId,
    staleTime: 5 * 60 * 1000,
  });
}

// 🔥 Hook: Toggle Clip Favorite
export function useToggleClipFavorite() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clipId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/my-clips/${clipId}/favorite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }

      return response.json();
    },
    onMutate: async (clipId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: clipKeys.detail(clipId) });

      // Snapshot previous value
      const previousClip = queryClient.getQueryData<Clip>(clipKeys.detail(clipId));

      // Optimistically update
      queryClient.setQueryData<Clip>(clipKeys.detail(clipId), (old) => {
        if (old) {
          return { ...old, isFavorite: !old.isFavorite };
        }
        return old;
      });

      return { previousClip };
    },
    onError: (err, clipId, context) => {
      // Rollback on error
      if (context?.previousClip) {
        queryClient.setQueryData(clipKeys.detail(clipId), context.previousClip);
      }
      toast.error('Failed to update favorite');
    },
    onSuccess: () => {
      // Invalidate lists to update favorite counts
      queryClient.invalidateQueries({ queryKey: clipKeys.lists() });
      toast.success('Favorite updated');
    },
  });
}

// 🔥 Hook: Delete Clip
export function useDeleteClip() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clipId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/my-clips/${clipId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete clip');
      }

      return response.json();
    },
    onSuccess: (_, clipId) => {
      // Invalidate all clip lists
      queryClient.invalidateQueries({ queryKey: clipKeys.lists() });
      // Remove the specific clip from cache
      queryClient.removeQueries({ queryKey: clipKeys.detail(clipId) });
      toast.success('Clip deleted successfully');
    },
    onError: (error) => {
      console.error('Delete clip error:', error);
      toast.error('Failed to delete clip');
    },
  });
}

// 🔥 Hook: Mark Clip as Used (updates lastUsedAt)
export function useMarkClipAsUsed() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clipId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/my-clips/${clipId}/use`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark clip as used');
      }

      return response.json();
    },
    onSuccess: (_, clipId) => {
      // Update the clip's lastUsedAt in cache
      queryClient.invalidateQueries({ queryKey: clipKeys.detail(clipId) });
      queryClient.invalidateQueries({ queryKey: clipKeys.lists() });
    },
  });
}
