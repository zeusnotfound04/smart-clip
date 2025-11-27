"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { HighlightSegment } from '@/types/smart-clipper';

interface VideoTimelineProps {
  segments: HighlightSegment[];
  videoDuration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onSegmentSelect: (segment: HighlightSegment) => void;
  onSegmentModify: (segmentId: string, startTime: number, endTime: number) => void;
  selectedSegmentId?: string;
  audioWaveform?: number[];
  sceneChanges?: number[];
  loading?: boolean;
  readonly?: boolean;
}

interface TimelineSegmentProps {
  segment: HighlightSegment;
  videoDuration: number;
  isSelected: boolean;
  onClick: () => void;
  onModify: (startTime: number, endTime: number) => void;
  readonly?: boolean;
}

interface WaveformDisplayProps {
  waveform: number[];
  videoDuration: number;
  currentTime: number;
  segments: HighlightSegment[];
  sceneChanges?: number[];
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getSegmentColor = (segment: HighlightSegment): string => {
  if (segment.userApproval === 'rejected') return 'bg-red-500';
  if (segment.userApproval === 'approved') return 'bg-green-500';
  if (segment.userApproval === 'modified') return 'bg-yellow-500';
  
  if (segment.status === 'failed') return 'bg-red-400';
  if (segment.status === 'generating') return 'bg-blue-400 animate-pulse';
  if (segment.status === 'generated') return 'bg-green-400';
  
  if (segment.finalScore >= 85) return 'bg-emerald-500';
  if (segment.finalScore >= 75) return 'bg-blue-500';
  if (segment.finalScore >= 65) return 'bg-yellow-500';
  if (segment.finalScore >= 55) return 'bg-orange-500';
  return 'bg-gray-500';
};

const getSegmentLabel = (segment: HighlightSegment): string => {
  if (segment.userApproval) return segment.userApproval;
  if (segment.status === 'generating') return 'generating';
  if (segment.status === 'generated') return 'ready';
  if (segment.status === 'failed') return 'failed';
  
  if (segment.finalScore >= 85) return 'excellent';
  if (segment.finalScore >= 75) return 'very good';
  if (segment.finalScore >= 65) return 'good';
  if (segment.finalScore >= 55) return 'fair';
  return 'poor';
};

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  waveform,
  videoDuration,
  currentTime,
  segments,
  sceneChanges = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform.length) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    ctx.fillStyle = '#e5e7eb';
    const barWidth = width / waveform.length;
    
    waveform.forEach((amplitude, index) => {
      const barHeight = amplitude * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
    
    // Draw scene changes
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    sceneChanges.forEach(sceneTime => {
      const x = (sceneTime / videoDuration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
    
    // Draw current time indicator
    const currentX = (currentTime / videoDuration) * width;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
    
  }, [waveform, videoDuration, currentTime, sceneChanges]);
  
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={80}
      className="w-full h-20 border rounded bg-gray-50"
    />
  );
};

const TimelineSegment: React.FC<TimelineSegmentProps> = ({
  segment,
  videoDuration,
  isSelected,
  onClick,
  onModify,
  readonly = false
}) => {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [tempTimes, setTempTimes] = useState<{ start: number; end: number } | null>(null);
  
  const segmentRef = useRef<HTMLDivElement>(null);
  
  const leftPercentage = (segment.startTime / videoDuration) * 100;
  const widthPercentage = ((segment.endTime - segment.startTime) / videoDuration) * 100;
  
  const effectiveStartTime = tempTimes?.start ?? segment.customStartTime ?? segment.startTime;
  const effectiveEndTime = tempTimes?.end ?? segment.customEndTime ?? segment.endTime;
  
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: 'start' | 'end') => {
    if (readonly) return;
    e.stopPropagation();
    setIsDragging(handle);
    setTempTimes({ start: effectiveStartTime, end: effectiveEndTime });
  }, [readonly, effectiveStartTime, effectiveEndTime]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !segmentRef.current || !tempTimes) return;
    
    const rect = segmentRef.current.parentElement!.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const newTime = (relativeX / timelineWidth) * videoDuration;
    
    setTempTimes(prev => {
      if (!prev) return null;
      
      if (isDragging === 'start') {
        return {
          start: Math.max(0, Math.min(newTime, prev.end - 1)),
          end: prev.end
        };
      } else {
        return {
          start: prev.start,
          end: Math.max(prev.start + 1, Math.min(newTime, videoDuration))
        };
      }
    });
  }, [isDragging, videoDuration, tempTimes]);
  
  const handleMouseUp = useCallback(() => {
    if (isDragging && tempTimes) {
      onModify(tempTimes.start, tempTimes.end);
    }
    setIsDragging(null);
    setTempTimes(null);
  }, [isDragging, tempTimes, onModify]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const displayStartTime = tempTimes?.start ?? effectiveStartTime;
  const displayEndTime = tempTimes?.end ?? effectiveEndTime;
  const displayLeftPercentage = (displayStartTime / videoDuration) * 100;
  const displayWidthPercentage = ((displayEndTime - displayStartTime) / videoDuration) * 100;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={segmentRef}
            className={cn(
              "absolute h-8 rounded cursor-pointer border-2 transition-all duration-200",
              getSegmentColor(segment),
              isSelected ? "border-white shadow-lg z-10" : "border-transparent",
              "hover:shadow-md hover:scale-105"
            )}
            style={{
              left: `${displayLeftPercentage}%`,
              width: `${Math.max(displayWidthPercentage, 1)}%`
            }}
            onClick={onClick}
          >
            <div className="flex items-center justify-between h-full px-1">
              <Badge 
                variant="secondary" 
                className="text-xs bg-white/20 text-white border-0 px-1"
              >
                {Math.round(segment.finalScore)}
              </Badge>
              
              {!readonly && isSelected && (
                <>
                  <div
                    className="absolute left-0 top-0 w-2 h-full bg-white/30 cursor-ew-resize rounded-l"
                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                  />
                  <div
                    className="absolute right-0 top-0 w-2 h-full bg-white/30 cursor-ew-resize rounded-r"
                    onMouseDown={(e) => handleMouseDown(e, 'end')}
                  />
                </>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{segment.highlightType || 'Highlight'}</div>
            <div>Score: {segment.finalScore}/100</div>
            <div>Time: {formatTime(displayStartTime)} - {formatTime(displayEndTime)}</div>
            <div>Duration: {formatTime(displayEndTime - displayStartTime)}</div>
            <div>Status: {getSegmentLabel(segment)}</div>
            {segment.reasoning && (
              <div className="max-w-xs">
                <span className="font-medium">Reason:</span> {segment.reasoning}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const TimelineControls: React.FC<{
  currentTime: number;
  videoDuration: number;
  onTimeChange: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
}> = ({ currentTime, videoDuration, onTimeChange, onZoomChange, zoom }) => {
  const handleTimeChange = useCallback((values: number[]) => {
    onTimeChange(values[0]);
  }, [onTimeChange]);
  
  const handleZoomChange = useCallback((values: number[]) => {
    onZoomChange(values[0]);
  }, [onZoomChange]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium min-w-0">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          onValueChange={handleTimeChange}
          min={0}
          max={videoDuration}
          step={0.1}
          className="flex-1"
        />
        <span className="text-sm text-gray-500 min-w-0">
          {formatTime(videoDuration)}
        </span>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium min-w-0">
          Zoom:
        </span>
        <Slider
          value={[zoom]}
          onValueChange={handleZoomChange}
          min={1}
          max={10}
          step={0.5}
          className="w-32"
        />
        <span className="text-sm text-gray-500">
          {zoom}x
        </span>
      </div>
    </div>
  );
};

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  segments,
  videoDuration,
  currentTime,
  onTimeChange,
  onSegmentSelect,
  onSegmentModify,
  selectedSegmentId,
  audioWaveform = [],
  sceneChanges = [],
  loading = false,
  readonly = false
}) => {
  const [zoom, setZoom] = useState(1);
  const [viewportStart, setViewportStart] = useState(0);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => a.startTime - b.startTime);
  }, [segments]);
  
  const visibleDuration = videoDuration / zoom;
  const viewportEnd = Math.min(viewportStart + visibleDuration, videoDuration);
  
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickedTime = viewportStart + (relativeX / timelineWidth) * visibleDuration;
    
    onTimeChange(Math.max(0, Math.min(clickedTime, videoDuration)));
  }, [viewportStart, visibleDuration, videoDuration, onTimeChange]);
  
  const handleSegmentSelect = useCallback((segment: HighlightSegment) => {
    onSegmentSelect(segment);
    
    // Auto-center on selected segment if it's outside the viewport
    const segmentCenter = (segment.startTime + segment.endTime) / 2;
    if (segmentCenter < viewportStart || segmentCenter > viewportEnd) {
      const newViewportStart = Math.max(0, segmentCenter - visibleDuration / 2);
      setViewportStart(Math.min(newViewportStart, videoDuration - visibleDuration));
    }
  }, [onSegmentSelect, viewportStart, viewportEnd, visibleDuration, videoDuration]);
  
  const handleSegmentModify = useCallback((segmentId: string, startTime: number, endTime: number) => {
    onSegmentModify(segmentId, startTime, endTime);
  }, [onSegmentModify]);
  
  useEffect(() => {
    // Auto-scroll to follow current time
    if (currentTime < viewportStart || currentTime > viewportEnd) {
      const newViewportStart = Math.max(0, currentTime - visibleDuration / 2);
      setViewportStart(Math.min(newViewportStart, videoDuration - visibleDuration));
    }
  }, [currentTime, viewportStart, viewportEnd, visibleDuration, videoDuration]);
  
  const generateTimeMarkers = useCallback(() => {
    const markers = [];
    const interval = zoom <= 2 ? 30 : zoom <= 5 ? 10 : 5; // seconds
    
    for (let time = 0; time <= videoDuration; time += interval) {
      if (time >= viewportStart && time <= viewportEnd) {
        const position = ((time - viewportStart) / visibleDuration) * 100;
        markers.push(
          <div
            key={time}
            className="absolute border-l border-gray-300 h-4"
            style={{ left: `${position}%` }}
          >
            <span className="absolute top-4 -translate-x-1/2 text-xs text-gray-500">
              {formatTime(time)}
            </span>
          </div>
        );
      }
    }
    
    return markers;
  }, [videoDuration, viewportStart, viewportEnd, visibleDuration, zoom]);
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Video Timeline</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {segments.length} segments
          </Badge>
          <Badge variant="outline">
            {segments.filter(s => s.status === 'recommended').length} recommended
          </Badge>
        </div>
      </div>
      
      <TimelineControls
        currentTime={currentTime}
        videoDuration={videoDuration}
        onTimeChange={onTimeChange}
        onZoomChange={setZoom}
        zoom={zoom}
      />
      
      {audioWaveform.length > 0 && (
        <WaveformDisplay
          waveform={audioWaveform}
          videoDuration={videoDuration}
          currentTime={currentTime}
          segments={sortedSegments}
          sceneChanges={sceneChanges}
        />
      )}
      
      <div className="space-y-2">
        <div className="relative">
          {/* Timeline background */}
          <div
            ref={timelineRef}
            className="relative h-16 bg-gray-100 rounded cursor-crosshair overflow-hidden"
            onClick={handleTimelineClick}
          >
            {/* Time markers */}
            <div className="absolute inset-0">
              {generateTimeMarkers()}
            </div>
            
            {/* Segments */}
            <div className="absolute inset-0 top-2">
              {sortedSegments
                .filter(segment => 
                  segment.startTime < viewportEnd && segment.endTime > viewportStart
                )
                .map((segment) => (
                  <TimelineSegment
                    key={segment.id}
                    segment={segment}
                    videoDuration={visibleDuration}
                    isSelected={segment.id === selectedSegmentId}
                    onClick={() => handleSegmentSelect(segment)}
                    onModify={(start, end) => handleSegmentModify(segment.id, start, end)}
                    readonly={readonly}
                  />
                ))}
            </div>
            
            {/* Current time indicator */}
            {currentTime >= viewportStart && currentTime <= viewportEnd && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-20 pointer-events-none"
                style={{
                  left: `${((currentTime - viewportStart) / visibleDuration) * 100}%`
                }}
              />
            )}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span>Excellent (85+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Very Good (75+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Good (65+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Fair (55+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-400 rounded"></div>
            <span>Scene Change</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VideoTimeline;