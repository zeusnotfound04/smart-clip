'use client';

import { AlertCircle, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoUpload } from '@/components/video-upload';
import { SmartClipperProject } from '@/types/smart-clipper';

interface UploadViewProps {
  error: string | null;
  onVideoUpload: (uploadedFiles: any[]) => Promise<void>;
}

export function UploadView({ error, onVideoUpload }: UploadViewProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-3">
          <Upload className="w-8 h-8 text-primary" />
          Upload Your Video
        </CardTitle>
        <CardDescription>
          Select a video file to analyze for highlight moments using AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VideoUpload
          maxFiles={1}
          maxSize={2048 * 1024 * 1024} // 2GB
          onUploadComplete={onVideoUpload}
        />
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}