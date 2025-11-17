'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileVideo, 
  Play, 
  Download, 
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Subtitles,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth-context';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { apiClient } from '@/lib/api-client';

type UploadStage = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface VideoData {
  id: string;
  name: string;
  size: number;
  s3Url: string;
  subtitles?: string;
}

export default function AutoSubtitlesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStage('uploading');
      setUploadProgress(0);
      setError('');

      const video = await apiClient.uploadVideo(selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      setVideoData({
        id: video.id,
        name: video.originalName || selectedFile.name,
        size: selectedFile.size,
        s3Url: video.s3Url || ''
      });

      setUploadStage('processing');
      setProcessingProgress(0);

      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 1000);

      // Generate subtitles
      const subtitleResult = await apiClient.generateSubtitles(video.id);
      clearInterval(progressInterval);
      setProcessingProgress(100);

      setVideoData(prev => prev ? { ...prev, subtitles: 'Generated successfully' } : null);
      setUploadStage('completed');

    } catch (error: any) {
      setError(error.message || 'Failed to process video');
      setUploadStage('error');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setVideoData(null);
    setUploadStage('idle');
    setUploadProgress(0);
    setProcessingProgress(0);
    setError('');
  };

  const getStageIcon = (stage: UploadStage) => {
    switch (stage) {
      case 'uploading': return <Upload className="w-5 h-5 text-blue-500" />;
      case 'processing': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Subtitles className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStageText = (stage: UploadStage) => {
    switch (stage) {
      case 'uploading': return 'Uploading video...';
      case 'processing': return 'Generating subtitles...';
      case 'completed': return 'Subtitles generated!';
      case 'error': return 'Processing failed';
      default: return 'Ready to process';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-4 border-b p-4 bg-background/95 backdrop-blur-sm">
        <SidebarTrigger />
        <Button
          variant="ghost"
          onClick={() => router.push('/choose-feature')}
          className="gap-2 hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Features
        </Button>
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              <Subtitles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Auto Subtitles</h1>
              <p className="text-muted-foreground text-sm">
                Generate accurate subtitles using AI speech recognition
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Upload Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="border-2 border-dashed border-gray-600 hover:border-blue-400 transition-colors duration-300">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Upload Your Video</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <AnimatePresence mode="wait">
                  {!selectedFile ? (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center"
                    >
                      <motion.div
                        className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Upload className="w-12 h-12 text-blue-400" />
                      </motion.div>
                      
                      <h3 className="text-xl font-semibold mb-2">Choose a video file</h3>
                      <p className="text-muted-foreground mb-6">
                        Support for MP4, MOV, AVI and other video formats
                      </p>
                      
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="video-upload"
                      />
                      
                      <label htmlFor="video-upload">
                        <Button 
                          asChild
                          size="lg"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg cursor-pointer"
                        >
                          <span>
                            <Upload className="w-5 h-5 mr-2" />
                            Select Video File
                          </span>
                        </Button>
                      </label>
                      
                      <p className="text-sm text-muted-foreground mt-4">
                        Maximum file size: 500MB
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="selected"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* File Info */}
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                        <div className="w-16 h-16 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                          <FileVideo className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{selectedFile.name}</h4>
                          <p className="text-muted-foreground">
                            Size: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 flex items-center justify-center"
                        >
                          <Sparkles className="w-6 h-6 text-blue-400" />
                        </motion.div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 justify-center">
                        <Button 
                          variant="outline" 
                          onClick={resetUpload}
                          disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                          className="px-6"
                        >
                          Change File
                        </Button>
                        <Button 
                          onClick={handleUpload}
                          disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                          size="lg"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                        >
                          {uploadStage === 'idle' ? (
                            <>
                              <Subtitles className="w-5 h-5 mr-2" />
                              Generate Subtitles
                            </>
                          ) : (
                            <>
                              {getStageIcon(uploadStage)}
                              <span className="ml-2">{getStageText(uploadStage)}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.section>

          {/* Progress Section */}
          <AnimatePresence>
            {(uploadStage === 'uploading' || uploadStage === 'processing') && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-gray-900/50 border border-gray-700">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Upload Progress */}
                      {uploadStage === 'uploading' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-400 font-medium">Uploading to cloud storage...</span>
                            <span className="text-blue-400 font-mono">{Math.round(uploadProgress)}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-3" />
                        </div>
                      )}

                      {/* Processing Progress */}
                      {uploadStage === 'processing' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-yellow-400 font-medium">Generating subtitles with AI...</span>
                            <span className="text-yellow-400 font-mono">{Math.round(processingProgress)}%</span>
                          </div>
                          <Progress value={processingProgress} className="h-3" />
                        </div>
                      )}

                      {/* Status Message */}
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5"
                        >
                          {getStageIcon(uploadStage)}
                        </motion.div>
                        <span>{getStageText(uploadStage)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence>
            {uploadStage === 'completed' && videoData && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-green-950/30 border border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-6 h-6" />
                      Subtitles Generated Successfully!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Video Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Name:</span>
                            <span>{videoData.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Size:</span>
                            <span>{(videoData.size / (1024 * 1024)).toFixed(1)} MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="text-green-400">Processing Complete</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Actions</h4>
                        <div className="space-y-2">
                          <Button className="w-full" variant="outline">
                            <Play className="w-4 h-4 mr-2" />
                            Preview Video
                          </Button>
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <Download className="w-4 h-4 mr-2" />
                            Download Subtitles
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Error Section */}
          <AnimatePresence>
            {uploadStage === 'error' && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-red-950/30 border border-red-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                      <h3 className="text-lg font-semibold text-red-400">Processing Failed</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button 
                      onClick={resetUpload}
                      variant="outline"
                      className="border-red-500/30 hover:bg-red-500/10"
                    >
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}