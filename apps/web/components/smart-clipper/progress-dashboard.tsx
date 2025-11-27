"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface SmartClipperProject {
  id: string;
  userId: string;
  videoId: string;
  contentType: string;
  status: 'analyzing' | 'ready' | 'failed' | 'scoring' | 'processing';
  processingStage?: string;
  totalSegmentsFound: number;
  estimatedCost: number;
  actualCost?: number;
  createdAt: Date;
  updatedAt: Date;
  video: {
    id: string;
    filename: string;
    duration: number;
    fileSize: number;
  };
}

interface AnalyticsData {
  totalProjects: number;
  completedProjects: number;
  totalSegmentsGenerated: number;
  totalProcessingTime: number;
  averageAccuracy: number;
  totalCostSpent: number;
  contentTypeBreakdown: Record<string, number>;
  dailyUsage: Array<{ date: string; projects: number; cost: number }>;
  performanceMetrics: {
    averageProcessingTime: number;
    averageSegmentsPerProject: number;
    successRate: number;
    userSatisfactionScore: number;
  };
}

interface ProjectProgressTrackerProps {
  projects: SmartClipperProject[];
  analytics: AnalyticsData;
  onRefreshProject: (projectId: string) => void;
  onCancelProject: (projectId: string) => void;
  loading?: boolean;
}

interface ProjectStatusCardProps {
  project: SmartClipperProject;
  onRefresh: () => void;
  onCancel: () => void;
}

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
  projects: SmartClipperProject[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

interface ProcessingQueueProps {
  projects: SmartClipperProject[];
  onProjectAction: (projectId: string, action: 'cancel' | 'retry' | 'refresh') => void;
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

const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ready': return 'text-green-600 bg-green-50';
    case 'analyzing': return 'text-blue-600 bg-blue-50';
    case 'processing': return 'text-orange-600 bg-orange-50';
    case 'failed': return 'text-red-600 bg-red-50';
    case 'scoring': return 'text-purple-600 bg-purple-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const getStageProgress = (status: string, stage?: string): number => {
  const progressMap: Record<string, number> = {
    'analyzing': 10,
    'preprocessing': 20,
    'flash-analysis': 40,
    'pro-refinement': 70,
    'embeddings': 85,
    'scoring': 95,
    'ready': 100,
    'failed': 0
  };

  if (status === 'ready') return 100;
  if (status === 'failed') return 0;
  
  return progressMap[stage || status] || 10;
};

const ProjectStatusCard: React.FC<ProjectStatusCardProps> = ({
  project,
  onRefresh,
  onCancel
}) => {
  const progress = getStageProgress(project.status, project.processingStage);
  const isProcessing = ['analyzing', 'processing', 'scoring'].includes(project.status);
  
  const getStageLabel = (stage?: string): string => {
    switch (stage) {
      case 'preprocessing': return 'Pre-processing video';
      case 'flash-analysis': return 'AI analysis (Flash)';
      case 'pro-refinement': return 'AI refinement (Pro)';
      case 'embeddings': return 'Semantic analysis';
      case 'scoring': return 'Scoring segments';
      default: return project.status;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{project.video.filename}</CardTitle>
            <div className="text-sm text-gray-600 mt-1">
              {project.contentType} • {formatTime(project.video.duration)} • {formatFileSize(project.video.fileSize)}
            </div>
          </div>
          <Badge className={cn("px-2 py-1", getStatusColor(project.status))}>
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{getStageLabel(project.processingStage)}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Segments Found:</span>
            <div className="font-medium">{project.totalSegmentsFound}</div>
          </div>
          <div>
            <span className="text-gray-500">Estimated Cost:</span>
            <div className="font-medium">${project.estimatedCost.toFixed(4)}</div>
          </div>
          <div>
            <span className="text-gray-500">Started:</span>
            <div className="font-medium">{project.createdAt.toLocaleTimeString()}</div>
          </div>
          <div>
            <span className="text-gray-500">Last Update:</span>
            <div className="font-medium">{project.updatedAt.toLocaleTimeString()}</div>
          </div>
        </div>

        {project.actualCost && (
          <div className="text-sm">
            <span className="text-gray-500">Actual Cost:</span>
            <span className="font-medium ml-2">${project.actualCost.toFixed(4)}</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-gray-500">
            Project ID: {project.id.slice(-8)}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              Refresh
            </Button>
            {isProcessing && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProcessingQueue: React.FC<ProcessingQueueProps> = ({
  projects,
  onProjectAction
}) => {
  const processingProjects = projects.filter(p => 
    ['analyzing', 'processing', 'scoring'].includes(p.status)
  );
  
  const queuedProjects = processingProjects.sort((a, b) => 
    a.createdAt.getTime() - b.createdAt.getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Queue ({processingProjects.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {queuedProjects.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No projects currently processing
          </div>
        ) : (
          <div className="space-y-4">
            {queuedProjects.map((project) => (
              <ProjectStatusCard
                key={project.id}
                project={project}
                onRefresh={() => onProjectAction(project.id, 'refresh')}
                onCancel={() => onProjectAction(project.id, 'cancel')}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  projects,
  timeRange,
  onTimeRangeChange
}) => {
  const recentProjects = projects
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics Overview</h3>
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {analytics.totalProjects}
            </div>
            <div className="text-sm text-gray-500">Total Projects</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {analytics.completedProjects}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {analytics.totalSegmentsGenerated}
            </div>
            <div className="text-sm text-gray-500">Segments Generated</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">
              ${analytics.totalCostSpent.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Total Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Success Rate</span>
              <div className="flex items-center space-x-2">
                <Progress 
                  value={analytics.performanceMetrics.successRate * 100} 
                  className="w-24"
                />
                <span className="text-sm font-medium">
                  {Math.round(analytics.performanceMetrics.successRate * 100)}%
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">User Satisfaction</span>
              <div className="flex items-center space-x-2">
                <Progress 
                  value={analytics.performanceMetrics.userSatisfactionScore * 100} 
                  className="w-24"
                />
                <span className="text-sm font-medium">
                  {Math.round(analytics.performanceMetrics.userSatisfactionScore * 100)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Avg Processing Time:</span>
                <span className="font-medium">
                  {formatDuration(analytics.performanceMetrics.averageProcessingTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Segments/Project:</span>
                <span className="font-medium">
                  {analytics.performanceMetrics.averageSegmentsPerProject.toFixed(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.contentTypeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{type}</span>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={analytics.totalProjects > 0 ? (count / analytics.totalProjects) * 100 : 0} 
                      className="w-20"
                    />
                    <span className="text-sm font-medium w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium text-sm">{project.video.filename}</div>
                  <div className="text-xs text-gray-500">
                    {project.contentType} • {project.totalSegmentsFound} segments
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={cn("text-xs", getStatusColor(project.status))}>
                    {project.status}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">
                    {project.updatedAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ProgressTrackingDashboard: React.FC<ProjectProgressTrackerProps> = ({
  projects,
  analytics,
  onRefreshProject,
  onCancelProject,
  loading = false
}) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  const handleProjectAction = useCallback((projectId: string, action: string) => {
    switch (action) {
      case 'refresh':
        onRefreshProject(projectId);
        break;
      case 'cancel':
        onCancelProject(projectId);
        break;
      case 'retry':
        // Handle retry logic
        console.log('Retry project:', projectId);
        break;
    }
  }, [onRefreshProject, onCancelProject]);

  const statusCounts = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [projects]);

  const processingProjects = projects.filter(p => 
    ['analyzing', 'processing', 'scoring'].includes(p.status)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Smart Clipper Dashboard</h2>
        <div className="flex items-center space-x-2">
          {processingProjects.length > 0 && (
            <Badge variant="secondary">
              {processingProjects.length} processing
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            Refresh All
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <div className={cn("text-lg font-bold", getStatusColor(status).split(' ')[0])}>
                {count}
              </div>
              <div className="text-sm text-gray-500 capitalize">{status}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Processing Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProcessingQueue
              projects={projects}
              onProjectAction={handleProjectAction}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                    .slice(0, 5)
                    .map((project) => (
                      <div key={project.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{project.video.filename}</div>
                          <div className="text-xs text-gray-500">
                            {project.updatedAt.toLocaleString()}
                          </div>
                        </div>
                        <Badge className={cn("text-xs", getStatusColor(project.status))}>
                          {project.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <ProcessingQueue
            projects={projects}
            onProjectAction={handleProjectAction}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard
            analytics={analytics}
            projects={projects}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressTrackingDashboard;