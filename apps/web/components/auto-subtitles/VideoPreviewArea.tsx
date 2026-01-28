'use client';

import { motion } from 'framer-motion';
import { FileVideo, CheckCircle, Star, Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';

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
  onPositionChange?: (position: { x: number; y: number }) => void;
  onScaleChange?: (scale: number) => void;
}

export function VideoPreviewArea({
  videoPreviewUrl,
  uploadStage,
  subtitleStyle,
  demoText,
  onDemoTextChange,
  subtitledVideoUrl,
  onPositionChange,
  onScaleChange
}: VideoPreviewAreaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Subtitle position and size controls
  const [subtitlePosition, setSubtitlePosition] = useState({ x: 0, y: 0 });
  const [subtitleScale, setSubtitleScale] = useState(1);
  

  const isYouTubeUrl = (url: string | null) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };
  
  const isTwitterUrl = (url: string | null) => {
    if (!url) return false;
    const isTweetUrl = (url.includes('twitter.com') || url.includes('x.com')) && url.includes('/status/');
    const isDirectVideo = url.includes('video.twimg.com') || url.includes('.mp4') || url.includes('.m3u8');
    return isTweetUrl && !isDirectVideo;
  };
  
  const isGoogleDriveUrl = (url: string | null) => {
    if (!url) return false;
    return url.includes('drive.google.com');
  };

  const isTikTokUrl = (url: string | null) => {
    if (!url) return false;
    return url.includes('tikcdn.io') || 
           url.includes('tiktokcdn.com') || 
           url.includes('muscdn.com') ||
           (url.includes('tiktok.com') && url.includes('.mp4'));
  };

  const isInstagramUrl = (url: string | null) => {
    if (!url) return false;
    // Only proxy actual Instagram CDN URLs, not page URLs
    return url.includes('cdninstagram.com') || 
           url.includes('scontent') ||
           (url.includes('instagram') && (url.includes('.mp4') || url.includes('.m3u8')));
  };

  const needsProxy = (url: string | null) => {
    if (!url) return false;
    // Don't proxy Instagram/TikTok page URLs - only CDN video URLs
    const isPageUrl = (url.includes('instagram.com/p/') || 
                      url.includes('instagram.com/reel') || 
                      url.includes('tiktok.com/') && !url.includes('.mp4'));
    
    if (isPageUrl) return false;
    
    return isTikTokUrl(url) || isInstagramUrl(url) || url.includes('video.twimg.com');
  };

  const getProxiedUrl = (url: string) => {
    // Don't proxy if already a proxy URL (prevent double-proxying)
    if (url.includes('/api/video-url-upload/proxy')) {
      return url;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${apiUrl}/api/video-url-upload/proxy?url=${encodeURIComponent(url)}`;
  };
  
  // Convert Google Drive URL to preview URL
  const getGoogleDrivePreviewUrl = (url: string) => {
    try {
      // Extract file ID from various Google Drive URL formats
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        // Use Google Drive preview URL
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
      return url;
    } catch (e) {
      return url;
    }
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

  // HLS support for streaming videos (Kick, Twitch, etc.)
  useEffect(() => {
    const video = videoRef.current;
    let videoUrl = subtitledVideoUrl || videoPreviewUrl;
    
    if (!video || !videoUrl) return;

    // Use proxy for TikTok, Instagram, and Twitter videos
    if (needsProxy(videoUrl) && !subtitledVideoUrl) {
      console.log('[VideoPreviewArea] URL needs proxy:', videoUrl);
      videoUrl = getProxiedUrl(videoUrl);
      console.log('[VideoPreviewArea] Using proxied URL:', videoUrl);
    }
    
    // Check if URL is an HLS stream (.m3u8)
    const isHlsStream = videoUrl.includes('.m3u8');
    
    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS stream loaded successfully');
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('Fatal HLS error:', data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Unrecoverable error, destroying HLS instance');
              hls.destroy();
              break;
          }
        }
      });
      
      return () => {
        hls.destroy();
      };
    } else if (isHlsStream && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = videoUrl;
    }
  }, [videoPreviewUrl, subtitledVideoUrl]);

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

  const actualFontSize = Math.max(16, Math.min(24, subtitleStyle.fontSize * 0.8)) * subtitleScale;
  
  useEffect(() => {
  }, [subtitlePosition, subtitleScale, subtitleStyle, actualFontSize]);

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
                  const isGoogleDrive = isGoogleDriveUrl(videoPreviewUrl);
                  const shouldUseIframe = ((isYouTube || isTwitter || isGoogleDrive) && !subtitledVideoUrl);
                  
                  console.log('VideoPreviewArea rendering decision:');
                  console.log('   - videoPreviewUrl:', videoPreviewUrl);
                  console.log('   - subtitledVideoUrl:', subtitledVideoUrl);
                  console.log('   - isYouTube:', isYouTube);
                  console.log('   - isTwitter (tweet URL check):', isTwitter);
                  console.log('   - isGoogleDrive:', isGoogleDrive);
                  console.log('   - shouldUseIframe:', shouldUseIframe);
                  console.log('   - Contains .mp4:', videoPreviewUrl?.includes('.mp4'));
                  console.log('   - Contains video.twimg.com:', videoPreviewUrl?.includes('video.twimg.com'));
                  
                  if (shouldUseIframe) {
                    let embedUrl;
                    let platformLabel;
                    
                    if (isYouTube) {
                      embedUrl = getYouTubeEmbedUrl(videoPreviewUrl!);
                      platformLabel = 'YouTube Preview';
                    } else if (isTwitter) {
                      embedUrl = getTwitterEmbedUrl(videoPreviewUrl!);
                      platformLabel = 'Tweet Preview - Video will be extracted';
                    } else if (isGoogleDrive) {
                      embedUrl = getGoogleDrivePreviewUrl(videoPreviewUrl!);
                      platformLabel = 'Google Drive Preview';
                    }
                    
                    console.log('Using iframe with URL:', embedUrl);
                    console.log('Platform:', platformLabel);
                    
                    return (
                      <div className="w-full h-full relative">
                        {(isTwitter || isGoogleDrive) && (
                          <div className="absolute top-2 right-2 z-10 bg-blue-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                            {platformLabel}
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
                    console.log('Using video element');
                    // Determine the actual video URL to use
                    let actualVideoUrl = subtitledVideoUrl || videoPreviewUrl || undefined;
                    
                    // Use proxy for TikTok, Instagram, and Twitter videos (only if not already subtitled)
                    if (actualVideoUrl && !subtitledVideoUrl && needsProxy(actualVideoUrl)) {
                      actualVideoUrl = getProxiedUrl(actualVideoUrl);
                      console.log('Using proxied URL for video element:', actualVideoUrl);
                    }
                    
                    return (
                      <video
                        ref={videoRef}
                        src={actualVideoUrl}
                        className="w-full h-full object-cover"
                        muted={isMuted}
                        style={{ objectFit: 'contain' }}
                      />
                    );
                  }
                })()}
                
                {!subtitledVideoUrl && (
                  <motion.div 
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    onDrag={(_, info) => {
                      const newPos = { x: info.offset.x, y: info.offset.y };
                      setSubtitlePosition(newPos);
                      onPositionChange?.(newPos);
                    }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-move"
                    style={{
                      x: subtitlePosition.x,
                      y: subtitlePosition.y,
                      scale: subtitleScale
                    }}
                  >
                    {/* Debug Info Display */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap font-mono pointer-events-none">
                      X: {Math.round(subtitlePosition.x)}px | Y: {Math.round(subtitlePosition.y)}px | Scale: {subtitleScale.toFixed(1)}x | Size: {Math.round(actualFontSize)}px
                    </div>
                    
                    <motion.div
                      key={`${subtitleStyle.fontFamily}-${subtitleStyle.fontSize}-${subtitleStyle.primaryColor}-${subtitleStyle.alignment}-${subtitleStyle.showShadow}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="relative max-w-[80vw] bg-black/10 hover:bg-black/20 rounded-lg px-3 py-2 border border-white/10 hover:border-white/30 transition-all"
                    >
                      <span 
                        style={(() => {
                          // Get gradient and shadow properties
                          const useGradient = (subtitleStyle as any).useGradient ?? false;
                          const gradientColors = (subtitleStyle as any).gradientColors ?? [];
                          const gradientDirection = (subtitleStyle as any).gradientDirection ?? 180;
                          const shadowOffsetX = (subtitleStyle as any).shadowOffsetX ?? 2;
                          const shadowOffsetY = (subtitleStyle as any).shadowOffsetY ?? 2;
                          const shadowIntensity = (subtitleStyle as any).shadowIntensity ?? 3;
                          const isGlow = shadowOffsetX === 0 && shadowOffsetY === 0 && subtitleStyle.showShadow;
                          
                          const baseStyle: any = {
                            fontFamily: subtitleStyle.fontFamily,
                            fontSize: `${actualFontSize}px`,
                            fontWeight: subtitleStyle.bold ? 'bold' : 'normal',
                            fontStyle: subtitleStyle.italic ? 'italic' : 'normal',
                            textAlign: subtitleStyle.alignment,
                            display: 'block',
                            lineHeight: '1.3',
                            wordWrap: 'break-word',
                            userSelect: 'none'
                          };
                          
                          // Check if this is a gradient style
                          if (useGradient && gradientColors.length >= 2) {
                            // Apply gradient
                            const colors = gradientColors.join(', ');
                            baseStyle.background = `linear-gradient(${gradientDirection}deg, ${colors})`;
                            baseStyle.WebkitBackgroundClip = 'text';
                            baseStyle.WebkitTextFillColor = 'transparent';
                            baseStyle.backgroundClip = 'text';
                            
                            // Simple black drop shadow for gradient text
                            baseStyle.filter = `drop-shadow(${shadowOffsetX}px ${shadowOffsetY}px 4px rgba(0, 0, 0, 0.8))`;
                          } else {
                            // Regular solid color
                            baseStyle.color = subtitleStyle.primaryColor;
                            
                            // Handle transparent outline
                            if (subtitleStyle.outlineColor !== 'transparent') {
                              baseStyle.WebkitTextStroke = `1px ${subtitleStyle.outlineColor}`;
                            }
                            
                            // Handle glow effect vs regular shadow
                            if (isGlow) {
                              // Glow effect - multiple shadow layers with no offset
                              const glowColor = subtitleStyle.shadowColor;
                              const shadows = [
                                `0 0 ${shadowIntensity * 2}px ${glowColor}`,
                                `0 0 ${shadowIntensity * 4}px ${glowColor}`,
                                `0 0 ${shadowIntensity * 6}px ${glowColor}`
                              ];
                              // Add outline if not transparent
                              if (subtitleStyle.outlineColor !== 'transparent') {
                                shadows.unshift(
                                  `-1px -1px 0 ${subtitleStyle.outlineColor}`,
                                  `1px -1px 0 ${subtitleStyle.outlineColor}`,
                                  `-1px 1px 0 ${subtitleStyle.outlineColor}`,
                                  `1px 1px 0 ${subtitleStyle.outlineColor}`
                                );
                              }
                              baseStyle.textShadow = shadows.join(', ');
                            } else {
                              // Regular shadow with outline
                              if (subtitleStyle.showShadow) {
                                const shadows = [];
                                // Add outline
                                if (subtitleStyle.outlineColor !== 'transparent') {
                                  shadows.push(
                                    `-1px -1px 0 ${subtitleStyle.outlineColor}`,
                                    `1px -1px 0 ${subtitleStyle.outlineColor}`,
                                    `-1px 1px 0 ${subtitleStyle.outlineColor}`,
                                    `1px 1px 0 ${subtitleStyle.outlineColor}`
                                  );
                                }
                                // Add shadow
                                shadows.push(`${shadowOffsetX}px ${shadowOffsetY}px 4px ${subtitleStyle.shadowColor}`);
                                baseStyle.textShadow = shadows.join(', ');
                              } else if (subtitleStyle.outlineColor !== 'transparent') {
                                // Only outline, no shadow
                                baseStyle.textShadow = `-1px -1px 0 ${subtitleStyle.outlineColor}, 1px -1px 0 ${subtitleStyle.outlineColor}, -1px 1px 0 ${subtitleStyle.outlineColor}, 1px 1px 0 ${subtitleStyle.outlineColor}`;
                              }
                            }
                          }
                          
                          return baseStyle;
                        })()}
                      >
                        {formatDemoText(demoText)}
                      </span>
                      
                      {/* Scale Control */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 rounded-full px-3 py-1 text-xs whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newScale = Math.max(0.5, subtitleScale - 0.1);
                            setSubtitleScale(newScale);
                            onScaleChange?.(newScale);
                          }}
                          className="text-white hover:text-blue-400 transition-colors"
                        >
                          A-
                        </button>
                        <span className="text-white/60">|</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubtitleScale(1);
                            setSubtitlePosition({ x: 0, y: 0 });
                            onScaleChange?.(1);
                            onPositionChange?.({ x: 0, y: 0 });
                          }}
                          className="text-white hover:text-blue-400 transition-colors"
                        >
                          Reset
                        </button>
                        <span className="text-white/60">|</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newScale = Math.min(2, subtitleScale + 0.1);
                            setSubtitleScale(newScale);
                            onScaleChange?.(newScale);
                            console.log('Increased scale to:', newScale);
                          }}
                          className="text-white hover:text-blue-400 transition-colors"
                        >
                          A+
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Configuration Notice for Subtitled Video */}
                {subtitledVideoUrl && (
                  <div className="absolute top-4 left-4 z-10">
                    <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                      <span className="text-white text-sm font-medium">Video with Applied Subtitles</span>
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