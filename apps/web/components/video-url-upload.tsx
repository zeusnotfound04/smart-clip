"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Youtube, Twitter, Instagram, Video, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface VideoUrlUploadProps {
  onUploadSuccess?: (video: any) => void;
  onUploadStart?: () => void;
  processType?: 'none' | 'subtitles' | 'smart-clipper';
  options?: any;
  showPreview?: boolean;
  className?: string;
}

const platformIcons: { [key: string]: any } = {
  'YouTube': Youtube,
  'Twitter/X': Twitter,
};

export function VideoUrlUpload({
  onUploadSuccess,
  onUploadStart,
  processType = 'none',
  options,
  showPreview = true,
  className = "",
}: VideoUrlUploadProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const [hasCheckedLocalStorage, setHasCheckedLocalStorage] = useState(false);

  // Check for pending URL from localStorage on mount
  useEffect(() => {
    if (hasCheckedLocalStorage) return;
    
    const pendingUrl = localStorage.getItem('pendingVideoUrl');
    if (pendingUrl && !url) {
      setUrl(pendingUrl);
      setHasCheckedLocalStorage(true);
      // Clear it from localStorage
      localStorage.removeItem('pendingVideoUrl');
      localStorage.removeItem('pendingVideoName');
    } else {
      setHasCheckedLocalStorage(true);
    }
  }, [hasCheckedLocalStorage, url]);

  const handleValidateUrl = async () => {
    if (!url.trim()) {
      setError("Please enter a video URL");
      return;
    }

    setValidating(true);
    setError(null);
    setVideoInfo(null);
    setPlatform(null);

    try {
      const result = await apiClient.getVideoInfoFromUrl(url);

      if (result.success && result.videoInfo) {
        setVideoInfo(result.videoInfo);
        setPlatform(result.platform || 'Unknown');
      } else {
        setError(result.error || "Failed to get video information");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to validate URL");
    } finally {
      setValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!url.trim()) {
      setError("Please enter a video URL");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    if (onUploadStart) {
      onUploadStart();
    }

    try {
      const result = await apiClient.uploadFromUrl({
        url,
        projectName: videoInfo?.title,
        processType,
        options,
      });

      if (result.success) {
        setSuccess(true);
        setUrl("");
        setVideoInfo(null);
        setPlatform(null);

        if (onUploadSuccess) {
          onUploadSuccess(result.video);
        }
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || err.message || "Failed to upload video from URL");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !validating) {
      if (videoInfo) {
        handleUpload();
      } else {
        handleValidateUrl();
      }
    }
  };

  const getPlatformIcon = () => {
    if (!platform) return Link2;
    const Icon = platformIcons[platform] || Video;
    return Icon;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Upload from URL
        </CardTitle>
        <CardDescription>
          Paste a video URL from YouTube, Twitter/X, 
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=... or https://x.com/user/status/..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              onKeyPress={handleKeyPress}
              disabled={loading || validating}
              className="pr-10"
            />
            {platform && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {(() => {
                  const Icon = getPlatformIcon();
                  return <Icon className="h-4 w-4 text-muted-foreground" />;
                })()}
              </div>
            )}
          </div>
          
          {!videoInfo ? (
            <Button 
              onClick={handleValidateUrl} 
              disabled={validating || !url.trim()}
              variant="outline"
            >
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Preview"
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleUpload} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          )}
        </div>

        {/* Platform badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            <Youtube className="mr-1 h-3 w-3" />
            YouTube
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <Twitter className="mr-1 h-3 w-3" />
            Twitter/X
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <Instagram className="mr-1 h-3 w-3" />
            Instagram
          </Badge>
   
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Video uploaded successfully! {processType !== 'none' && `Processing ${processType}...`}
            </AlertDescription>
          </Alert>
        )}

        {/* Video Preview */}
        {showPreview && videoInfo && !success && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                {/* Thumbnail */}
                {videoInfo.thumbnail && (
                  <div className="shrink-0">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-32 h-20 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Video Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm line-clamp-2 flex-1">
                      {videoInfo.title}
                    </h4>
                    {platform && (
                      <Badge variant="outline" className="shrink-0">
                        {(() => {
                          const Icon = getPlatformIcon();
                          return <Icon className="mr-1 h-3 w-3" />;
                        })()}
                        {platform}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {videoInfo.durationFormatted || formatDuration(videoInfo.duration)}
                    </span>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View original
                    </a>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {processType === 'subtitles' && "Subtitles will be generated automatically"}
                    {processType === 'smart-clipper' && "AI will analyze and create clips"}
                    {processType === 'none' && "Video will be uploaded without processing"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
