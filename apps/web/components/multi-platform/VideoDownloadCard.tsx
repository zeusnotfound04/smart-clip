"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Play,
  Trash2,
  Download,
} from "lucide-react";

interface VideoDownload {
  id: string;
  url: string;
  platform: 'rumble' | 'kick' | 'twitch' | 'google-drive' | 'zoom-clip';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileUrl?: string;
  error?: string;
  progress?: number;
  createdAt: string;
  withSubtitles: boolean;
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  rumble: { name: 'Rumble', icon: '🎬', color: 'bg-green-500' },
  kick: { name: 'Kick', icon: '🎮', color: 'bg-green-400' },
  twitch: { name: 'Twitch', icon: '📺', color: 'bg-purple-500' },
  'google-drive': { name: 'Google Drive', icon: '📁', color: 'bg-blue-500' },
  'zoom-clip': { name: 'Zoom Clips', icon: '📹', color: 'bg-blue-600' },
};

interface VideoDownloadCardProps {
  download: VideoDownload;
  onDelete?: (videoId: string) => void;
  onPlay?: (videoUrl: string) => void;
  onDownload?: (videoUrl: string) => void;
}

export function VideoDownloadCard({
  download,
  onDelete,
  onPlay,
  onDownload,
}: VideoDownloadCardProps) {
  const platformInfo = PLATFORM_INFO[download.platform];

  const getStatusIcon = () => {
    switch (download.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (download.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {download.thumbnailUrl && (
            <img
              src={download.thumbnailUrl}
              alt={download.title || 'Video thumbnail'}
              className="w-32 h-20 object-cover rounded-md"
            />
          )}

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{platformInfo.icon}</span>
              <Badge variant="outline">{platformInfo.name}</Badge>
              <Badge className={getStatusColor()}>{download.status}</Badge>
              {download.withSubtitles && (
                <Badge variant="secondary">With Subtitles</Badge>
              )}
            </div>

            <div>
              <h4 className="font-semibold line-clamp-1">
                {download.title || 'Untitled'}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {download.url}
              </p>
            </div>

            {download.status === 'processing' && download.progress !== undefined && (
              <div className="space-y-1">
                <Progress value={download.progress} />
                <p className="text-xs text-muted-foreground">
                  {download.progress}% complete
                </p>
              </div>
            )}

            {download.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{download.error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {new Date(download.createdAt).toLocaleString()}
              </span>
              {download.duration && (
                <span>
                  {Math.floor(download.duration / 60)}:
                  {(download.duration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {getStatusIcon()}
            {download.status === 'completed' && download.fileUrl && (
              <>
                {onPlay && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPlay(download.fileUrl!)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(download.fileUrl!)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(download.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
