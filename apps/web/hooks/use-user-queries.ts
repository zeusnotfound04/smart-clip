'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Query keys for cache management
export const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  _count?: {
    videos: number;
    projects: number;
  };
}

export interface UserStats {
  creditsAvailable: number;
  videosProcessed: number;
  projectsCreated: number;
  subscriptionTier: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

// Hook: Fetch User Profile (with video/project counts)
export function useUserProfile() {
  const { session } = useAuth();

  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: async (): Promise<UserProfile> => {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      return data.user;
    },
    enabled: !!session?.accessToken,
    staleTime: 10 * 60 * 1000, // 10 minutes (profile changes infrequently)
  });
}

// Hook: Fetch User Stats (credits, videos, projects)
export function useUserStats() {
  const { session } = useAuth();

  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: async (): Promise<UserStats> => {
      const response = await fetch(`${API_BASE_URL}/api/user/stats`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const data = await response.json();
      return data.stats;
    },
    enabled: !!session?.accessToken,
    staleTime: 3 * 60 * 1000, // 3 minutes (stats change more frequently)
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
}

// Hook: Update User Profile
export function useUpdateProfile() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    },
  });
}

// Hook: Upload Profile Picture
export function useUploadProfilePicture() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/api/user/profile/picture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update cache with new image URL
      queryClient.setQueryData(userKeys.profile(), (oldData: UserProfile | undefined) => {
        if (oldData) {
          return { ...oldData, image: data.imageUrl };
        }
        return oldData;
      });
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      toast.success('Profile picture updated!');
    },
    onError: (error) => {
      console.error('Image upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    },
  });
}
