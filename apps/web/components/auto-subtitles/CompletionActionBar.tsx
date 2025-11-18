'use client';

import { useState } from 'react';
import { CheckCircle, Play, Download, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoData {
  id: string;
  name: string;
  size: number;
  filePath: string;
  videoUrl?: string;
  subtitles?: string;
  detectedLanguages?: string[];
}

interface CompletionActionBarProps {
  videoData: VideoData | null;
  onPreview: () => void;
  onDownload: (type?: 'video' | 'srt' | 'vtt') => void;
}

export function CompletionActionBar({
  videoData,
  onPreview,
  onDownload
}: CompletionActionBarProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (!videoData) return null;

  const handleDownload = async (type?: 'video' | 'srt' | 'vtt') => {
    setIsDownloading(true);
    try {
      await onDownload(type);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="bg-green-950/90 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Subtitles Ready!</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onPreview}>
                <Play className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={isDownloading}>
                    {isDownloading ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    {isDownloading ? 'Downloading...' : 'Download'}
                    {!isDownloading && <ChevronDown className="w-3 h-3 ml-1" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload('video')} disabled={isDownloading}>
                    <Download className="w-3 h-3 mr-2" />
                    Download Video with Subtitles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('srt')} disabled={isDownloading}>
                    <Download className="w-3 h-3 mr-2" />
                    Download SRT File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('vtt')} disabled={isDownloading}>
                    <Download className="w-3 h-3 mr-2" />
                    Download VTT File
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}