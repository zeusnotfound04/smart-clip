'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Download, 
  Clock, 
  Video, 
  Monitor,
  Smartphone,
  Split,
  Settings2,
  Maximize2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { VideoUpload } from '@/components/video-upload';
import { ProtectedRoute } from '@/components/protected-route';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface ProcessedVideo {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  outputFormat: 'mobile' | 'desktop';
  webcamPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  webcamSize: number;
  originalUrl?: string;
  processedUrl?: string;
}

export default function SplitStreamerPage() {
  const [videos, setVideos] = useState<ProcessedVideo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState({
    outputFormat: 'mobile' as 'mobile' | 'desktop',
    webcamPosition: 'top-right' as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left',
    webcamSize: 25,
    aspectRatio: '9:16' as '9:16' | '16:9' | '1:1'
  });

  const handleUploadComplete = async (uploadedFiles: any[]) => {
    setIsProcessing(true);
    
    const newVideos: ProcessedVideo[] = uploadedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.file.name,
      status: 'processing',
      progress: 0,
      outputFormat: settings.outputFormat,
      webcamPosition: settings.webcamPosition,
      webcamSize: settings.webcamSize,
    }));

    setVideos(prev => [...prev, ...newVideos]);

    // Simulate processing
    for (const video of newVideos) {
      for (let progress = 0; progress <= 100; progress += 8) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setVideos(prev => 
          prev.map(v => 
            v.id === video.id ? { ...v, progress } : v
          )
        );
      }
      
      setVideos(prev => 
        prev.map(v => 
          v.id === video.id 
            ? { ...v, status: 'completed' } 
            : v
        )
      );
    }
    
    setIsProcessing(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-50">
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
                <div className="inline-flex items-center gap-3 text-4xl font-bold gradient-text">
                  <Split className="w-10 h-10 text-purple-600" />
                  Split Streamer
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Combine webcam and gameplay footage into engaging vertical videos 
                  perfect for mobile platforms like TikTok, Instagram Reels, and YouTube Shorts.
                </p>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <motion.div variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-purple-600" />
                        Upload Gaming Videos
                      </CardTitle>
                      <CardDescription>
                        Upload your gameplay recordings and webcam footage to create split-screen videos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <VideoUpload
                        maxFiles={2}
                        maxSize={1024 * 1024 * 1024}
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
                        <CardTitle>Processing Queue</CardTitle>
                        <CardDescription>
                          Track the progress of your split-screen video generation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {videos.map((video) => (
                          <div key={video.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center">
                                  <Play className="w-4 h-4 text-slate-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{video.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {video.outputFormat === 'mobile' ? 'Mobile Format (9:16)' : 'Desktop Format (16:9)'} • 
                                    Webcam: {video.webcamPosition.replace('-', ' ')} • Size: {video.webcamSize}%
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {video.status === 'processing' && (
                                  <Clock className="w-4 h-4 text-purple-500 animate-spin" />
                                )}
                                {video.status === 'completed' && (
                                  <Button size="sm" variant="outline" className="gap-2">
                                    <Download className="w-4 h-4" />
                                    Download
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {video.status === 'processing' && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Creating split-screen video...</span>
                                  <span>{video.progress}%</span>
                                </div>
                                <Progress value={video.progress} className="h-2" />
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
                        <Settings2 className="w-5 h-5 text-purple-600" />
                        Output Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Output Format</label>
                        <Select 
                          value={settings.outputFormat} 
                          onValueChange={(value: 'mobile' | 'desktop') => 
                            setSettings(prev => ({ ...prev, outputFormat: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mobile">
                              <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                Mobile (9:16)
                              </div>
                            </SelectItem>
                            <SelectItem value="desktop">
                              <div className="flex items-center gap-2">
                                <Monitor className="w-4 h-4" />
                                Desktop (16:9)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Webcam Position</label>
                        <Select 
                          value={settings.webcamPosition} 
                          onValueChange={(value: any) => 
                            setSettings(prev => ({ ...prev, webcamPosition: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="top-left">Top Left</SelectItem>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Webcam Size ({settings.webcamSize}%)
                        </label>
                        <Slider
                          value={[settings.webcamSize]}
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, webcamSize: value[0] }))
                          }
                          max={50}
                          min={15}
                          step={5}
                        />
                      </div>

                      <div className="pt-4 border-t">
                        <div className="aspect-video bg-slate-100 rounded-lg relative overflow-hidden">
                          <div className="w-full h-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs">Gameplay</span>
                          </div>
                          <div 
                            className={`absolute w-8 h-6 bg-green-400 rounded border-2 border-white flex items-center justify-center
                              ${settings.webcamPosition === 'top-right' ? 'top-1 right-1' : ''}
                              ${settings.webcamPosition === 'top-left' ? 'top-1 left-1' : ''}
                              ${settings.webcamPosition === 'bottom-right' ? 'bottom-1 right-1' : ''}
                              ${settings.webcamPosition === 'bottom-left' ? 'bottom-1 left-1' : ''}
                            `}
                            style={{ 
                              width: `${settings.webcamSize * 0.4}%`, 
                              height: `${settings.webcamSize * 0.6}%` 
                            }}
                          >
                            <span className="text-white text-xs">Cam</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">Preview</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center space-y-3">
                        <Maximize2 className="w-8 h-8 text-purple-500 mx-auto" />
                        <h3 className="font-semibold">Perfect for Creators</h3>
                        <p className="text-sm text-muted-foreground">
                          Automatically optimize your gaming content for social media platforms
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
    </ProtectedRoute>
  );
}