'use client';

import { Upload, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

type UploadStage = 'idle' | 'configuring' | 'uploading' | 'processing' | 'completed' | 'error';

interface ProgressOverlayProps {
  uploadStage: UploadStage;
  uploadProgress: number;
  processingProgress: number;
  error: string;
  onRetry: () => void;
}

export function ProgressOverlay({
  uploadStage,
  uploadProgress,
  processingProgress,
  error,
  onRetry
}: ProgressOverlayProps) {
  if (uploadStage !== 'uploading' && uploadStage !== 'processing' && uploadStage !== 'error') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardContent className="p-6">
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
              <p className="text-sm text-muted-foreground">{Math.round(processingProgress)}% complete</p>
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