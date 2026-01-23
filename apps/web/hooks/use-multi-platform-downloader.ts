import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export interface VideoDownloadStatus {
  id: string;
  url: string;
  platform: 'rumble' | 'kick' | 'twitch' | 'google-drive' | 'zoom-clip';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileUrl?: string;
  error?: string;
  progress?: number;
  withSubtitles: boolean;
}

export interface VideoInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  platform: string;
  url: string;
}

export interface UseMultiPlatformDownloaderOptions {
  onSuccess?: (video: VideoDownloadStatus) => void;
  onError?: (error: any) => void;
  onInfoFetched?: (info: VideoInfo) => void;
}

export function useMultiPlatformDownloader(options: UseMultiPlatformDownloaderOptions = {}) {
  const [downloading, setDownloading] = useState(false);
  const [gettingInfo, setGettingInfo] = useState(false);
  const [status, setStatus] = useState<VideoDownloadStatus | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectPlatform = useCallback((url: string): string => {
    if (url.includes('rumble.com')) return 'rumble';
    if (url.includes('kick.com')) return 'kick';
    if (url.includes('twitch.tv')) return 'twitch';
    if (url.includes('drive.google.com')) return 'google-drive';
    if (url.includes('zoom.us') && url.includes('/clips/share/')) return 'zoom-clip';
    return '';
  }, []);

  const getVideoInfo = useCallback(
    async (url: string) => {
      setGettingInfo(true);
      setError(null);

      try {
        const response = await apiClient.multiPlatform.getVideoInfo(url);
        const info = response.data as VideoInfo;
        setVideoInfo(info);
        options.onInfoFetched?.(info);
        return info;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to get video info';
        setError(errorMessage);
        options.onError?.(err);
        throw err;
      } finally {
        setGettingInfo(false);
      }
    },
    [options]
  );

  const downloadVideo = useCallback(
    async (url: string, userId: string, withSubtitles: boolean = false) => {
      setDownloading(true);
      setError(null);
      setStatus(null);

      try {
        const response = withSubtitles
          ? await apiClient.multiPlatform.downloadWithSubtitles(url, userId)
          : await apiClient.multiPlatform.download(url, userId);

        const video = response.data.video as VideoDownloadStatus;
        setStatus(video);
        options.onSuccess?.(video);
        return video;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to start download';
        setError(errorMessage);
        options.onError?.(err);
        throw err;
      } finally {
        setDownloading(false);
      }
    },
    [options]
  );

  const checkStatus = useCallback(
    async (videoId: string) => {
      try {
        const response = await apiClient.multiPlatform.getStatus(videoId);
        const video = response.data.video as VideoDownloadStatus;
        setStatus(video);
        return video;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to check status';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setDownloading(false);
    setGettingInfo(false);
    setStatus(null);
    setVideoInfo(null);
    setError(null);
  }, []);

  return {
    downloading,
    gettingInfo,
    status,
    videoInfo,
    error,
    detectPlatform,
    getVideoInfo,
    downloadVideo,
    checkStatus,
    reset,
  };
}
