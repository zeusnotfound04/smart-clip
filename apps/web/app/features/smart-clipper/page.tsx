'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Download, 
  Clock, 
  Scissors, 
  Settings2,
  Zap,
  Target,
  Timer,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoUpload } from '@/components/video-upload';
import { ProtectedRoute } from '@/components/protected-route';
import { VideoPlayerModal } from '@/components/ui/video-player-modal';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface ClipSettings {
  sensitivity: number;
  minClipLength: number;
  maxClipLength: number;
  detectAction: boolean;
  detectSpeech: boolean;
  detectMusic: boolean;
}

interface ProcessedVideo {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  videoId?: string; // Added to store actual video ID for API calls
  clips?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    score: number;
    type: 'action' | 'speech' | 'music';
    s3Url?: string; // S3 URL for generated clip
    clipReady?: boolean; // Whether clip is ready for playback/download
  }>;
}

export default function SmartClipperPage() {
  const [videos, setVideos] = useState<ProcessedVideo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<ClipSettings>({
    sensitivity: 70,
    minClipLength: 5,
    maxClipLength: 30,
    detectAction: true,
    detectSpeech: true,
    detectMusic: false,
  });
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [videoPlayerUrl, setVideoPlayerUrl] = useState<string | null>(null);
  const [downloadingClip, setDownloadingClip] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentClip, setCurrentClip] = useState<{ video: ProcessedVideo; clip: any } | null>(null);
  const [activePolls, setActivePolls] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const handleUploadComplete = async (uploadedFiles: any[]) => {
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('smartclips_token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        alert('Please log in to use Smart Clipper.');
        setIsProcessing(false);
        return;
      }
      


      for (const uploadedFile of uploadedFiles) {
        // Start analysis for each uploaded video
        const response = await fetch('/api/smart-clipper/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            videoKey: uploadedFile.s3Key,
            contentType: 'tutorial', // Default content type
            settings: {
              sensitivity: settings.sensitivity,
              minClipLength: settings.minClipLength,
              maxClipLength: settings.maxClipLength,
              detectAction: settings.detectAction,
              detectSpeech: settings.detectSpeech,
              detectMusic: settings.detectMusic,
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Smart Clipper analysis started:', result);
          
          // Add video to state for monitoring
          const newVideo: ProcessedVideo = {
            id: result.projectId,
            name: uploadedFile.file.name,
            status: 'processing',
            progress: 0,
          };
          
          setVideos(prev => [...prev, newVideo]);
          
          // Start polling for status updates
          pollVideoStatus(result.projectId, uploadedFile.file.name);
        } else {
          const errorData = await response.json();
          console.error('Failed to start analysis:', errorData);
          alert(`Failed to start analysis for ${uploadedFile.file.name}: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Upload processing failed:', error);
      alert('Failed to process uploads. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollVideoStatus = async (projectId: string, fileName: string) => {
    const token = localStorage.getItem('smartclips_token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ No auth token found for polling');
      return;
    }

    // Clear any existing poll for this project
    const existingPoll = activePolls.get(projectId);
    if (existingPoll) {
      console.log(`🛑 Clearing existing poll for project ${projectId}`);
      clearInterval(existingPoll);
    }

    console.log(`🔄 Starting new poll for project ${projectId} (${fileName})`);
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/smart-clipper/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const projectResponse = await response.json();
          const project = projectResponse.project || projectResponse; // Handle different response formats
          
          console.log(`📊 [${fileName}] Status: ${project.status}, Progress: ${project.processingStage || 'N/A'}`);
          
          setVideos(prev => 
            prev.map(v => {
              if (v.id === projectId) {
                const updatedVideo = { 
                  ...v,
                  videoId: project.video?.id || project.videoId // Store actual video ID for downloads
                };
                
                // Update status based on project status
                if (project.status === 'analyzing') {
                  updatedVideo.status = 'processing';
                  // Set progress based on processing stage
                  switch (project.processingStage) {
                    case 'preprocessing': updatedVideo.progress = 25; break;
                    case 'flash-analysis': updatedVideo.progress = 50; break;
                    case 'pro-analysis': updatedVideo.progress = 75; break;
                    case 'scoring': updatedVideo.progress = 85; break;
                    case 'finalizing': updatedVideo.progress = 90; break;
                    default: updatedVideo.progress = 10;
                  }
                } else if (project.status === 'ready') { // Changed from 'completed' to 'ready'
                  updatedVideo.status = 'completed';
                  updatedVideo.progress = 100;
                  
                  // Convert segments to clips format
                  const segments = project.highlightSegments || project.segments || [];
                  
                  if (segments.length > 0) {
                    updatedVideo.clips = segments.map((segment: any, index: number) => ({
                      id: segment.id || `${index + 1}`,
                      startTime: Math.floor(segment.startTime),
                      endTime: Math.floor(segment.endTime),
                      score: Math.floor(segment.finalScore || segment.score || segment.confidence || 85),
                      type: segment.highlightType || 'action',
                      s3Url: segment.s3Url, // S3 URL for generated clip
                      clipReady: segment.clipReady || !!segment.s3Url // Whether clip is ready for playback/download
                    }));
                    
                    console.log(`✅ ${v.name}: Generated ${updatedVideo.clips?.length} clips`);
                  }
                  
                  // Always clear interval when project is ready, regardless of segments
                  clearInterval(pollInterval);
                  setActivePolls(prev => {
                    const newPolls = new Map(prev);
                    newPolls.delete(projectId);
                    return newPolls;
                  });
                } else if (project.status === 'failed') {
                  updatedVideo.status = 'error';
                  updatedVideo.progress = 0;
                  clearInterval(pollInterval);
                  setActivePolls(prev => {
                    const newPolls = new Map(prev);
                    newPolls.delete(projectId);
                    return newPolls;
                  });
                }
                
                return updatedVideo;
              }
              return v;
            })
          );
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
        // Don't clear interval on network errors, keep trying
      }
    }, 3000); // Poll every 3 seconds

    // Store the interval in our active polls map
    setActivePolls(prev => new Map(prev.set(projectId, pollInterval)));

    // Clear interval after 10 minutes to prevent endless polling
    setTimeout(() => {
      console.log(`⏰ 10-minute timeout reached for project ${projectId}`);
      clearInterval(pollInterval);
      setActivePolls(prev => {
        const newPolls = new Map(prev);
        newPolls.delete(projectId);
        return newPolls;
      });
    }, 10 * 60 * 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayClip = async (video: ProcessedVideo, clip: any) => {
    try {
      setCurrentlyPlaying(clip.id);
      
      // Check if clip has S3 URL for direct playback
      if (clip.s3Url) {
        setVideoPlayerUrl(clip.s3Url);
      } else {
        // Fallback to streaming API if no S3 URL available
        const actualVideoId = video.videoId || video.id;
        const videoUrl = `/api/videos/${actualVideoId}/stream`;
        setVideoPlayerUrl(videoUrl);
      }
      
      setCurrentClip({ video, clip });
      setVideoModalOpen(true);
      
    } catch (error) {
      console.error('Failed to play clip:', error);
      setCurrentlyPlaying(null);
    }
  };

  const handleDownloadClip = async (video: ProcessedVideo, clip: any) => {
    try {
      setDownloadingClip(clip.id);
      
      // Check if clip has S3 URL for direct download
      if (clip.s3Url) {
        
        // Direct download from S3 URL
        const response = await fetch(clip.s3Url);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `${video.name.replace('.mp4', '')}_clip_${clip.id}_${formatTime(clip.startTime)}-${formatTime(clip.endTime)}.mp4`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          throw new Error('Failed to download from S3');
        }
      } else {
        // Fallback to generating clip if no S3 URL available
        const token = localStorage.getItem('smartclips_token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (!token) {
          console.error('❌ No auth token found for download');
          alert('Please log in to download clips.');
          return;
        }
        
        const actualVideoId = video.videoId || video.id;
        const response = await fetch(`/api/videos/${actualVideoId}/generate-clip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            startTime: clip.startTime,
            endTime: clip.endTime,
            format: 'mp4'
          })
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `${video.name.replace('.mp4', '')}_clip_${clip.id}_${formatTime(clip.startTime)}-${formatTime(clip.endTime)}.mp4`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate clip');
        }
      }
      
    } catch (error) {
      console.error('Failed to download clip:', error);
      alert(`Failed to download clip: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setDownloadingClip(null);
    }
  };

  const handleCloseVideoModal = () => {
    setVideoModalOpen(false);
    setCurrentlyPlaying(null);
    setCurrentClip(null);
    setVideoPlayerUrl(null);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            <motion.div variants={staggerItem} className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={staggerItem}>
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 text-4xl font-bold">
                  <Scissors className="w-10 h-10 text-foreground" />
                  Smart Clipper
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  AI-powered highlight detection automatically finds the best moments 
                  in your videos and creates engaging clips.
                </p>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <motion.div variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-muted-foreground" />
                        Upload Videos for Clipping
                      </CardTitle>
                      <CardDescription>
                        Upload your long-form content to extract highlight clips automatically
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <VideoUpload
                        maxFiles={3}
                        maxSize={2048 * 1024 * 1024}
                        onUploadComplete={handleUploadComplete}
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                {videos.length > 0 && (
                  <motion.div 
                    variants={staggerItem}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Processing Results</CardTitle>
                        <CardDescription>
                          AI analysis and generated clips from your videos
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {videos.map((video) => (
                          <div key={video.id} className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center">
                                  <Play className="w-4 h-4 text-slate-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{video.name}</p>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    Status: {video.status}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {video.status === 'processing' && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Analyzing video content...</span>
                                  <span>{video.progress}%</span>
                                </div>
                                <Progress value={video.progress} className="h-2" />
                              </div>
                            )}

                            {video.status === 'completed' && video.clips && (
                              <div className="space-y-3">
                                <h4 className="font-medium text-sm">Generated Clips ({video.clips.length})</h4>
                                <div className="grid gap-3">
                                  {video.clips.map((clip, index) => (
                                    <div key={clip.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-6 bg-green-100 rounded flex items-center justify-center">
                                          <span className="text-xs font-medium text-green-700">
                                            {index + 1}
                                          </span>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">
                                            {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                                          </p>
                                          <p className="text-xs text-muted-foreground capitalize">
                                            {clip.type} • Score: {clip.score}%
                                            {clip.clipReady ? (
                                              <span className="ml-2 text-green-600 font-medium">• Ready</span>
                                            ) : (
                                              <span className="ml-2 text-yellow-600 font-medium">• Processing</span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handlePlayClip(video, clip)}
                                          disabled={currentlyPlaying === clip.id || !clip.clipReady}
                                          className="gap-1"
                                        >
                                          {currentlyPlaying === clip.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Play className="w-3 h-3" />
                                          )}
                                          {currentlyPlaying === clip.id ? 'Playing...' : (clip.clipReady ? 'Play' : 'Processing...')}
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleDownloadClip(video, clip)}
                                          disabled={downloadingClip === clip.id || !clip.clipReady}
                                          className="gap-1"
                                        >
                                          {downloadingClip === clip.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Download className="w-3 h-3" />
                                          )}
                                          {downloadingClip === clip.id ? 'Downloading...' : (clip.clipReady ? 'Download' : 'Processing...')}
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <motion.div variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-muted-foreground" />
                        Detection Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Sensitivity ({settings.sensitivity}%)
                        </label>
                        <Slider
                          value={[settings.sensitivity]}
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, sensitivity: value[0] }))
                          }
                          max={100}
                          min={1}
                          step={5}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Min Length (s)</label>
                          <Select 
                            value={settings.minClipLength.toString()} 
                            onValueChange={(value) => 
                              setSettings(prev => ({ ...prev, minClipLength: parseInt(value) }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3s</SelectItem>
                              <SelectItem value="5">5s</SelectItem>
                              <SelectItem value="10">10s</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Max Length (s)</label>
                          <Select 
                            value={settings.maxClipLength.toString()} 
                            onValueChange={(value) => 
                              setSettings(prev => ({ ...prev, maxClipLength: parseInt(value) }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15s</SelectItem>
                              <SelectItem value="30">30s</SelectItem>
                              <SelectItem value="60">60s</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Detection Types</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-orange-500" />
                              <span className="text-sm">Action Scenes</span>
                            </div>
                            <Switch
                              checked={settings.detectAction}
                              onCheckedChange={(checked) => 
                                setSettings(prev => ({ ...prev, detectAction: checked }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-blue-500" />
                              <span className="text-sm">Speech Moments</span>
                            </div>
                            <Switch
                              checked={settings.detectSpeech}
                              onCheckedChange={(checked) => 
                                setSettings(prev => ({ ...prev, detectSpeech: checked }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-purple-500" />
                              <span className="text-sm">Music Peaks</span>
                            </div>
                            <Switch
                              checked={settings.detectMusic}
                              onCheckedChange={(checked) => 
                                setSettings(prev => ({ ...prev, detectMusic: checked }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center space-y-3">
                        <Clock className="w-8 h-8 text-green-500 mx-auto" />
                        <h3 className="font-semibold">Save Hours</h3>
                        <p className="text-sm text-muted-foreground">
                          Automatically find the best moments without manual scrubbing
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Video Player Modal */}
      {videoPlayerUrl && currentClip && (
        <VideoPlayerModal
          isOpen={videoModalOpen}
          onClose={handleCloseVideoModal}
          videoUrl={videoPlayerUrl}
          startTime={currentClip.clip.startTime}
          endTime={currentClip.clip.endTime}
          title={`${currentClip.video.name} - Clip ${currentClip.clip.id}`}
        />
      )}
    </ProtectedRoute>
  );
}