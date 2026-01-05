'use client';

import { motion } from 'framer-motion';
import { FileVideo, CheckCircle, Star, Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useRef, useState, useEffect } from 'react';

type UploadStage = 'idle' | 'configuring' | 'downloading' | 'uploading' | 'processing' | 'completed' | 'error';

interface SubtitleStyle {
  textCase: 'normal' | 'uppercase' | 'lowercase' | 'capitalize';
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  outlineColor: string;
  shadowColor: string;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right';
  showShadow: boolean;
}

interface VideoPreviewAreaProps {
  videoPreviewUrl: string | null;
  uploadStage: UploadStage;
  subtitleStyle: SubtitleStyle;
  demoText: string;
  onDemoTextChange: (text: string) => void;
  subtitledVideoUrl?: string | null;
}

export function VideoPreviewArea({
  videoPreviewUrl,
  uploadStage,
  subtitleStyle,
  demoText,
  onDemoTextChange,
  subtitledVideoUrl
}: VideoPreviewAreaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Check if URL is a YouTube URL
  const isYouTubeUrl = (url: string | null) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };
  
  // Check if URL is a Twitter/X tweet URL (not direct video)
  const isTwitterUrl = (url: string | null) => {
    if (!url) return false;
    // Only return true if it's a tweet URL (has /status/), not a direct video URL
    const isTweetUrl = (url.includes('twitter.com') || url.includes('x.com')) && url.includes('/status/');
    // Exclude if it's a direct video URL (contains video.twimg.com or similar)
    const isDirectVideo = url.includes('video.twimg.com') || url.includes('.mp4') || url.includes('.m3u8');
    return isTweetUrl && !isDirectVideo;
  };
  
  // Convert YouTube URL to embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      let videoId = '';
      
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || '';
      }
      
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1` : url;
    } catch {
      return url;
    }
  };
  
  // Convert Twitter/X URL to embed URL
  const getTwitterEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const statusIndex = pathParts.indexOf('status');
      
      if (statusIndex !== -1 && pathParts[statusIndex + 1]) {
        const tweetId = pathParts[statusIndex + 1].split('?')[0];
        return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark`;
      }
      
      return url;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoPreviewUrl]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const formatDemoText = (text: string) => {
    switch (subtitleStyle.textCase) {
      case 'uppercase': return text.toUpperCase();
      case 'lowercase': return text.toLowerCase();
      case 'capitalize': 
        return text.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      default: return text;
    }
  };

  return (
    <div className="h-full p-4 overflow-hidden flex flex-col">
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full overflow-hidden">
          {(videoPreviewUrl || subtitledVideoUrl) ? (
            <div className="w-full h-full flex flex-col">
              {/* Video Container */}
              <div className="relative flex-1 bg-black rounded-t-lg overflow-hidden flex items-center justify-center">
                {(() => {
                  const isYouTube = isYouTubeUrl(videoPreviewUrl);
                  const isTwitter = isTwitterUrl(videoPreviewUrl);
                  const shouldUseIframe = (isYouTube || isTwitter) && !subtitledVideoUrl;
                  
                  console.log('🎥 VideoPreviewArea rendering decision:');
                  console.log('   - videoPreviewUrl:', videoPreviewUrl);
                  console.log('   - subtitledVideoUrl:', subtitledVideoUrl);
                  console.log('   - isYouTube:', isYouTube);
                  console.log('   - isTwitter (tweet URL check):', isTwitter);
                  console.log('   - shouldUseIframe:', shouldUseIframe);
                  console.log('   - Contains .mp4:', videoPreviewUrl?.includes('.mp4'));
                  console.log('   - Contains video.twimg.com:', videoPreviewUrl?.includes('video.twimg.com'));
                  
                  if (shouldUseIframe) {
                    const embedUrl = isYouTube 
                      ? getYouTubeEmbedUrl(videoPreviewUrl!)
                      : getTwitterEmbedUrl(videoPreviewUrl!);
                    console.log('📺 Using iframe with URL:', embedUrl);
                    return (
                      <div className="w-full h-full relative">
                        {isTwitter && (
                          <div className="absolute top-2 right-2 z-10 bg-blue-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                            Tweet Preview - Video will be extracted
                          </div>
                        )}
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ border: 'none' }}
                        />
                      </div>
                    );
                  } else {
                    console.log('📹 Using video element');
                    return (
                      <video
                        ref={videoRef}
                        src={subtitledVideoUrl || videoPreviewUrl || undefined}
                        className="w-full h-full object-cover"
                        muted={isMuted}
                        style={{ objectFit: 'contain' }}
                      />
                    );
                  }
                })()}
                
                {/* Subtitle Overlay - Only show demo text if using original video */}
                {!subtitledVideoUrl && (
                  <div 
                    className="absolute bottom-8 left-0 right-0 px-4 pointer-events-none"
                    style={{
                      display: 'flex',
                      justifyContent: subtitleStyle.alignment === 'left' 
                        ? 'flex-start' 
                        : subtitleStyle.alignment === 'right' 
                          ? 'flex-end' 
                          : 'center'
                    }}
                  >
                    <motion.div
                      key={`${subtitleStyle.fontFamily}-${subtitleStyle.fontSize}-${subtitleStyle.primaryColor}-${subtitleStyle.alignment}-${subtitleStyle.showShadow}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative max-w-[80%]"
                    >
                      <span 
                        style={{
                          fontFamily: subtitleStyle.fontFamily,
                          fontSize: `${Math.max(16, Math.min(24, subtitleStyle.fontSize * 0.8))}px`,
                          color: subtitleStyle.primaryColor,
                          fontWeight: subtitleStyle.bold ? 'bold' : 'normal',
                          fontStyle: subtitleStyle.italic ? 'italic' : 'normal',
                          textShadow: subtitleStyle.showShadow 
                            ? `3px 3px 6px ${subtitleStyle.shadowColor}, 1px 1px 2px ${subtitleStyle.outlineColor}`
                            : `1px 1px 2px ${subtitleStyle.outlineColor}`,
                          textAlign: subtitleStyle.alignment,
                          display: 'block',
                          lineHeight: '1.3',
                          wordWrap: 'break-word',
                          WebkitTextStroke: `1px ${subtitleStyle.outlineColor}`
                        }}
                      >
                        {formatDemoText(demoText)}
                      </span>
                    </motion.div>
                  </div>
                )}
                
                {/* Configuration Notice for Subtitled Video */}
                {subtitledVideoUrl && (
                  <div className="absolute top-4 left-4 z-10">
                    <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                      <span className="text-white text-sm font-medium">✨ Video with Applied Subtitles</span>
                    </div>
                  </div>
                )}
                
                {/* Demo Text Input */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg p-2">
                    <Input
                      value={demoText}
                      onChange={(e) => onDemoTextChange(e.target.value)}
                      placeholder="Enter demo subtitle text"
                      className="w-44 text-xs bg-gray-900/50 border-gray-600 h-8"
                    />
                  </div>
                </div>
                
                {/* Status Indicators */}
                {uploadStage === 'completed' && (
                  <>
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-green-600/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-medium">Subtitles Ready</span>
                      </div>
                    </div>
                    
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 pointer-events-none">
                      <motion.div
                        animate={{ 
                          opacity: [0.7, 1, 0.7],
                          scale: [0.98, 1, 0.98]
                        }}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="bg-green-600/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 shadow-xl"
                      >
                        <Star className="w-4 h-4 text-white" />
                        <span className="text-white text-sm font-medium">
                          Your subtitles are ready to download!
                        </span>
                      </motion.div>
                    </div>
                  </>
                )}
              </div>

              {/* Custom Video Controls - Below Video */}
              <div className="backdrop-blur-sm rounded-b-lg p-4 border-t border-border">
                <div className="space-y-3">
                  {/* Timeline */}
                  <div className="flex items-center gap-3">
                    <span className="text-foreground text-sm font-mono min-w-[45px]">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1">
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="w-full"
                      />
                    </div>
                    <span className="text-foreground text-sm font-mono min-w-[45px]">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => skipTime(-10)}
                        className="text-foreground hover:bg-muted"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePlayPause}
                        className="text-foreground hover:bg-muted"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => skipTime(10)}
                        className="text-foreground hover:bg-muted"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMute}
                        className="text-foreground hover:bg-muted"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      
                      <div className="w-20">
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={1}
                          step={0.1}
                          onValueChange={handleVolumeChange}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900/20 rounded-lg border-2 border-dashed border-gray-600">
              <div className="text-center space-y-4">
                <Play className="w-20 h-20 mx-auto opacity-50 text-gray-400" />
                <div>
                  <h3 className="text-2xl font-semibold mb-2">No Video Selected</h3>
                  <p className="text-gray-500">Upload a video to see live preview with subtitles</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}