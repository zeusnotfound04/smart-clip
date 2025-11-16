'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  Settings,
  Download,
  Share2,
  Scissors,
  Subtitles,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  title: string;
  duration?: number;
  autoPlay?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface Marker {
  time: number;
  label: string;
  type: 'highlight' | 'chapter' | 'clip';
}

const mockSubtitles: Subtitle[] = [
  { start: 0, end: 3, text: "Welcome to this amazing video tutorial" },
  { start: 3, end: 7, text: "Today we'll explore AI-powered content creation" },
  { start: 7, end: 12, text: "This technology is revolutionizing how we work" },
  { start: 12, end: 16, text: "Let's dive into the key features and benefits" }
];

const mockMarkers: Marker[] = [
  { time: 5, label: "Introduction", type: 'chapter' },
  { time: 25, label: "Key Feature Demo", type: 'highlight' },
  { time: 45, label: "Best Practices", type: 'chapter' },
  { time: 65, label: "Epic Moment", type: 'clip' },
  { time: 85, label: "Conclusion", type: 'chapter' }
];

export function VideoPlayer({ 
  src, 
  title, 
  duration = 90, 
  autoPlay = false, 
  className,
  onTimeUpdate,
  onEnded 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (newMuted) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = volume;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCurrentSubtitle = () => {
    return mockSubtitles.find(
      subtitle => currentTime >= subtitle.start && currentTime <= subtitle.end
    );
  };

  const getMarkerPosition = (time: number) => {
    return (time / duration) * 100;
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'highlight': return 'bg-foreground';
      case 'chapter': return 'bg-muted-foreground';
      case 'bookmark': return 'bg-border';
      default: return 'bg-muted';
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', () => {
        setIsPlaying(false);
        onEnded?.();
      });

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [isDragging]);

  const currentSubtitle = getCurrentSubtitle();

  return (
    <Card className={cn("relative bg-black overflow-hidden", className)}>
      <CardContent className="p-0">
        <div 
          className="relative group"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(true)}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full aspect-video object-contain bg-black"
            src={src}
            autoPlay={autoPlay}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setCurrentTime(0);
              }
            }}
          />

          {/* Subtitles Overlay */}
          {showSubtitles && currentSubtitle && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded text-center max-w-2xl">
              <p className="text-lg">{currentSubtitle.text}</p>
            </div>
          )}

          {/* Play/Pause Center Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.button
              onClick={togglePlay}
              className={cn(
                "w-16 h-16 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all",
                isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </motion.button>
          </div>

          {/* Controls Overlay */}
          <motion.div
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-4 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Timeline with Markers */}
            <div className="relative mb-4">
              <div className="relative">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSeek}
                  onValueCommit={() => setIsDragging(false)}
                  onPointerDown={() => setIsDragging(true)}
                  className="cursor-pointer"
                />
                
                {/* Timeline Markers */}
                {mockMarkers.map((marker, index) => (
                  <div
                    key={index}
                    className={cn(
                      "absolute top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full cursor-pointer",
                      getMarkerColor(marker.type)
                    )}
                    style={{ left: `${getMarkerPosition(marker.time)}%` }}
                    title={`${marker.label} (${formatTime(marker.time)})`}
                    onClick={() => handleSeek([marker.time])}
                  />
                ))}
              </div>
              
              {/* Time Display */}
              <div className="flex justify-between text-xs text-white/80 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                {/* Skip Buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => skipTime(-10)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => skipTime(10)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>

                {/* Volume Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {/* Playback Rate */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 text-xs px-2 h-8"
                    >
                      {playbackRate}x
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <DropdownMenuItem
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={rate === playbackRate ? 'bg-accent' : ''}
                      >
                        {rate}x
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2">
                {/* Subtitles Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className={cn(
                    "text-white hover:bg-white/20 h-8 w-8 p-0",
                    showSubtitles && "bg-white/20"
                  )}
                >
                  <Subtitles className="w-4 h-4" />
                </Button>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Scissors className="w-4 h-4 mr-2" />
                      Create Clip
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Download Video
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Video
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      Video Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}