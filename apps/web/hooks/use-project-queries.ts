'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Query keys for cache management
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: string) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  videos?: any[];
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

// Hook: Fetch Projects List with filters
export function useProjects(filters: ProjectFilters = {}) {
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
    queryKey: projectKeys.list(filterString),
    queryFn: async (): Promise<ProjectsResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/projects?${filterString}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      return response.json();
    },
    enabled: !!session?.accessToken,
    staleTime: 3 * 60 * 1000, // 3 minutes
    placeholderData: (previousData) => previousData,
  });
}

// Hook: Fetch Single Project Details
export function useProject(projectId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: projectKeys.detail(projectId || ''),
    queryFn: async (): Promise<Project> => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      return data.project;
    },
    enabled: !!session?.accessToken && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Create New Project
export function useCreateProject() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate project lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // Update user stats (project count changed)
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      toast.success('Project created successfully');
    },
    onError: (error) => {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    },
  });
}

// Hook: Update Project
export function useUpdateProject() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Partial<CreateProjectData> }) => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      return response.json();
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate specific project and lists
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      console.error('Update project error:', error);
      toast.error('Failed to update project');
    },
  });
}

// Hook: Delete Project
export function useDeleteProject() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      return response.json();
    },
    onSuccess: (_, projectId) => {
      // Invalidate all project lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // Remove the specific project from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      // Update user stats
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      console.error('Delete project error:', error);
      toast.error('Failed to delete project');
    },
  });
}
