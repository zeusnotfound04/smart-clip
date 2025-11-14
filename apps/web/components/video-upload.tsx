'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  File, 
  X, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Cloud,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, formatFileSize, formatDuration } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface VideoFile {
  id: string;
  file: File;
  preview: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  duration?: number;
  size: number;
  error?: string;
}

interface VideoUploadProps {
  onUploadComplete?: (files: VideoFile[]) => void;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
}

export function VideoUpload({ 
  onUploadComplete, 
  maxFiles = 5, 
  maxSize = 500 * 1024 * 1024, 
  className 
}: VideoUploadProps) {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: VideoFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      uploadProgress: 0,
      status: 'pending',
      size: file.size,
    }));

    setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
  }, [maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
    },
    maxSize,
    maxFiles,
    disabled: isUploading,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const uploadFile = async (videoFile: VideoFile) => {
    try {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === videoFile.id ? { ...f, status: 'uploading' } : f
        )
      );

      const result = await apiClient.uploadVideo(videoFile.file, (progress) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === videoFile.id ? { ...f, uploadProgress: progress } : f
          )
        );
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === videoFile.id
            ? { ...f, status: 'completed', uploadProgress: 100 }
            : f
        )
      );

      return result;
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === videoFile.id
            ? { 
                ...f, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Upload failed' 
              }
            : f
        )
      );
      throw error;
    }
  };

  const uploadAll = async () => {
    setIsUploading(true);
    
    try {
      const pendingFiles = files.filter((f) => f.status === 'pending');
      
      await Promise.allSettled(
        pendingFiles.map((file) => uploadFile(file))
      );
      
      onUploadComplete?.(files);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const completedFiles = files.filter((f) => f.status === 'completed').length;
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className={cn('space-y-6', className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-2 border-dashed transition-colors duration-200 hover:border-primary/50">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div
              {...getRootProps()}
              className={cn(
                'flex flex-col items-center justify-center space-y-3 sm:space-y-4 cursor-pointer transition-all duration-200',
                isDragActive && 'scale-105',
                isUploading && 'pointer-events-none opacity-50'
              )}
            >
              <input {...getInputProps()} />
              
              <motion.div
                animate={{
                  scale: isDragActive ? 1.1 : 1,
                  rotate: isDragActive ? 5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </motion.div>

              <div className="text-center space-y-2">
                <h3 className="text-base sm:text-lg font-semibold">
                  {isDragActive ? 'Drop your videos here' : 'Upload your videos'}
                </h3>
                <p className="text-sm text-muted-foreground px-4">
                  Drag & drop video files or click to browse
                </p>
                <p className="text-xs text-muted-foreground px-2">
                  Supports MP4, AVI, MOV, MKV, WebM • Max {formatFileSize(maxSize)} per file
                </p>
              </div>

              <Button variant="outline" className="gap-2" disabled={isUploading}>
                <Cloud className="w-4 h-4" />
                Choose Files
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h4 className="text-base sm:text-lg font-semibold">
                Files ({files.length}) • {formatFileSize(totalSize)}
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={isUploading}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear All</span>
                </Button>
                <Button
                  onClick={uploadAll}
                  disabled={isUploading || files.every((f) => f.status === 'completed')}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload {files.filter((f) => f.status === 'pending').length} Files
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {files.map((videoFile) => (
                <motion.div
                  key={videoFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="relative w-16 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                          <video
                            src={videoFile.preview}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{videoFile.file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(videoFile.size)}
                                {videoFile.duration && ` • ${formatDuration(videoFile.duration)}`}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {videoFile.status === 'pending' && (
                                <HardDrive className="w-4 h-4 text-muted-foreground" />
                              )}
                              {videoFile.status === 'uploading' && (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              )}
                              {videoFile.status === 'completed' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {videoFile.status === 'error' && (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(videoFile.id)}
                                disabled={isUploading}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {videoFile.status === 'uploading' && (
                            <Progress value={videoFile.uploadProgress} className="h-2" />
                          )}

                          {videoFile.status === 'error' && (
                            <p className="text-sm text-red-600">{videoFile.error}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {completedFiles > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center p-4 bg-green-50 rounded-lg border border-green-200"
              >
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-700 font-medium">
                  {completedFiles} file{completedFiles > 1 ? 's' : ''} uploaded successfully!
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}