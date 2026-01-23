"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Info, ExternalLink } from "lucide-react";
import { useMultiPlatformDownloader } from "@/hooks/use-multi-platform-downloader";

interface PlatformInfo {
  name: string;
  icon: string;
  color: string;
  maxConcurrent: number;
}

const PLATFORMS: Record<string, PlatformInfo> = {
  rumble: { name: 'Rumble', icon: '🎬', color: 'bg-green-500', maxConcurrent: 3 },
  kick: { name: 'Kick', icon: '🎮', color: 'bg-green-400', maxConcurrent: 2 },
  twitch: { name: 'Twitch', icon: '📺', color: 'bg-purple-500', maxConcurrent: 1 },
  'google-drive': { name: 'Google Drive', icon: '📁', color: 'bg-blue-500', maxConcurrent: 1 },
};

interface MultiPlatformDownloadFormProps {
  userId: string;
  onDownloadStarted?: (videoId: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
}

export function MultiPlatformDownloadForm({
  userId,
  onDownloadStarted,
  onError,
  compact = false,
}: MultiPlatformDownloadFormProps) {
  const [url, setUrl] = useState('');
  const [withSubtitles, setWithSubtitles] = useState(false);

  const {
    downloading,
    gettingInfo,
    videoInfo,
    error,
    detectPlatform,
    getVideoInfo,
    downloadVideo,
    reset,
  } = useMultiPlatformDownloader({
    onSuccess: (video) => {
      onDownloadStarted?.(video.id);
      setUrl('');
      reset();
    },
    onError: (err) => {
      onError?.(err.response?.data?.message || 'Download failed');
    },
  });

  const platform = url ? detectPlatform(url) : '';
  const platformInfo = platform ? PLATFORMS[platform] : null;

  const handleGetInfo = async () => {
    if (!url) return;
    try {
      await getVideoInfo(url);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleDownload = async () => {
    if (!url || !userId) return;
    try {
      await downloadVideo(url, userId, withSubtitles);
    } catch (err) {
      // Error handled by hook
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Enter video URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleDownload} disabled={!url || downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>

        {platformInfo && (
          <div className="flex items-center gap-2 text-sm">
            <span>{platformInfo.icon}</span>
            <span className="text-muted-foreground">{platformInfo.name} detected</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Video</CardTitle>
        <CardDescription>
          Enter a video URL from Rumble, Kick, Twitch, or Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="video-url">Video URL</Label>
          <Input
            id="video-url"
            placeholder="https://rumble.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {platformInfo && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              <span>{platformInfo.icon}</span>
              Platform: {platformInfo.name}
            </AlertTitle>
            <AlertDescription>
              Max concurrent downloads: {platformInfo.maxConcurrent}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="with-subtitles"
            checked={withSubtitles}
            onChange={(e) => setWithSubtitles(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="with-subtitles" className="cursor-pointer">
            Auto-generate subtitles after download
          </Label>
        </div>

        {videoInfo && (
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-sm">Video Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <strong>Title:</strong> {videoInfo.title}
              </div>
              {videoInfo.duration && (
                <div>
                  <strong>Duration:</strong>{' '}
                  {Math.floor(videoInfo.duration / 60)}:
                  {(videoInfo.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
              {videoInfo.thumbnail && (
                <img
                  src={videoInfo.thumbnail}
                  alt="Video thumbnail"
                  className="rounded-md mt-2 max-w-xs"
                />
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleGetInfo}
            disabled={!url || gettingInfo}
            variant="outline"
            className="flex-1"
          >
            {gettingInfo ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Info...
              </>
            ) : (
              <>
                <Info className="mr-2 h-4 w-4" />
                Get Info
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!url || downloading}
            className="flex-1"
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Supported Platforms:</p>
          <div className="flex flex-wrap gap-2">
            {Object.values(PLATFORMS).map((p) => (
              <Badge key={p.name} variant="outline">
                <span className="mr-1">{p.icon}</span>
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
