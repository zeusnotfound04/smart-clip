'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface Clip {
  id: string;
  originalName: string;
  title: string | null;
  filePath: string;
  videoUrl?: string;
}

interface UseVideoSelectorOptions {
  onSuccess?: (data: { videoId?: string; file?: File; source: 'my-clips' | 'local' }) => void;
  autoIncrementUsage?: boolean;
}

export function useVideoSelector(options: UseVideoSelectorOptions = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openSelector = () => setIsModalOpen(true);
  const closeSelector = () => setIsModalOpen(false);

  const handleSelect = async (
    clipOrFile: Clip | File,
    source: 'my-clips' | 'local'
  ) => {
    if (source === 'my-clips' && 'id' in clipOrFile) {
      // Handle existing clip selection
      const clip = clipOrFile as Clip;

      // Increment usage count if enabled
      if (options.autoIncrementUsage) {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('smartclips_token') : null;
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/my-clips/${clip.id}/use`,
            {
              method: 'POST',
              headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
        } catch (error) {
          console.error('Failed to increment usage count:', error);
          // Don't block the flow if this fails
        }
      }

      options.onSuccess?.({
        videoId: clip.id,
        source: 'my-clips',
      });

      toast.success('Clip selected from My Clips');
    } else if (source === 'local' && clipOrFile instanceof File) {
      // Handle new file upload
      const file = clipOrFile;

      options.onSuccess?.({
        file,
        source: 'local',
      });

      toast.success('File selected for upload');
    }

    closeSelector();
  };

  return {
    isModalOpen,
    openSelector,
    closeSelector,
    handleSelect,
  };
}
