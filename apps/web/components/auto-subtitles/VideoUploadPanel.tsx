'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileVideo, Settings, Folder, Link2, Youtube, Twitter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoSelectorModal } from '@/components/video-selector-modal';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

type UploadStage = 'idle' | 'configuring' | 'downloading' | 'uploading' | 'processing' | 'completed' | 'error';

interface VideoUploadPanelProps {
  selectedFile: File | null;
  uploadStage: UploadStage;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoSelect?: (video: any) => void;
  onReset: () => void;
  onConfigure: () => void;
  availableLanguages: Array<{ code: string; name: string; priority: number }>;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function VideoUploadPanel({
  selectedFile,
  uploadStage,
  onFileSelect,
  onVideoSelect,
  onReset,
  onConfigure,
  availableLanguages,
  selectedLanguage,
  onLanguageChange
}: VideoUploadPanelProps) {
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        // Create a synthetic event to reuse onFileSelect
        const syntheticEvent = {
          target: { files: [file] },
          currentTarget: { files: [file] }
        } as any;
        onFileSelect(syntheticEvent);
        setActiveTab('file'); // Switch to file tab
      } else {
        setError('Please drop a video file');
      }
    }
  };

  const handleVideoSelect = (video: any) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    }
    setShowVideoSelector(false);
  };

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
        
        // Extract the direct video URL from yt-dlp (e.g., video.twimg.com for Twitter)
        const directVideoUrl = result.videoInfo.url; // This is the direct .mp4 URL
        console.log('Direct video URL from yt-dlp:', directVideoUrl);
        console.log('Full videoInfo:', result.videoInfo);
        
        // For Twitter videos, use backend proxy to bypass CORS
        const isTwitterVideo = directVideoUrl?.includes('video.twimg.com');
        const proxyUrl = isTwitterVideo 
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/video-url-upload/proxy?url=${encodeURIComponent(directVideoUrl)}`
          : directVideoUrl;
        
        console.log('Using proxy for Twitter:', isTwitterVideo);
        console.log('Final preview URL:', proxyUrl);
        
        // Immediately pass video info to parent for preview
        if (onVideoSelect) {
          const previewData = {
            id: 'url-preview',
            name: result.videoInfo.title,
            size: 0,
            // Use proxy URL for Twitter videos to bypass CORS
            videoUrl: proxyUrl || url,
            s3Url: proxyUrl || url,
            originalName: result.videoInfo.title,
            isUrlPreview: true,
            urlData: {
              url: url, // Original tweet URL
              originalUrl: result.videoInfo.originalUrl || url,
              directUrl: directVideoUrl, // Direct .mp4 URL from yt-dlp
              proxyUrl: proxyUrl, // Proxied URL for playback
              platform: result.platform,
              thumbnail: result.videoInfo.thumbnail,
              duration: result.videoInfo.duration
            }
          };
          console.log('Preview data with proxy URL:', previewData);
          console.log('Video will preview from:', previewData.videoUrl);
          console.log('Calling onVideoSelect with previewData');
          onVideoSelect(previewData);
          console.log('onVideoSelect called successfully');
          
          // Clear the URL input and state after successfully adding
          setUrl("");
          setVideoInfo(null);
          setPlatform(null);
        }
      } else {
        setError(result.error || "Failed to get video information");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to validate URL");
    } finally {
      setValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !uploading && !validating) {
      handleValidateUrl();
    }
  };

  return (
    <>
      <VideoSelectorModal
        isOpen={showVideoSelector}
        onClose={() => setShowVideoSelector(false)}
        onSelect={handleVideoSelect}
        acceptedFileTypes="video/*"
        maxFileSize={500}
      />
    <Card className="h-full border-2 border-dashed border-gray-600 hover:border-blue-400 transition-colors duration-300">
      <CardHeader>
        <CardTitle className="text-center text-lg">
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              {/* Language Selection - Show at top for both methods */}
              <div className="space-y-2 text-left">
                <label htmlFor="language-select" className="text-sm font-medium">
                  Video Language
                </label>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url" className="gap-2">
                    <Link2 className="w-4 h-4" />
                    From URL
                  </TabsTrigger>
                  <TabsTrigger value="file" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                {/* URL Upload Tab */}
                <TabsContent value="url" className="space-y-4 mt-4">
                  <div className="text-center space-y-3">
                    <motion.div
                      className="w-16 h-16 mx-auto rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link2 className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    
                    <h3 className="text-lg font-semibold">Paste Video URL</h3>
                    <p className="text-muted-foreground text-sm">
                      YouTube, Twitter/X, TikTok, Instagram
                    </p>

                    {/* URL Input */}
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="Paste YouTube, TikTok, Instagram, or X/Twitter link..."
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          setError(null);
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={uploading || validating}
                        className="flex-1"
                      />
                      
                      <Button 
                        onClick={handleValidateUrl} 
                        disabled={validating || !url.trim()}
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {validating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Validating
                          </>
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </div>

                    {/* Platform badges */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary" className="text-xs">
                        <Youtube className="mr-1 h-3 w-3" />
                        YouTube
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Twitter className="mr-1 h-3 w-3" />
                        Twitter/X
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <FileVideo className="mr-1 h-3 w-3" />
                        TikTok
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <FileVideo className="mr-1 h-3 w-3" />
                        Instagram
                      </Badge>
                    </div>

                    {/* Error Alert */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>

                {/* File Upload Tab */}
                <TabsContent value="file" className="space-y-4 mt-4">
                  <div 
                    className={`text-center space-y-3 p-6 rounded-lg border-2 border-dashed transition-all ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-gray-600 hover:border-blue-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <motion.div
                      className="w-16 h-16 mx-auto rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Upload className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    
                    <h3 className="text-lg font-semibold">
                      {isDragging ? 'Drop video here' : 'Choose a video file'}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {isDragging ? 'Release to upload' : 'Drag & drop or click to browse'}
                    </p>

                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button 
                        size="sm"
                        onClick={() => setShowVideoSelector(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Folder className="w-4 h-4 mr-2" />
                        My Clips
                      </Button>
                      
                      <input
                        type="file"
                        accept="video/*"
                        onChange={onFileSelect}
                        className="hidden"
                        id="video-upload"
                      />
                      
                      <label htmlFor="video-upload">
                        <Button 
                          asChild
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                        >
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload New
                          </span>
                        </Button>
                      </label>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Maximum: 500MB
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* File Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <FileVideo className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{selectedFile.name}</h4>
                  <p className="text-muted-foreground text-xs">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={onReset}
                  disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                  size="sm"
                >
                  Change File
                </Button>
                <Button 
                  onClick={onConfigure}
                  disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
    </>
  );
}