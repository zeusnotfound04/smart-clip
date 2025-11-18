'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Video, 
  Webcam, 
  Gamepad2, 
  Trash2, 
  RefreshCw, 
  Play,
  FileVideo,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface VideoFile {
  file: File;
  preview: string;
  type: 'webcam' | 'gameplay';
}

interface DualVideoUploadPanelProps {
  webcamVideo: VideoFile | null;
  gameplayVideo: VideoFile | null;
  processingStage: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  uploadProgress: { webcam: number; gameplay: number };
  onWebcamSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGameplaySelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCombine: () => void;
  onReset: () => void;
}

export function DualVideoUploadPanel({
  webcamVideo,
  gameplayVideo,
  processingStage,
  uploadProgress,
  onWebcamSelect,
  onGameplaySelect,
  onCombine,
  onReset
}: DualVideoUploadPanelProps) {
  const [dragOver, setDragOver] = useState<'webcam' | 'gameplay' | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDrop = (e: React.DragEvent, type: 'webcam' | 'gameplay') => {
    e.preventDefault();
    setDragOver(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        const mockEvent = {
          target: { files: [file] }
        } as any;
        
        if (type === 'webcam') {
          onWebcamSelect(mockEvent);
        } else {
          onGameplaySelect(mockEvent);
        }
      }
    }
  };

  const canCombine = webcamVideo && gameplayVideo && processingStage === 'idle';
  const isProcessing = processingStage === 'uploading' || processingStage === 'processing';

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Video Sources
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload your webcam feed and gameplay footage to create a split-screen video
        </p>
      </div>

      {/* Webcam Upload */}
      <Card className="border-2 border-dashed border-blue-500/30 bg-background/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Webcam className="w-5 h-5 text-blue-400" />
            Webcam / Face Feed
            {webcamVideo && (
              <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!webcamVideo ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver === 'webcam' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-blue-500/30 hover:border-blue-500/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver('webcam');
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, 'webcam')}
            >
              <input
                type="file"
                accept="video/*"
                onChange={onWebcamSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-blue-400">Drop webcam video here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                <FileVideo className="w-8 h-8 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{webcamVideo.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(webcamVideo.file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    URL.revokeObjectURL(webcamVideo.preview);
                    onReset();
                  }}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {processingStage === 'uploading' && uploadProgress.webcam > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Uploading webcam...</span>
                    <span>{Math.round(uploadProgress.webcam)}%</span>
                  </div>
                  <Progress value={uploadProgress.webcam} className="h-2" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gameplay Upload */}
      <Card className="border-2 border-dashed border-green-500/30 bg-background/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="w-5 h-5 text-green-400" />
            Gameplay Footage
            {gameplayVideo && (
              <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!gameplayVideo ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver === 'gameplay' 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-green-500/30 hover:border-green-500/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver('gameplay');
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, 'gameplay')}
            >
              <input
                type="file"
                accept="video/*"
                onChange={onGameplaySelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-400">Drop gameplay video here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                <FileVideo className="w-8 h-8 text-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{gameplayVideo.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(gameplayVideo.file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    URL.revokeObjectURL(gameplayVideo.preview);
                    onReset();
                  }}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {processingStage === 'uploading' && uploadProgress.gameplay > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Uploading gameplay...</span>
                    <span>{Math.round(uploadProgress.gameplay)}%</span>
                  </div>
                  <Progress value={uploadProgress.gameplay} className="h-2" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col space-y-2 mt-auto">
        <AnimatePresence>
          {canCombine && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Button
                onClick={onCombine}
                className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Combine Videos
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {(webcamVideo || gameplayVideo) && (
          <Button
            variant="outline"
            onClick={onReset}
            disabled={isProcessing}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        )}
      </div>

      {/* Requirements */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p className="font-medium">Requirements:</p>
        <ul className="space-y-1 ml-2">
          <li>• Max file size: 500MB each</li>
          <li>• Supported: MP4, MOV, AVI</li>
          <li>• Recommended: 1080p or higher</li>
        </ul>
      </div>
    </div>
  );
}