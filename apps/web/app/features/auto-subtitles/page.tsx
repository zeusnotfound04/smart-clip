'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Download, Clock, Subtitles, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { VideoUpload } from '@/components/video-upload';
import { ProtectedRoute } from '@/components/protected-route';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface ProcessedVideo {
  id: string;
  name: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  subtitles?: string[];
  originalUrl?: string;
  processedUrl?: string;
}

export default function AutoSubtitlesPage() {
  const [videos, setVideos] = useState<ProcessedVideo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = async (uploadedFiles: any[]) => {
    setIsProcessing(true);
    
    // Add videos to processing queue
    const newVideos: ProcessedVideo[] = uploadedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.file.name,
      status: 'processing',
      progress: 0,
    }));

    setVideos(prev => [...prev, ...newVideos]);

    // Simulate processing (replace with actual API calls)
    for (const video of newVideos) {
      // Simulate progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setVideos(prev => 
          prev.map(v => 
            v.id === video.id ? { ...v, progress } : v
          )
        );
      }
      
      // Mark as completed
      setVideos(prev => 
        prev.map(v => 
          v.id === video.id 
            ? { 
                ...v, 
                status: 'completed',
                subtitles: ['Hello, welcome to this video', 'Today we will learn about AI', 'This is automatically generated'] 
              } 
            : v
        )
      );
    }
    
    setIsProcessing(false);
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
                  <Subtitles className="w-10 h-10 text-foreground" />
                  Auto Subtitles
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Generate subtitles automatically using AI speech recognition.
                </p>
              </div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Subtitles className="w-5 h-5 text-muted-foreground" />
                    Upload Videos for Subtitle Generation
                  </CardTitle>
                  <CardDescription>
                    Upload your video files to automatically generate subtitles using AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VideoUpload
                    maxFiles={5}
                    maxSize={500 * 1024 * 1024}
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
                      Track the progress of your subtitle generation
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
                              <p className="text-sm text-muted-foreground capitalize">
                                Status: {video.status}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {video.status === 'processing' && (
                              <Clock className="w-4 h-4 text-muted-foreground animate-spin" />
                            )}
                            {video.status === 'completed' && (
                              <Button size="sm" variant="outline" className="gap-2">
                                <Download className="w-4 h-4" />
                                Download SRT
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {video.status === 'processing' && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Generating subtitles...</span>
                              <span>{video.progress}%</span>
                            </div>
                            <Progress value={video.progress} className="h-2" />
                          </div>
                        )}

                        {video.status === 'completed' && video.subtitles && (
                          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                            <h4 className="font-medium text-sm">Generated Subtitles Preview</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {video.subtitles.slice(0, 3).map((subtitle, index) => (
                                <div key={index} className="text-sm text-muted-foreground">
                                  {index + 1}. {subtitle}
                                </div>
                              ))}
                              {video.subtitles.length > 3 && (
                                <div className="text-sm text-muted-foreground italic">
                                  ...and {video.subtitles.length - 3} more lines
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}


          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}