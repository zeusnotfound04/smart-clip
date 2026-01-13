/**
 * Tanstack Query Hooks - Centralized Export
 * 
 * Import all query hooks from a single location:
 * import { useUserProfile, useVideos, useClips } from '@/hooks/queries';
 */

// User queries
export {
  useUserProfile,
  useUserStats,
  useUpdateProfile,
  useUploadProfilePicture,
  userKeys,
} from './use-user-queries';

// Video queries
export {
  useVideos,
  useVideo,
  useDeleteVideo,
  videoKeys,
} from './use-video-queries';

// Clips queries
export {
  useClips,
  useClip,
  useToggleClipFavorite,
  useDeleteClip,
  useMarkClipAsUsed,
  clipKeys,
} from './use-clips-queries';

// Project queries
export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  projectKeys,
} from './use-project-queries';

// Re-export types
export type {
  UserProfile,
  UserStats,
  UpdateProfileData,
} from './use-user-queries';

export type {
  Video,
  VideosResponse,
  VideoFilters,
} from './use-video-queries';

export type {
  Clip,
  ClipsResponse,
  ClipFilters,
} from './use-clips-queries';

export type {
  Project,
  ProjectsResponse,
  ProjectFilters,
  CreateProjectData,
} from './use-project-queries';
