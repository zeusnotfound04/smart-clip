'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { AppHeader } from '@/components/shared/AppHeader';
import Silk from '@/components/slik-background';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditExhaustedDialog } from "@/components/credit-exhausted-dialog";
import { useCreditError } from "@/hooks/use-credit-error";
import { 
  Upload, 
  Youtube, 
  Download,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Video,
  FileVideo,
  Link as LinkIcon,
  Sparkles
} from "lucide-react";
import {
  WizardStep,
  SubtitleStyleKey,
  VideoSourceType,
  YouTubeVideoInfo,
  UploadedVideoInfo,
  ClipRange,
  ProjectStatusResponse,
  ProjectStatus,
  SUBTITLE_STYLE_PREVIEWS,
  PROCESSING_STAGES,
  MAX_SOURCE_DURATION,
  MAX_CLIP_DURATION,
  MIN_CLIP_DURATION,
  CREDITS_PER_MINUTE,
  WHISPER_MODELS,
} from "@/types/podcast-clipper";

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function parseTimeInput(value: string): number {
  // Handle MM:SS or HH:MM:SS format
  const parts = value.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parseFloat(value) || 0;
}

// ============================================================================
// Main Component
// ============================================================================

export default function PodcastClipperPage() {
  const { user } = useAuth();
  const { creditError, hideCreditError, handleApiError } = useCreditError();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('source');
  
  // Source selection
  const [sourceType, setSourceType] = useState<VideoSourceType>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeInfo, setYoutubeInfo] = useState<YouTubeVideoInfo | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideoInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Clip selection
  const [clipRange, setClipRange] = useState<ClipRange>({ start: 0, end: 60 });
  const [startTimeInput, setStartTimeInput] = useState('0:00');
  const [endTimeInput, setEndTimeInput] = useState('1:00');
  
  // Style selection
  const [selectedStyle, setSelectedStyle] = useState<SubtitleStyleKey>('chris_cinematic');
  const [whisperModel, setWhisperModel] = useState('base');
  
  // Processing
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatusResponse | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedCredits, setEstimatedCredits] = useState(0);

  // Calculate credits when clip range changes
  useEffect(() => {
    const duration = clipRange.end - clipRange.start;
    const credits = Math.ceil(duration / 60) * CREDITS_PER_MINUTE;
    setEstimatedCredits(credits);
  }, [clipRange]);

  // Fetch YouTube info
  const fetchYouTubeInfo = useCallback(async () => {
    if (!youtubeUrl.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getPodcastClipperYouTubeInfo(youtubeUrl);
      if (response.success && response.videoInfo) {
        setYoutubeInfo(response.videoInfo);
        // Set default clip range
        const defaultEnd = Math.min(60, response.videoInfo.duration);
        setClipRange({ start: 0, end: defaultEnd });
        setEndTimeInput(formatDuration(defaultEnd));
      } else {
        setError(response.error || 'Failed to fetch video info');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch video info');
    } finally {
      setIsLoading(false);
    }
  }, [youtubeUrl]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const response = await apiClient.uploadPodcastClipperVideo(file, (progress: number) => {
        setUploadProgress(progress);
      });

      if (response.success) {
        setUploadedVideo({
          videoId: response.videoId,
          filename: response.filename,
          size: response.size,
          duration: response.duration,
          previewUrl: response.previewUrl,
          uploadedAt: response.uploadedAt || new Date().toISOString()
        });
        // Set default clip range
        const duration = response.duration || 60;
        const defaultEnd = Math.min(60, duration);
        setClipRange({ start: 0, end: defaultEnd });
        setEndTimeInput(formatDuration(defaultEnd));
        setSourceType('upload');
      } else {
        setError('Failed to upload video');
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (!handleApiError(err)) {
        setError(error.message || 'Failed to upload video');
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // Handle time input changes
  const handleStartTimeChange = (value: string) => {
    setStartTimeInput(value);
    const seconds = parseTimeInput(value);
    if (!isNaN(seconds) && seconds >= 0) {
      setClipRange(prev => ({ ...prev, start: seconds }));
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTimeInput(value);
    const seconds = parseTimeInput(value);
    if (!isNaN(seconds) && seconds > 0) {
      setClipRange(prev => ({ ...prev, end: seconds }));
    }
  };

  // Create project and start processing
  const handleCreateProject = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const totalDuration = sourceType === 'youtube' 
        ? youtubeInfo?.duration 
        : uploadedVideo?.duration;

      const response = await apiClient.createPodcastClipperProject({
        sourceType: sourceType,
        sourceUrl: sourceType === 'youtube' ? youtubeUrl : undefined,
        videoId: sourceType === 'upload' ? uploadedVideo?.videoId : undefined,
        title: sourceType === 'youtube' ? youtubeInfo?.title : uploadedVideo?.filename,
        thumbnail: youtubeInfo?.thumbnail,
        totalDuration,
        clipStartTime: clipRange.start,
        clipEndTime: clipRange.end,
        subtitleStyle: selectedStyle,
        whisperModel,
      });

      if (response.success && response.projectId) {
        setProjectId(response.projectId);
        setStep('processing');
        
        // Start polling for status
        pollProjectStatus(response.projectId);
      } else {
        setError('Failed to create project');
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (!handleApiError(err)) {
        setError(error.message || 'Failed to create project');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Poll project status
  const pollProjectStatus = async (id: string) => {
    try {
      await apiClient.pollPodcastClipperProject(
        id,
        (status: { status: string; progress: number; processingStage?: string; speakersDetected?: number; layoutMode?: string }) => {
          setProjectStatus({
            id,
            status: status.status as ProjectStatus,
            progress: status.progress,
            processingStage: status.processingStage,
            createdAt: new Date().toISOString(),
          });
        }
      );

      // Fetch final status
      const finalStatus = await apiClient.getPodcastClipperProjectStatus(id);
      setProjectStatus({
        id: finalStatus.id,
        status: finalStatus.status as ProjectStatus,
        progress: finalStatus.progress,
        processingStage: finalStatus.processingStage,
        speakersDetected: finalStatus.speakersDetected,
        layoutMode: finalStatus.layoutMode,
        outputUrl: finalStatus.outputUrl,
        outputSignedUrl: finalStatus.outputSignedUrl,
        errorMessage: finalStatus.errorMessage,
        createdAt: finalStatus.createdAt,
        completedAt: finalStatus.completedAt,
      });
      setStep('complete');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Processing failed');
      setProjectStatus(prev => prev ? { ...prev, status: 'failed' as ProjectStatus, errorMessage: error.message } : null);
    }
  };

  // Validate current step
  const canProceed = (): boolean => {
    switch (step) {
      case 'source':
        if (sourceType === 'youtube') return !!youtubeInfo;
        if (sourceType === 'upload') return !!uploadedVideo;
        return false;
      case 'preview':
        const duration = clipRange.end - clipRange.start;
        return duration >= MIN_CLIP_DURATION && duration <= MAX_CLIP_DURATION;
      case 'style':
        return !!selectedStyle;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  // Navigate steps
  const goToNextStep = () => {
    const steps: WizardStep[] = ['source', 'preview', 'style', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const steps: WizardStep[] = ['source', 'preview', 'style', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const resetState = () => {
    setStep('source');
    setSourceType('youtube');
    setYoutubeUrl('');
    setYoutubeInfo(null);
    setUploadedVideo(null);
    setClipRange({ start: 0, end: 60 });
    setStartTimeInput('0:00');
    setEndTimeInput('1:00');
    setProjectId(null);
    setProjectStatus(null);
    setError(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Silk Background */}
      <div className="absolute inset-0 z-0">
        <Silk
          speed={5}
          scale={1.5}
          color="#2B2B2B"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>

      {/* Header */}
      <div className="relative z-10">
        <AppHeader 
          title="Podcast Clipper"
          description="Create viral short-form clips with AI-powered subtitles"
          icon={<Scissors className="w-6 h-6 text-white" />}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Progress Steps */}
          {step !== 'processing' && step !== 'complete' && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {['source', 'preview', 'style', 'confirm'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${step === s ? 'bg-primary text-primary-foreground scale-110' : 
                      ['source', 'preview', 'style', 'confirm'].indexOf(step) > i 
                        ? 'bg-green-500 text-white' 
                        : 'bg-muted text-muted-foreground'}
                  `}>
                    {['source', 'preview', 'style', 'confirm'].indexOf(step) > i ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < 3 && (
                    <div className={`w-16 h-1 mx-2 rounded transition-all ${
                      ['source', 'preview', 'style', 'confirm'].indexOf(step) > i 
                        ? 'bg-green-500' 
                        : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3 mb-6"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-destructive flex-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </motion.div>
          )}

          {/* Step 1: Source Selection */}
          {step === 'source' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Choose Your Video Source</h2>
                <p className="text-muted-foreground">
                  Import from YouTube or upload your own video (max 3 hours)
                </p>
              </div>

              <Tabs 
                value={sourceType} 
                onValueChange={(v) => setSourceType(v as VideoSourceType)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="youtube" className="gap-2">
                    <Youtube className="w-4 h-4" />
                    YouTube Import
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="youtube" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        Paste YouTube URL
                      </CardTitle>
                      <CardDescription>
                        Enter a YouTube video URL to import
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={fetchYouTubeInfo}
                          disabled={isLoading || !youtubeUrl.trim()}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Fetch Info'
                          )}
                        </Button>
                      </div>

                      {youtubeInfo && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-lg p-4 bg-muted/50"
                        >
                          <div className="flex gap-4">
                            {youtubeInfo.thumbnail && (
                              <img 
                                src={youtubeInfo.thumbnail} 
                                alt={youtubeInfo.title}
                                className="w-40 h-24 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold line-clamp-2">{youtubeInfo.title}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {youtubeInfo.durationFormatted}
                                </span>
                                {youtubeInfo.channelName && (
                                  <span>{youtubeInfo.channelName}</span>
                                )}
                              </div>
                              {youtubeInfo.duration > MAX_SOURCE_DURATION && (
                                <p className="text-destructive text-sm mt-2">
                                  Video exceeds maximum duration of 3 hours
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileVideo className="w-5 h-5" />
                        Upload Video File
                      </CardTitle>
                      <CardDescription>
                        Supported formats: MP4, WebM, MOV, AVI (max 5GB)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="video-upload"
                          disabled={isLoading}
                        />
                        <label 
                          htmlFor="video-upload"
                          className="cursor-pointer flex flex-col items-center gap-4"
                        >
                          <Upload className="w-12 h-12 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Click to upload or drag and drop</p>
                            <p className="text-sm text-muted-foreground">
                              Maximum file size: 5GB
                            </p>
                          </div>
                        </label>
                      </div>

                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="space-y-2">
                          <Progress value={uploadProgress} />
                          <p className="text-sm text-center text-muted-foreground">
                            Uploading... {uploadProgress}%
                          </p>
                        </div>
                      )}

                      {uploadedVideo && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-lg p-4 bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            <Video className="w-10 h-10 text-muted-foreground" />
                            <div className="flex-1">
                              <h3 className="font-semibold">{uploadedVideo.filename}</h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>{Math.round(uploadedVideo.size / 1024 / 1024)}MB</span>
                                {uploadedVideo.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {formatDuration(uploadedVideo.duration)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button 
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                  className="gap-2"
                  size="lg"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Clip Selection */}
          {step === 'preview' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Select Clip Range</h2>
                <p className="text-muted-foreground">
                  Choose the section you want to clip (max 10 minutes)
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Clip Settings</CardTitle>
                  <CardDescription>
                    Set the start and end time for your clip
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Video Preview */}
                  {(youtubeInfo?.thumbnail || uploadedVideo?.previewUrl) && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      {youtubeInfo?.thumbnail ? (
                        <img 
                          src={youtubeInfo.thumbnail} 
                          alt="Video thumbnail"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : uploadedVideo?.previewUrl ? (
                        <video 
                          src={uploadedVideo.previewUrl}
                          controls
                          className="max-w-full max-h-full"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* Time Inputs */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        value={startTimeInput}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        placeholder="0:00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: MM:SS or HH:MM:SS
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        value={endTimeInput}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        placeholder="1:00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Max clip duration: 10 minutes
                      </p>
                    </div>
                  </div>

                  {/* Clip Info */}
                  <div className="bg-muted rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Clip Duration</p>
                        <p className="text-lg font-semibold">
                          {formatDuration(clipRange.end - clipRange.start)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Credits</p>
                        <p className="text-lg font-semibold">{estimatedCredits}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Processing Time</p>
                        <p className="text-lg font-semibold">
                          ~{Math.ceil((clipRange.end - clipRange.start) / 60) * 2} min
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Validation Messages */}
                  {clipRange.end - clipRange.start < MIN_CLIP_DURATION && (
                    <p className="text-destructive text-sm">
                      Clip must be at least {MIN_CLIP_DURATION} seconds
                    </p>
                  )}
                  {clipRange.end - clipRange.start > MAX_CLIP_DURATION && (
                    <p className="text-destructive text-sm">
                      Clip cannot exceed {MAX_CLIP_DURATION / 60} minutes
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPreviousStep} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                  className="gap-2"
                  size="lg"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Style Selection */}
          {step === 'style' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Choose Subtitle Style</h2>
                <p className="text-muted-foreground">
                  Select a viral-style subtitle design for your clip
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(SUBTITLE_STYLE_PREVIEWS) as [SubtitleStyleKey, typeof SUBTITLE_STYLE_PREVIEWS[SubtitleStyleKey]][]).map(([key, style]) => (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedStyle === key 
                          ? 'ring-2 ring-primary border-primary shadow-lg' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedStyle(key)}
                    >
                      <CardContent className="p-4">
                        {/* Style Preview */}
                        <div 
                          className="aspect-video rounded-lg mb-4 flex items-center justify-center p-4"
                          style={{ backgroundColor: style.colors.background }}
                        >
                          <p className="text-center font-bold text-lg">
                            <span style={{ color: style.colors.primary }}>
                              {style.previewText.split(' ').slice(0, -1).join(' ')}{' '}
                            </span>
                            <span style={{ color: style.colors.highlight }}>
                              {style.previewText.split(' ').slice(-1)}
                            </span>
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{style.name}</h3>
                            <p className="text-sm text-muted-foreground">{style.description}</p>
                          </div>
                          {selectedStyle === key && (
                            <CheckCircle2 className="w-6 h-6 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Whisper Model Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transcription Quality</CardTitle>
                  <CardDescription>
                    Choose the AI model for speech recognition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {WHISPER_MODELS.map((model) => (
                      <Button
                        key={model.value}
                        variant={whisperModel === model.value ? 'default' : 'outline'}
                        className="h-auto py-3 flex-col"
                        onClick={() => setWhisperModel(model.value)}
                      >
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs opacity-70">{model.description}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPreviousStep} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  onClick={goToNextStep}
                  disabled={!canProceed()}
                  className="gap-2"
                  size="lg"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Review & Confirm</h2>
                <p className="text-muted-foreground">
                  Review your settings before processing
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* Video Info */}
                  <div className="flex items-start gap-4">
                    {(youtubeInfo?.thumbnail || uploadedVideo?.previewUrl) && (
                      <div className="w-32 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                        {youtubeInfo?.thumbnail ? (
                          <img 
                            src={youtubeInfo.thumbnail} 
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">
                        {sourceType === 'youtube' ? youtubeInfo?.title : uploadedVideo?.filename}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {sourceType === 'youtube' ? 'YouTube Import' : 'Uploaded Video'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clip Range</span>
                      <span className="font-medium">
                        {formatDuration(clipRange.start)} - {formatDuration(clipRange.end)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {formatDuration(clipRange.end - clipRange.start)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtitle Style</span>
                      <span className="font-medium">
                        {SUBTITLE_STYLE_PREVIEWS[selectedStyle].name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transcription Model</span>
                      <span className="font-medium capitalize">{whisperModel}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Credits Required</span>
                      <span className="text-2xl font-bold text-primary">{estimatedCredits}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Estimated processing time: ~{Math.ceil((clipRange.end - clipRange.start) / 60) * 2} minutes
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPreviousStep} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleCreateProject}
                  disabled={isLoading}
                  className="gap-2"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate Clip
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Processing */}
          {step === 'processing' && projectStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Processing Your Clip</h2>
                <p className="text-muted-foreground">
                  This may take a few minutes. You can leave this page and come back later.
                </p>
              </div>

              <Card>
                <CardContent className="p-8 space-y-6">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{projectStatus.progress}%</span>
                    </div>
                    <Progress value={projectStatus.progress} className="h-3" />
                  </div>

                  {/* Current Stage */}
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-lg">
                      {projectStatus.processingStage 
                        ? PROCESSING_STAGES[projectStatus.processingStage]?.label || projectStatus.processingStage
                        : 'Processing...'}
                    </span>
                  </div>

                  {/* Stage Icons */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {['downloading', 'analyzing_faces', 'transcribing', 'rendering'].map((stage, i) => {
                      const stageInfo = PROCESSING_STAGES[stage];
                      const isActive = projectStatus.processingStage === stage;
                      const isPast = projectStatus.progress > (i + 1) * 25;
                      
                      return (
                        <div 
                          key={stage}
                          className={`p-3 rounded-lg transition-all ${
                            isActive ? 'bg-primary/10 text-primary scale-105' : 
                            isPast ? 'text-green-600 bg-green-50' : 'text-muted-foreground'
                          }`}
                        >
                          <div className="text-2xl mb-1">{stageInfo?.icon || '⏳'}</div>
                          <div className="font-medium">{stageInfo?.label.replace('...', '') || stage}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 6: Complete */}
          {step === 'complete' && projectStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Your Clip is Ready!</h2>
                <p className="text-muted-foreground">
                  Your podcast clip has been generated with viral-style subtitles
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* Video Preview */}
                  {projectStatus.outputSignedUrl && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <video 
                        src={projectStatus.outputSignedUrl}
                        controls
                        className="w-full h-full"
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {projectStatus.speakersDetected && (
                      <div className="bg-muted rounded-lg p-4 text-center">
                        <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Speakers Detected</p>
                        <p className="text-xl font-bold">{projectStatus.speakersDetected}</p>
                      </div>
                    )}
                    {projectStatus.layoutMode && (
                      <div className="bg-muted rounded-lg p-4 text-center">
                        <Video className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Layout Mode</p>
                        <p className="text-xl font-bold capitalize">{projectStatus.layoutMode}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button 
                      className="flex-1 gap-2"
                      size="lg"
                      onClick={async () => {
                        if (projectId) {
                          const response = await apiClient.getPodcastClipperDownloadUrl(projectId);
                          if (response.success && response.downloadUrl) {
                            window.open(response.downloadUrl, '_blank');
                          }
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download Video
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 gap-2"
                      size="lg"
                      onClick={resetState}
                    >
                      <Scissors className="w-4 h-4" />
                      Create Another Clip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Credit Exhausted Dialog */}
      <CreditExhaustedDialog
        open={creditError.show}
        onOpenChange={hideCreditError}
        message={creditError.message}
      />
    </div>
  );
}
