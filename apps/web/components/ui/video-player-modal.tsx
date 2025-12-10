'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  startTime?: number;
  endTime?: number;
  title?: string;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  startTime = 0,
  endTime,
  title = 'Video Clip'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentTime(startTime);
      setIsLoading(true);
      setVideoError(null);
      setIsPlaying(false);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [isOpen, startTime]);

  // Handle video metadata and initial setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isOpen) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      
      // Set initial time after metadata is loaded
      if (startTime > 0 && startTime < video.duration) {
        video.currentTime = startTime;
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
        
        // Auto-stop at endTime if specified
        if (endTime && video.currentTime >= endTime) {
          video.pause();
          setIsPlaying(false);
          video.currentTime = endTime;
        }
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered(bufferedEnd);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
    };

    const handleSeeking = () => {
      setIsLoading(true);
    };

    const handleSeeked = () => {
      setIsLoading(false);
      setIsSeeking(false);
    };

    const handleError = () => {
      const error = video.error;
      let errorMessage = 'Failed to load video';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video decoding failed';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported or CORS issue';
            break;
        }
      }
      
      setVideoError(errorMessage);
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // Load the video
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [isOpen, videoUrl, startTime, endTime, isSeeking]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    
    setIsSeeking(true);
    const newTime = value[0];
    const clampedTime = Math.max(
      startTime, 
      Math.min(endTime || duration, newTime)
    );
    
    videoRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [startTime, endTime, duration]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, [isFullscreen]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveEndTime = endTime || duration;
  const clipDuration = effectiveEndTime - startTime;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0">
        <div ref={containerRef} className="bg-background">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-6 space-y-4">
            {/* Video Container */}
            <div 
              className="relative bg-black rounded-lg overflow-hidden aspect-video"
              onClick={togglePlayPause}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain cursor-pointer"
                playsInline
                preload="metadata"
              />
              
              {/* Loading Spinner */}
              {isLoading && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm">Loading...</p>
                  </div>
                </div>
              )}
              
              {/* Error Display */}
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  <div className="text-white text-center p-6 max-w-md">
                    <X className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="font-semibold text-lg mb-2">Playback Error</p>
                    <p className="text-sm text-gray-300 mb-4">{videoError}</p>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoError(null);
                        setIsLoading(true);
                        if (videoRef.current) {
                          videoRef.current.load();
                        }
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Play/Pause Overlay */}
              {!isPlaying && !isLoading && !videoError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 rounded-full p-4">
                    <Play className="w-12 h-12 text-white" fill="white" />
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-3">
              {/* Timeline */}
              <div className="space-y-1">
                <div className="relative">
                  <Slider
                    value={[currentTime]}
                    min={startTime}
                    max={effectiveEndTime || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                    disabled={!duration}
                  />
                  {/* Buffered indicator */}
                  {buffered > 0 && duration > 0 && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 h-1 bg-gray-600 rounded-full pointer-events-none"
                      style={{
                        left: '0',
                        width: `${((buffered - startTime) / clipDuration) * 100}%`
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(effectiveEndTime)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayPause}
                    disabled={!!videoError}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>

                  {/* Volume Controls */}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleMute}
                      className="px-2"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        min={0}
                        max={1}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Fullscreen */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleFullscreen}
                  className="px-2"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Clip Info */}
              {(startTime > 0 || endTime) && duration > 0 && (
                <div className="text-xs text-muted-foreground text-center p-2 bg-muted rounded">
                  Clip: {formatTime(startTime)} → {formatTime(effectiveEndTime)} 
                  <span className="ml-2">({formatTime(clipDuration)} duration)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};