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
  Timer
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
  clips?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    score: number;
    type: 'action' | 'speech' | 'music';
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

  const handleUploadComplete = async (uploadedFiles: any[]) => {
    setIsProcessing(true);
    
    const newVideos: ProcessedVideo[] = uploadedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.file.name,
      status: 'processing',
      progress: 0,
    }));

    setVideos(prev => [...prev, ...newVideos]);

    for (const video of newVideos) {
      for (let progress = 0; progress <= 100; progress += 12) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setVideos(prev => 
          prev.map(v => 
            v.id === video.id ? { ...v, progress } : v
          )
        );
      }
      
      setVideos(prev => 
        prev.map(v => 
          v.id === video.id 
            ? { 
                ...v, 
                status: 'completed',
                clips: [
                  { id: '1', startTime: 15, endTime: 30, score: 95, type: 'action' },
                  { id: '2', startTime: 45, endTime: 65, score: 88, type: 'speech' },
                  { id: '3', startTime: 120, endTime: 145, score: 92, type: 'action' }
                ]
              } 
            : v
        )
      );
    }
    
    setIsProcessing(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-50">
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
                  <Scissors className="w-10 h-10 text-green-600" />
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
                        <Scissors className="w-5 h-5 text-green-600" />
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
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline">
                                          <Play className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline">
                                          <Download className="w-3 h-3" />
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
                        <Settings2 className="w-5 h-5 text-green-600" />
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
    </ProtectedRoute>
  );
}