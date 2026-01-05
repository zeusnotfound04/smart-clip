'use client';

import { Upload, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

type UploadStage = 'idle' | 'configuring' | 'downloading' | 'uploading' | 'processing' | 'completed' | 'error';

interface ProgressOverlayProps {
  uploadStage: UploadStage;
  uploadProgress: number;
  processingProgress: number;
  estimatedTimeRemaining?: number;
  error: string;
  onRetry: () => void;
}

export function ProgressOverlay({
  uploadStage,
  uploadProgress,
  processingProgress,
  estimatedTimeRemaining = 0,
  error,
  onRetry
}: ProgressOverlayProps) {
  if (uploadStage !== 'downloading' && uploadStage !== 'uploading' && uploadStage !== 'processing' && uploadStage !== 'error') {
    return null;
  }

  const formatTime = (minutes: number) => {
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardContent className="p-6">
          {uploadStage === 'downloading' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <Upload className="w-8 h-8 text-blue-400 animate-bounce" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                </div>
              </div>
              <h3 className="font-semibold text-lg">Downloading from YouTube</h3>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
              <p className="text-xs text-muted-foreground/70 italic">
                Fetching video from YouTube... This may take a few moments.
              </p>
            </div>
          )}
          
          {uploadStage === 'uploading' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="font-semibold">Uploading Video</h3>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
            </div>
          )}
          
          {uploadStage === 'processing' && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center">
                <Clock className="w-8 h-8 text-yellow-400 animate-spin" />
              </div>
              <h3 className="font-semibold">Generating Subtitles</h3>
              <Progress value={processingProgress} className="h-2" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{Math.round(processingProgress)}% complete</p>
                {estimatedTimeRemaining > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estimated time remaining: {formatTime(estimatedTimeRemaining)}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground/70 italic">
                Processing may take several minutes for long videos. Please don't close this page.
              </p>
            </div>
          )}
          
          {uploadStage === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="font-semibold text-red-400">Processing Failed</h3>
              <p className="text-muted-foreground text-sm">{error}</p>
              <Button onClick={onRetry} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}