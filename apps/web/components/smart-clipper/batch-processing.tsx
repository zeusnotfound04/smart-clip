"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  outputPath?: string;
}

interface BatchExportSettings {
  format: 'mp4' | 'mov' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'source';
  resolution?: '720p' | '1080p' | '1440p' | '4k' | 'original';
  includeAudio: boolean;
  addWatermark: boolean;
  watermarkText?: string;
  fadeInOut: boolean;
  cropToAspectRatio?: '16:9' | '9:16' | '1:1' | 'original';
  createCompilation: boolean;
  compilationTitle?: string;
  maxCompilationLength?: number;
}

interface BatchJob {
  id: string;
  segments: string[];
  settings: BatchExportSettings;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalSegments: number;
  completedSegments: number;
  failedSegments: number;
  startTime: Date;
  endTime?: Date;
  estimatedTimeRemaining?: number;
  outputPaths: string[];
  compilationPath?: string;
  error?: string;
}

interface BatchProcessingProps {
  segments: HighlightSegment[];
  onStartBatch: (segmentIds: string[], settings: BatchExportSettings) => Promise<string>;
  onCancelJob: (jobId: string) => void;
  jobs: BatchJob[];
  loading?: boolean;
}

interface SegmentSelectorProps {
  segments: HighlightSegment[];
  selectedSegments: string[];
  onSelectionChange: (segmentIds: string[]) => void;
  filterOptions: {
    minScore: number;
    maxScore: number;
    statuses: string[];
    approvals: string[];
  };
  onFilterChange: (filters: any) => void;
}

interface BatchSettingsProps {
  settings: BatchExportSettings;
  onSettingsChange: (settings: BatchExportSettings) => void;
  selectedCount: number;
  estimatedTotalSize: string;
  estimatedTotalTime: string;
}

interface JobMonitorProps {
  jobs: BatchJob[];
  onCancelJob: (jobId: string) => void;
  onDownloadResults: (jobId: string) => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const getScoreColor = (score: number): string => {
  if (score >= 85) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 65) return 'text-yellow-600';
  if (score >= 55) return 'text-orange-600';
  return 'text-red-600';
};

const SegmentSelector: React.FC<SegmentSelectorProps> = ({
  segments,
  selectedSegments,
  onSelectionChange,
  filterOptions,
  onFilterChange
}) => {
  const [selectAll, setSelectAll] = useState(false);
  
  const filteredSegments = useMemo(() => {
    return segments.filter(segment => {
      const scoreInRange = segment.finalScore >= filterOptions.minScore && 
                          segment.finalScore <= filterOptions.maxScore;
      const statusMatch = filterOptions.statuses.length === 0 || 
                         filterOptions.statuses.includes(segment.status);
      const approvalMatch = filterOptions.approvals.length === 0 || 
                           (segment.userApproval && filterOptions.approvals.includes(segment.userApproval)) ||
                           (!segment.userApproval && filterOptions.approvals.includes('none'));
      
      return scoreInRange && statusMatch && approvalMatch;
    });
  }, [segments, filterOptions]);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredSegments.map(s => s.id));
    }
    setSelectAll(!selectAll);
  }, [selectAll, filteredSegments, onSelectionChange]);

  const handleSegmentToggle = useCallback((segmentId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedSegments, segmentId]);
    } else {
      onSelectionChange(selectedSegments.filter(id => id !== segmentId));
    }
  }, [selectedSegments, onSelectionChange]);

  const handleQuickSelect = useCallback((criteria: string) => {
    let newSelection: string[] = [];
    
    switch (criteria) {
      case 'recommended':
        newSelection = segments.filter(s => s.status === 'recommended').map(s => s.id);
        break;
      case 'high-score':
        newSelection = segments.filter(s => s.finalScore >= 75).map(s => s.id);
        break;
      case 'approved':
        newSelection = segments.filter(s => s.userApproval === 'approved').map(s => s.id);
        break;
      case 'top-10':
        newSelection = [...segments]
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, 10)
          .map(s => s.id);
        break;
    }
    
    onSelectionChange(newSelection);
  }, [segments, onSelectionChange]);

  useEffect(() => {
    setSelectAll(selectedSegments.length === filteredSegments.length && filteredSegments.length > 0);
  }, [selectedSegments, filteredSegments]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Select Segments ({selectedSegments.length} selected)</CardTitle>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectAll}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm">Select All</label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick selection buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect('recommended')}
          >
            Recommended
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect('high-score')}
          >
            High Score (75+)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect('approved')}
          >
            Approved
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickSelect('top-10')}
          >
            Top 10
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t">
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Score</label>
            <Select
              value={filterOptions.minScore.toString()}
              onValueChange={(value) => onFilterChange({ ...filterOptions, minScore: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="60">60</SelectItem>
                <SelectItem value="70">70</SelectItem>
                <SelectItem value="80">80</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Score</label>
            <Select
              value={filterOptions.maxScore.toString()}
              onValueChange={(value) => onFilterChange({ ...filterOptions, maxScore: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="90">90</SelectItem>
                <SelectItem value="80">80</SelectItem>
                <SelectItem value="70">70</SelectItem>
                <SelectItem value="60">60</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={filterOptions.statuses[0] || 'all'}
              onValueChange={(value) => onFilterChange({ 
                ...filterOptions, 
                statuses: value === 'all' ? [] : [value] 
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Approval</label>
            <Select
              value={filterOptions.approvals[0] || 'all'}
              onValueChange={(value) => onFilterChange({ 
                ...filterOptions, 
                approvals: value === 'all' ? [] : [value] 
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="modified">Modified</SelectItem>
                <SelectItem value="none">No Decision</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Segment list */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredSegments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedSegments.includes(segment.id)}
                  onCheckedChange={(checked: boolean) => handleSegmentToggle(segment.id, checked)}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </span>
                      <Badge 
                        variant="outline"
                        className={cn("text-xs", getScoreColor(segment.finalScore))}
                      >
                        {segment.finalScore}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {segment.status}
                      </Badge>
                      {segment.userApproval && (
                        <Badge 
                          variant={segment.userApproval === 'approved' ? 'default' : 'destructive'} 
                          className="text-xs"
                        >
                          {segment.userApproval}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {segment.reasoning}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {filteredSegments.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No segments match the current filters
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BatchSettings: React.FC<BatchSettingsProps> = ({
  settings,
  onSettingsChange,
  selectedCount,
  estimatedTotalSize,
  estimatedTotalTime
}) => {
  const updateSetting = useCallback(<K extends keyof BatchExportSettings>(
    key: K,
    value: BatchExportSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  }, [settings, onSettingsChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Export Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select
              value={settings.format}
              onValueChange={(value: BatchExportSettings['format']) => updateSetting('format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                <SelectItem value="mov">MOV (QuickTime)</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quality</label>
            <Select
              value={settings.quality}
              onValueChange={(value: BatchExportSettings['quality']) => updateSetting('quality', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Quality</SelectItem>
                <SelectItem value="medium">Medium Quality</SelectItem>
                <SelectItem value="high">High Quality</SelectItem>
                <SelectItem value="source">Source Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <Select
              value={settings.resolution || 'original'}
              onValueChange={(value: string) => updateSetting('resolution', value as BatchExportSettings['resolution'])}
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
              value={settings.cropToAspectRatio || 'original'}
              onValueChange={(value: string) => updateSetting('cropToAspectRatio', value as BatchExportSettings['cropToAspectRatio'])}
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
            <Checkbox
              checked={settings.includeAudio}
              onCheckedChange={(checked: boolean) => updateSetting('includeAudio', checked)}
              id="includeAudio"
            />
            <label htmlFor="includeAudio" className="text-sm">Include Audio</label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={settings.fadeInOut}
              onCheckedChange={(checked: boolean) => updateSetting('fadeInOut', checked)}
              id="fadeInOut"
            />
            <label htmlFor="fadeInOut" className="text-sm">Add Fade In/Out</label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={settings.addWatermark}
              onCheckedChange={(checked: boolean) => updateSetting('addWatermark', checked)}
              id="addWatermark"
            />
            <label htmlFor="addWatermark" className="text-sm">Add Watermark</label>
          </div>

          {settings.addWatermark && (
            <div className="ml-6">
              <input
                type="text"
                placeholder="Watermark text"
                value={settings.watermarkText || ''}
                onChange={(e) => updateSetting('watermarkText', e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={settings.createCompilation}
              onCheckedChange={(checked: boolean) => updateSetting('createCompilation', checked)}
              id="createCompilation"
            />
            <label htmlFor="createCompilation" className="text-sm">Create Compilation Video</label>
          </div>

          {settings.createCompilation && (
            <div className="ml-6 space-y-2">
              <input
                type="text"
                placeholder="Compilation title"
                value={settings.compilationTitle || ''}
                onChange={(e) => updateSetting('compilationTitle', e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Max length (seconds)"
                value={settings.maxCompilationLength || ''}
                onChange={(e) => updateSetting('maxCompilationLength', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Selected Segments:</span>
            <span className="font-medium">{selectedCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Total Size:</span>
            <span className="font-medium">{estimatedTotalSize}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Processing Time:</span>
            <span className="font-medium">{estimatedTotalTime}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const JobMonitor: React.FC<JobMonitorProps> = ({
  jobs,
  onCancelJob,
  onDownloadResults
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No batch jobs yet
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'failed' ? 'destructive' :
                          job.status === 'processing' ? 'secondary' : 'outline'
                        }
                      >
                        {job.status}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {job.segments.length} segments
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {job.status === 'processing' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCancelJob(job.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      
                      {job.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDownloadResults(job.id)}
                        >
                          Download
                        </Button>
                      )}
                    </div>
                  </div>

                  {job.status === 'processing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(job.progress)}%</span>
                      </div>
                      <Progress value={job.progress} className="w-full" />
                      <div className="text-xs text-gray-500">
                        {job.completedSegments} / {job.totalSegments} completed
                        {job.failedSegments > 0 && ` • ${job.failedSegments} failed`}
                        {job.estimatedTimeRemaining && ` • ${formatDuration(job.estimatedTimeRemaining)} remaining`}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Started: {job.startTime.toLocaleString()}</div>
                    {job.endTime && (
                      <div>Completed: {job.endTime.toLocaleString()}</div>
                    )}
                    {job.error && (
                      <div className="text-red-600">Error: {job.error}</div>
                    )}
                    
                    {job.status === 'completed' && (
                      <div className="space-y-1">
                        <div>{job.outputPaths.length} clips generated</div>
                        {job.compilationPath && (
                          <div>Compilation: {job.compilationPath}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export const BatchProcessingSystem: React.FC<BatchProcessingProps> = ({
  segments,
  onStartBatch,
  onCancelJob,
  jobs,
  loading = false
}) => {
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('configure');
  const [filterOptions, setFilterOptions] = useState({
    minScore: 0,
    maxScore: 100,
    statuses: [] as string[],
    approvals: [] as string[]
  });
  
  const [batchSettings, setBatchSettings] = useState<BatchExportSettings>({
    format: 'mp4',
    quality: 'medium',
    resolution: 'original',
    includeAudio: true,
    addWatermark: false,
    fadeInOut: false,
    cropToAspectRatio: 'original',
    createCompilation: false
  });

  const estimatedTotalSize = useMemo(() => {
    const selectedSegmentObjects = segments.filter(s => selectedSegments.includes(s.id));
    const totalDuration = selectedSegmentObjects.reduce((sum, s) => sum + s.duration, 0);
    
    const baseSizePerSecond = {
      low: 0.1,
      medium: 0.3,
      high: 0.8,
      source: 1.5
    };
    
    const sizePerSecond = baseSizePerSecond[batchSettings.quality];
    const estimatedMB = totalDuration * sizePerSecond;
    
    return estimatedMB < 1024 
      ? `${Math.round(estimatedMB)}MB`
      : `${Math.round(estimatedMB / 1024 * 10) / 10}GB`;
  }, [selectedSegments, segments, batchSettings.quality]);

  const estimatedTotalTime = useMemo(() => {
    const selectedSegmentObjects = segments.filter(s => selectedSegments.includes(s.id));
    const totalDuration = selectedSegmentObjects.reduce((sum, s) => sum + s.duration, 0);
    
    const processingTimeMultiplier = batchSettings.quality === 'source' ? 0.1 : 
                                   batchSettings.quality === 'high' ? 1.5 : 1;
    const estimatedSeconds = totalDuration * processingTimeMultiplier * 0.3; // ~0.3x real-time
    
    return formatDuration(estimatedSeconds * 1000);
  }, [selectedSegments, segments, batchSettings.quality]);

  const handleStartBatch = useCallback(async () => {
    if (selectedSegments.length === 0) return;
    
    try {
      const jobId = await onStartBatch(selectedSegments, batchSettings);
      setSelectedSegments([]); // Clear selection after starting
    } catch (error) {
      console.error('Failed to start batch job:', error);
    }
  }, [selectedSegments, batchSettings, onStartBatch]);

  const handleDownloadResults = useCallback((jobId: string) => {
    // This would trigger download of the batch results
    console.log('Download results for job:', jobId);
  }, []);

  const canStartBatch = selectedSegments.length > 0 && !loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Batch Processing</h2>
        <Badge variant="outline">
          {jobs.filter(j => j.status === 'processing').length} active jobs
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-6">
          <SegmentSelector
            segments={segments}
            selectedSegments={selectedSegments}
            onSelectionChange={setSelectedSegments}
            filterOptions={filterOptions}
            onFilterChange={setFilterOptions}
          />
          
          <div className="flex justify-end">
            <Button
              onClick={handleStartBatch}
              disabled={!canStartBatch}
              size="lg"
              className="px-8"
            >
              {loading ? 'Starting...' : `Start Batch (${selectedSegments.length} segments)`}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <BatchSettings
            settings={batchSettings}
            onSettingsChange={setBatchSettings}
            selectedCount={selectedSegments.length}
            estimatedTotalSize={estimatedTotalSize}
            estimatedTotalTime={estimatedTotalTime}
          />
        </TabsContent>

        <TabsContent value="monitor">
          <JobMonitor
            jobs={jobs}
            onCancelJob={onCancelJob}
            onDownloadResults={handleDownloadResults}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatchProcessingSystem;