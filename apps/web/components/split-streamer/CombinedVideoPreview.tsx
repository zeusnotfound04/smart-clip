'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw,
  Smartphone,
  Monitor,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface VideoFile {
  file: File;
  preview: string;
  type: 'webcam' | 'gameplay';
}

interface LayoutConfig {
  orientation: 'vertical' | 'horizontal';
  topRatio: number;
  bottomRatio: number;
  gap: number;
  backgroundColor: string;
  cornerRadius: number;
  swapVideos: boolean;
  webcamZoom: number;
  gameplayZoom: number;
}

interface CombinedVideoPreviewProps {
  webcamVideo: VideoFile | null;
  gameplayVideo: VideoFile | null;
  layoutConfig: LayoutConfig;
  processingStage: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  outputUrl?: string;
}

export function CombinedVideoPreview({
  webcamVideo,
  gameplayVideo,
  layoutConfig,
  processingStage,
  outputUrl
}: CombinedVideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const gameplayRef = useRef<HTMLVideoElement>(null);
  const outputRef = useRef<HTMLVideoElement>(null);

  const topVideo = layoutConfig.swapVideos ? gameplayVideo : webcamVideo;
  const bottomVideo = layoutConfig.swapVideos ? webcamVideo : gameplayVideo;
  
  const topVideoRef = layoutConfig.swapVideos ? gameplayRef : webcamRef;
  const bottomVideoRef = layoutConfig.swapVideos ? webcamRef : gameplayRef;

  const handlePlayPause = () => {
    if (processingStage === 'completed' && outputRef.current) {
      if (isPlaying) {
        outputRef.current.pause();
      } else {
        outputRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (webcamRef.current && gameplayRef.current) {
      const action = isPlaying ? 'pause' : 'play';
      webcamRef.current[action]();
      gameplayRef.current[action]();
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (outputRef.current) {
      outputRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else if (webcamRef.current && gameplayRef.current) {
      webcamRef.current.muted = !isMuted;
      gameplayRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    const vol = newVolume[0] / 100;
    
    if (outputRef.current) {
      outputRef.current.volume = vol;
    } else if (webcamRef.current && gameplayRef.current) {
      webcamRef.current.volume = vol;
      gameplayRef.current.volume = vol;
    }
  };

  const syncPlayback = () => {
    if (webcamRef.current && gameplayRef.current) {
      const webcamTime = webcamRef.current.currentTime;
      const gameplayTime = gameplayRef.current.currentTime;
      
      // Sync to the video that's ahead (simple sync logic)
      if (Math.abs(webcamTime - gameplayTime) > 0.1) {
        const targetTime = Math.max(webcamTime, gameplayTime);
        webcamRef.current.currentTime = targetTime;
        gameplayRef.current.currentTime = targetTime;
      }
      
      setCurrentTime(webcamTime);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleTimelineSeek = (newTime: number[]) => {
    const targetTime = newTime[0];
    
    if (processingStage === 'completed' && outputRef.current) {
      outputRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    } else if (webcamRef.current && gameplayRef.current) {
      webcamRef.current.currentTime = targetTime;
      gameplayRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const interval = setInterval(syncPlayback, 100);
    return () => clearInterval(interval);
  }, []);

  const previewStyle: React.CSSProperties = {
    backgroundColor: layoutConfig.backgroundColor,
    borderRadius: `${layoutConfig.cornerRadius}px`,
    gap: `${layoutConfig.gap}px`
  };

  const topVideoStyle: React.CSSProperties = {
    height: layoutConfig.orientation === 'vertical' 
      ? `${layoutConfig.topRatio}%` 
      : '100%',
    width: layoutConfig.orientation === 'horizontal' 
      ? `${layoutConfig.topRatio}%` 
      : '100%',
    borderRadius: `${layoutConfig.cornerRadius}px`
  };

  const bottomVideoStyle: React.CSSProperties = {
    height: layoutConfig.orientation === 'vertical' 
      ? `${layoutConfig.bottomRatio}%` 
      : '100%',
    width: layoutConfig.orientation === 'horizontal' 
      ? `${layoutConfig.bottomRatio}%` 
      : '100%',
    borderRadius: `${layoutConfig.cornerRadius}px`
  };

  return (
    <div className="h-full flex flex-col bg-background/30">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Live Preview
            </h3>
            <p className="text-sm text-muted-foreground">
              {processingStage === 'completed' ? 'Final combined video' : 'Real-time layout preview'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
              <Smartphone className="w-3 h-3" />
              9:16 Portrait
            </div>
            {layoutConfig.orientation === 'horizontal' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                <Monitor className="w-3 h-3" />
                16:9 Landscape
              </div>
            )}
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border border-border/50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.25}
                className="h-6 w-6 p-0"
              >
                <ZoomOut className="w-3 h-3" />
              </Button>
              
              <span className="text-xs text-muted-foreground px-2 min-w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="h-6 w-6 p-0"
              >
                <ZoomIn className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="h-6 w-6 p-0"
                title="Reset Zoom"
              >
                <RotateCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Area */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-auto">
        <div 
          className="relative bg-black rounded-lg shadow-2xl transition-transform duration-200 ease-in-out" 
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'center',
            margin: `${Math.max(0, (zoomLevel - 1) * 200)}px`
          }}
        >
          {/* Preview Container */}
          <div 
            className={`relative ${layoutConfig.orientation === 'vertical' ? 'w-72 h-128' : 'w-lg h-72'} overflow-hidden`}
            style={previewStyle}
          >
            {processingStage === 'completed' && outputUrl ? (
              // Show final combined video
              <video
                ref={outputRef}
                src={outputUrl}
                className="w-full h-full object-cover"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              // Show live preview with separate videos
              <div className={`w-full h-full flex ${layoutConfig.orientation === 'vertical' ? 'flex-col' : 'flex-row'}`}>
                {topVideo && (
                  <div style={topVideoStyle} className="relative overflow-hidden">
                    <video
                      ref={topVideoRef}
                      src={topVideo.preview}
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${
                          topVideo.type === 'webcam' ? layoutConfig.webcamZoom : layoutConfig.gameplayZoom
                        })`,
                        transformOrigin: 'center'
                      }}
                      muted={isMuted}
                      loop
                      onTimeUpdate={syncPlayback}
                      onLoadedMetadata={(e) => {
                        if (!duration) setDuration(e.currentTarget.duration);
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {topVideo.type === 'webcam' ? 'Webcam' : 'Gameplay'} ({Math.round((topVideo.type === 'webcam' ? layoutConfig.webcamZoom : layoutConfig.gameplayZoom) * 100)}%)
                    </div>
                  </div>
                )}
                
                {bottomVideo && (
                  <div style={bottomVideoStyle} className="relative overflow-hidden">
                    <video
                      ref={bottomVideoRef}
                      src={bottomVideo.preview}
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${
                          bottomVideo.type === 'webcam' ? layoutConfig.webcamZoom : layoutConfig.gameplayZoom
                        })`,
                        transformOrigin: 'center'
                      }}
                      muted={isMuted}
                      loop
                      onTimeUpdate={syncPlayback}
                      onLoadedMetadata={(e) => {
                        if (!duration) setDuration(e.currentTarget.duration);
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {bottomVideo.type === 'webcam' ? 'Webcam' : 'Gameplay'} ({Math.round((bottomVideo.type === 'webcam' ? layoutConfig.webcamZoom : layoutConfig.gameplayZoom) * 100)}%)
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Processing Overlay */}
            <AnimatePresence>
              {processingStage === 'processing' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 flex items-center justify-center"
                >
                  <div className="text-center space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
                    />
                    <p className="text-white font-medium">Combining Videos...</p>
                    <p className="text-white/70 text-sm">This may take a few minutes</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!webcamVideo && !gameplayVideo && (
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Upload videos to preview</p>
                    <p className="text-sm text-muted-foreground">
                      Your combined split-screen video will appear here
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Timeline Section */}
      {(webcamVideo || gameplayVideo || outputUrl) && (
        <div className="p-4 border-t border-border/50 bg-background/30">
          <div className="space-y-4">
            {/* Timeline Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayPause}
                className="text-primary hover:bg-primary/20"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="min-w-12 text-center">{formatTime(currentTime)}</span>
              </div>
              
              <div className="flex-1">
                <Slider
                  value={[currentTime]}
                  onValueChange={handleTimelineSeek}
                  max={duration || 100}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="min-w-12 text-center">{formatTime(duration)}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMuteToggle}
                className="text-primary hover:bg-primary/20"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <div className="flex items-center gap-2 min-w-24">
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">{volume[0]}%</span>
              </div>
            </div>
            
            {/* Timeline Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Video Timeline</span>
                {processingStage === 'completed' ? (
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded">Final Video</span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Live Preview</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>{Math.round((currentTime / (duration || 1)) * 100)}% played</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Info */}
      <div className="p-4 border-t border-border/50 bg-background/50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Output Format</p>
            <p className="font-medium">
              {layoutConfig.orientation === 'vertical' ? '1080×1920 (9:16)' : '1920×1080 (16:9)'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Layout</p>
            <p className="font-medium">
              {layoutConfig.swapVideos ? 'Gameplay + Webcam' : 'Webcam + Gameplay'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}