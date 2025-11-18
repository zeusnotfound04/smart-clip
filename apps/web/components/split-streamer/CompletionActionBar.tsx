'use client';

import { useState } from 'react';
import { CheckCircle, Play, Download, ChevronDown, Loader2, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectData {
  id: string;
  name: string;
  outputUrl?: string;
  status: string;
}

interface CompletionActionBarProps {
  projectData: ProjectData | null;
  onPreview: () => void;
  onDownload: () => void;
}

export function CompletionActionBar({
  projectData,
  onPreview,
  onDownload
}: CompletionActionBarProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (!projectData) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && projectData.outputUrl) {
      try {
        await navigator.share({
          title: 'Split Screen Video',
          text: 'Check out my split-screen video created with SmartClips!',
          url: projectData.outputUrl,
        });
      } catch (error) {
        // Fallback to copying URL to clipboard
        navigator.clipboard.writeText(projectData.outputUrl);
      }
    } else if (projectData.outputUrl) {
      navigator.clipboard.writeText(projectData.outputUrl);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="bg-green-950/90 border-green-500/30 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div className="space-y-1">
              <span className="text-green-400 font-medium block">Split-Screen Video Ready!</span>
              <p className="text-xs text-green-400/70">Your combined video is ready to download</p>
            </div>
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
                  <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                    <Download className="w-3 h-3 mr-2" />
                    Download MP4 Video
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare} disabled={!projectData.outputUrl}>
                    <Share2 className="w-3 h-3 mr-2" />
                    Share Link
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