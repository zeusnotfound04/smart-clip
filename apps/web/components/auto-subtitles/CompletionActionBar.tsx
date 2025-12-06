'use client';

import { CheckCircle, Play, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DownloadButton } from '@/components/download-button';

interface VideoData {
  id: string;
  name: string;
  size: number;
  filePath: string;
  videoUrl?: string;
  subtitles?: string;
  detectedLanguages?: string[];
  subtitleFiles?: {
    srt?: string;
    vtt?: string;
  };
}

interface CompletionActionBarProps {
  videoData: VideoData | null;
  onPreview: () => void;
}

export function CompletionActionBar({
  videoData,
  onPreview,
}: CompletionActionBarProps) {
  if (!videoData) return null;

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
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Download
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {videoData.videoUrl && (
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <DownloadButton
                          s3Url={videoData.videoUrl}
                          fileName={`${videoData.name}_subtitled.mp4`}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start p-0 h-auto"
                        >
                          Download Video with Subtitles
                        </DownloadButton>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {videoData.subtitleFiles?.srt && (
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <DownloadButton
                          s3Url={videoData.subtitleFiles.srt}
                          fileName={`${videoData.name}_subtitles.srt`}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start p-0 h-auto"
                        >
                          Download SRT File
                        </DownloadButton>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {videoData.subtitleFiles?.vtt && (
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <DownloadButton
                          s3Url={videoData.subtitleFiles.vtt}
                          fileName={`${videoData.name}_subtitles.vtt`}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start p-0 h-auto"
                        >
                          Download VTT File
                        </DownloadButton>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}