"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface HighlightSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  finalScore: number;
  confidenceLevel: number;
  highlightType?: string;
  reasoning: string;
  status: 'pending' | 'recommended' | 'available' | 'generating' | 'generated' | 'failed';
  userApproval?: 'approved' | 'rejected' | 'modified';
  customStartTime?: number;
  customEndTime?: number;
  audioEnergyAvg?: number;
  silenceRatio?: number;
  sceneChanges?: number;
  outputPath?: string;
  geminiClassification?: string;
  contentTags?: string[];
}

interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'source';
  resolution?: '720p' | '1080p' | '1440p' | '4k' | 'original';
  framerate?: number;
  bitrate?: string;
  addWatermark?: boolean;
  watermarkText?: string;
  includeAudio?: boolean;
  fadeInOut?: boolean;
  cropToAspectRatio?: '16:9' | '9:16' | '1:1' | 'original';
}

interface SegmentPreviewProps {
  segment: HighlightSegment | null;
  videoUrl?: string;
  onSegmentApprove: (segmentId: string, approval: 'approved' | 'rejected' | 'modified') => void;
  onSegmentModify: (segmentId: string, startTime: number, endTime: number) => void;
  onGenerateClip: (segmentId: string, exportSettings: ExportSettings) => void;
  onFeedbackSubmit: (segmentId: string, rating: number, feedback: string) => void;
  exportFormats?: Array<{format: string; name: string; description: string}>;
  qualityPresets?: Array<{quality: string; name: string; description: string}>;
  loading?: boolean;
  generationProgress?: number;
}

interface VideoPreviewPlayerProps {
  videoUrl: string;
  segment: HighlightSegment;
  onTimeUpdate: (currentTime: number) => void;
  autoplay?: boolean;
}

interface SegmentDetailsProps {
  segment: HighlightSegment;
  onApprovalChange: (approval: 'approved' | 'rejected' | 'modified') => void;
  onTimeAdjust: (startTime: number, endTime: number) => void;
}

interface ExportConfigurationProps {
  segment: HighlightSegment;
  exportSettings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onExport: () => void;
  exportFormats?: Array<{format: string; name: string; description: string}>;
  qualityPresets?: Array<{quality: string; name: string; description: string}>;
  loading?: boolean;
  progress?: number;
}

interface FeedbackFormProps {
  segment: HighlightSegment;
  onSubmit: (rating: number, feedback: string) => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getScoreColor = (score: number): string => {
  if (score >= 85) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 65) return 'text-yellow-600';
  if (score >= 55) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreLabel = (score: number): string => {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 65) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Poor';
};

const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  videoUrl,
  segment,
  onTimeUpdate,
  autoplay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(segment.customStartTime || segment.startTime);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      onTimeUpdate(time);
      
      // Loop within segment bounds
      const endTime = segment.customEndTime || segment.endTime;
      if (time >= endTime) {
        video.currentTime = segment.customStartTime || segment.startTime;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Set initial time
    video.currentTime = segment.customStartTime || segment.startTime;

    if (autoplay) {
      video.play();
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [segment, onTimeUpdate, autoplay]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  const seekToStart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = segment.customStartTime || segment.startTime;
  }, [segment]);

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-64 object-contain"
          controls={false}
        />
        
        {/* Custom controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={togglePlayback}
              className="bg-white/20 text-white border-white/30"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={seekToStart}
              className="bg-white/20 text-white border-white/30"
            >
              Reset
            </Button>
            
            <div className="flex-1 text-white text-sm">
              {formatTime(currentTime)} / {formatTime(segment.customEndTime || segment.endTime)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        Segment Duration: {formatTime((segment.customEndTime || segment.endTime) - (segment.customStartTime || segment.startTime))}
      </div>
    </div>
  );
};

const SegmentDetails: React.FC<SegmentDetailsProps> = ({
  segment,
  onApprovalChange,
  onTimeAdjust
}) => {
  const [customStart, setCustomStart] = useState(segment.customStartTime || segment.startTime);
  const [customEnd, setCustomEnd] = useState(segment.customEndTime || segment.endTime);

  const handleStartTimeChange = useCallback((values: number[]) => {
    const newStart = values[0];
    setCustomStart(newStart);
    if (newStart !== (segment.customStartTime || segment.startTime) || 
        customEnd !== (segment.customEndTime || segment.endTime)) {
      onTimeAdjust(newStart, customEnd);
    }
  }, [customEnd, segment, onTimeAdjust]);

  const handleEndTimeChange = useCallback((values: number[]) => {
    const newEnd = values[0];
    setCustomEnd(newEnd);
    if (customStart !== (segment.customStartTime || segment.startTime) || 
        newEnd !== (segment.customEndTime || segment.endTime)) {
      onTimeAdjust(customStart, newEnd);
    }
  }, [customStart, segment, onTimeAdjust]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Segment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score and status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">AI Score</div>
            <div className={cn("text-2xl font-bold", getScoreColor(segment.finalScore))}>
              {segment.finalScore}
              <span className="text-sm font-normal ml-2">
                {getScoreLabel(segment.finalScore)}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Confidence</div>
            <div className="text-2xl font-bold text-gray-700">
              {Math.round(segment.confidenceLevel * 100)}%
            </div>
          </div>
        </div>

        {/* Approval status */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Approval Status</div>
          <div className="flex space-x-2">
            <Button
              variant={segment.userApproval === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onApprovalChange('approved')}
              className="flex-1"
            >
              Approve
            </Button>
            <Button
              variant={segment.userApproval === 'rejected' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => onApprovalChange('rejected')}
              className="flex-1"
            >
              Reject
            </Button>
            <Button
              variant={segment.userApproval === 'modified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onApprovalChange('modified')}
              className="flex-1"
            >
              Modify
            </Button>
          </div>
        </div>

        {/* Time adjustment */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700">Time Adjustment</div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Start Time</span>
                <span className="text-sm text-gray-600">{formatTime(customStart)}</span>
              </div>
              <Slider
                value={[customStart]}
                onValueChange={handleStartTimeChange}
                min={Math.max(0, segment.startTime - 10)}
                max={segment.endTime - 1}
                step={0.1}
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">End Time</span>
                <span className="text-sm text-gray-600">{formatTime(customEnd)}</span>
              </div>
              <Slider
                value={[customEnd]}
                onValueChange={handleEndTimeChange}
                min={segment.startTime + 1}
                max={segment.endTime + 10}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Analysis Details</div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {segment.highlightType && (
              <div>
                <span className="text-gray-500">Type:</span>
                <Badge variant="secondary" className="ml-2">{segment.highlightType}</Badge>
              </div>
            )}
            
            {segment.audioEnergyAvg !== undefined && (
              <div>
                <span className="text-gray-500">Audio Energy:</span>
                <span className="ml-2 font-medium">{Math.round(segment.audioEnergyAvg * 100)}%</span>
              </div>
            )}
            
            {segment.silenceRatio !== undefined && (
              <div>
                <span className="text-gray-500">Silence Ratio:</span>
                <span className="ml-2 font-medium">{Math.round(segment.silenceRatio * 100)}%</span>
              </div>
            )}
            
            {segment.sceneChanges !== undefined && (
              <div>
                <span className="text-gray-500">Scene Changes:</span>
                <span className="ml-2 font-medium">{segment.sceneChanges}</span>
              </div>
            )}
          </div>

          {segment.contentTags && segment.contentTags.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 block mb-2">Content Tags:</span>
              <div className="flex flex-wrap gap-1">
                {segment.contentTags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reasoning */}
        {segment.reasoning && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">AI Reasoning</div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {segment.reasoning}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ExportConfiguration: React.FC<ExportConfigurationProps> = ({
  segment,
  exportSettings,
  onSettingsChange,
  onExport,
  exportFormats = [],
  qualityPresets = [],
  loading = false,
  progress = 0
}) => {
  const updateSetting = useCallback(<K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K]
  ) => {
    onSettingsChange({ ...exportSettings, [key]: value });
  }, [exportSettings, onSettingsChange]);

  const estimatedSize = useMemo(() => {
    const duration = (segment.customEndTime || segment.endTime) - (segment.customStartTime || segment.startTime);
    const baseSizePerSecond = {
      low: 0.1,
      medium: 0.3,
      high: 0.8,
      source: 1.5
    };
    
    const sizePerSecond = baseSizePerSecond[exportSettings.quality] || 0.3;
    const estimatedMB = duration * sizePerSecond;
    
    return estimatedMB < 1 
      ? `${Math.round(estimatedMB * 1000)}KB`
      : `${Math.round(estimatedMB * 10) / 10}MB`;
  }, [segment, exportSettings.quality]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Export Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generating clip...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select
              value={exportSettings.format}
              onValueChange={(value: ExportSettings['format']) => updateSetting('format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exportFormats.length > 0 ? (
                  exportFormats.map((format) => (
                    <SelectItem key={format.format} value={format.format}>
                      {format.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                    <SelectItem value="mov">MOV (QuickTime)</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quality</label>
            <Select
              value={exportSettings.quality}
              onValueChange={(value: ExportSettings['quality']) => updateSetting('quality', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qualityPresets.length > 0 ? (
                  qualityPresets.map((preset) => (
                    <SelectItem key={preset.quality} value={preset.quality}>
                      {preset.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="low">Low Quality</SelectItem>
                    <SelectItem value="medium">Medium Quality</SelectItem>
                    <SelectItem value="high">High Quality</SelectItem>
                    <SelectItem value="source">Source Quality</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <Select
              value={exportSettings.resolution || 'original'}
              onValueChange={(value: string) => updateSetting('resolution', value as ExportSettings['resolution'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="720p">720p HD</SelectItem>
                <SelectItem value="1080p">1080p Full HD</SelectItem>
                <SelectItem value="1440p">1440p 2K</SelectItem>
                <SelectItem value="4k">4K Ultra HD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Aspect Ratio</label>
            <Select
              value={exportSettings.cropToAspectRatio || 'original'}
              onValueChange={(value: string) => updateSetting('cropToAspectRatio', value as ExportSettings['cropToAspectRatio'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeAudio"
              checked={exportSettings.includeAudio !== false}
              onChange={(e) => updateSetting('includeAudio', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="includeAudio" className="text-sm">Include Audio</label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="fadeInOut"
              checked={exportSettings.fadeInOut || false}
              onChange={(e) => updateSetting('fadeInOut', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="fadeInOut" className="text-sm">Add Fade In/Out</label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="addWatermark"
              checked={exportSettings.addWatermark || false}
              onChange={(e) => updateSetting('addWatermark', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="addWatermark" className="text-sm">Add Watermark</label>
          </div>

          {exportSettings.addWatermark && (
            <div className="ml-6 space-y-2">
              <input
                type="text"
                placeholder="Watermark text"
                value={exportSettings.watermarkText || ''}
                onChange={(e) => updateSetting('watermarkText', e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Estimated size: {estimatedSize}
          </div>
          <Button 
            onClick={onExport} 
            disabled={loading}
            className="px-6"
          >
            {loading ? 'Generating...' : 'Generate Clip'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FeedbackForm: React.FC<FeedbackFormProps> = ({ segment, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = useCallback(() => {
    if (rating > 0) {
      onSubmit(rating, feedback);
      setRating(0);
      setFeedback('');
    }
  }, [rating, feedback, onSubmit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Rating (1-5)</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setRating(value)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-colors",
                  rating >= value
                    ? "bg-yellow-400 border-yellow-500 text-white"
                    : "border-gray-300 text-gray-400 hover:border-gray-400"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Comments (optional)</label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What did you think about this highlight?"
            className="min-h-[80px]"
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={rating === 0}
          className="w-full"
        >
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
};

export const SegmentPreviewInterface: React.FC<SegmentPreviewProps> = ({
  segment,
  videoUrl,
  onSegmentApprove,
  onSegmentModify,
  onGenerateClip,
  onFeedbackSubmit,
  exportFormats = [],
  qualityPresets = [],
  loading = false,
  generationProgress = 0
}) => {
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'medium',
    resolution: 'original',
    includeAudio: true,
    cropToAspectRatio: 'original'
  });

  const handleApprovalChange = useCallback((approval: 'approved' | 'rejected' | 'modified') => {
    if (segment) {
      onSegmentApprove(segment.id, approval);
    }
  }, [segment, onSegmentApprove]);

  const handleTimeAdjust = useCallback((startTime: number, endTime: number) => {
    if (segment) {
      onSegmentModify(segment.id, startTime, endTime);
    }
  }, [segment, onSegmentModify]);

  const handleExport = useCallback(() => {
    if (segment) {
      onGenerateClip(segment.id, exportSettings);
    }
  }, [segment, exportSettings, onGenerateClip]);

  const handleFeedbackSubmit = useCallback((rating: number, feedbackText: string) => {
    if (segment) {
      onFeedbackSubmit(segment.id, rating, feedbackText);
    }
  }, [segment, onFeedbackSubmit]);

  if (!segment) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No segment selected</div>
          <div className="text-sm">
            Select a segment from the timeline to preview and configure it here.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Segment Preview</h2>
        <Badge variant="outline">
          {formatTime(segment.customStartTime || segment.startTime)} - {formatTime(segment.customEndTime || segment.endTime)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Video preview and details */}
        <div className="space-y-6">
          {videoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoPreviewPlayer
                  videoUrl={videoUrl}
                  segment={segment}
                  onTimeUpdate={() => {}} // Could add time tracking if needed
                  autoplay={false}
                />
              </CardContent>
            </Card>
          )}

          <SegmentDetails
            segment={segment}
            onApprovalChange={handleApprovalChange}
            onTimeAdjust={handleTimeAdjust}
          />
        </div>

        {/* Right column - Export configuration and feedback */}
        <div className="space-y-6">
          <ExportConfiguration
            segment={segment}
            exportSettings={exportSettings}
            onSettingsChange={setExportSettings}
            onExport={handleExport}
            exportFormats={exportFormats}
            qualityPresets={qualityPresets}
            loading={loading}
            progress={generationProgress}
          />

          <FeedbackForm
            segment={segment}
            onSubmit={handleFeedbackSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default SegmentPreviewInterface;