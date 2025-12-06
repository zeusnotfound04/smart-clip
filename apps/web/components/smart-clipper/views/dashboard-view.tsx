'use client';

import { Download, Play, Scissors } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SmartClipperProject, HighlightSegment } from '@/types/smart-clipper';
import { DownloadButton } from '@/components/download-button';

interface DashboardViewProps {
  currentProject: SmartClipperProject | null;
  setCurrentView: (view: 'upload') => void;
  onPlayClip: (segment: HighlightSegment) => Promise<void>;
}

export function DashboardView({ 
  currentProject, 
  setCurrentView, 
  onPlayClip
}: DashboardViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Project Dashboard</h2>
        {currentProject && (
          <Badge variant={currentProject.status === 'completed' ? 'default' : 'secondary'}>
            {currentProject.status}
          </Badge>
        )}
      </div>
      
      {/* Project Summary */}
      {currentProject && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {currentProject.highlightSegments?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Total Segments</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {currentProject.highlightSegments?.filter(s => s.finalScore >= 80).length || 0}
                </div>
                <div className="text-sm text-gray-600">High Quality</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((currentProject.video.duration || 0) / 60)}min
                </div>
                <div className="text-sm text-gray-600">Video Length</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  ${currentProject.estimatedCost || '0.01'}
                </div>
                <div className="text-sm text-gray-600">Processing Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Generated Clips Section */}
      {currentProject?.highlightSegments && currentProject.highlightSegments.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Generated Clips</h3>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentProject.highlightSegments
              .sort((a, b) => b.finalScore - a.finalScore)
              .map((segment, index) => (
              <Card key={segment.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={segment.finalScore >= 85 ? 'default' : segment.finalScore >= 70 ? 'secondary' : 'outline'}>
                      #{index + 1}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(segment.finalScore)}/100
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium">
                      {Math.floor(segment.startTime)}s - {Math.floor(segment.endTime)}s
                    </h4>
                    <p className="text-sm text-gray-600">
                      Duration: {Math.floor(segment.endTime - segment.startTime)}s • 
                      Type: {segment.highlightType || 'Highlight'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {segment.reasoning}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onPlayClip(segment)}
                      className="flex-1"
                      disabled={!segment.s3Url && !segment.clipReady}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Play
                    </Button>
                    {segment.s3Url && segment.clipReady ? (
                      <DownloadButton
                        s3Url={segment.s3Url}
                        fileName={`clip_${Math.floor(segment.startTime)}s-${Math.floor(segment.endTime)}s.mp4`}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        Download
                      </DownloadButton>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Processing...
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Clips Generated Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Upload and analyze a video to see generated clips here.
            </p>
            <Button onClick={() => setCurrentView('upload')}>
              Start New Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}