'use client';

import { motion } from 'framer-motion';
import { Download, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SmartClipperProject, HighlightSegment } from '@/types/smart-clipper';
import { DownloadButton } from '@/components/download-button';

interface PreviewViewProps {
  currentProject: SmartClipperProject;
  selectedSegments: HighlightSegment[];
  setSelectedSegments: (segments: HighlightSegment[]) => void;
  setCurrentView: (view: 'timeline' | 'dashboard') => void;
  onPlayClip: (segment: HighlightSegment) => Promise<void>;
}

export function PreviewView({
  currentProject,
  selectedSegments,
  setSelectedSegments,
  setCurrentView,
  onPlayClip
}: PreviewViewProps) {
  if (!currentProject?.highlightSegments?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No segments available for preview</p>
        <Button onClick={() => setCurrentView('timeline')}>
          Back to Timeline
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100">Segment Preview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentProject.highlightSegments.filter(s => s.clipReady).length} of {currentProject.highlightSegments.length} clips ready
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {currentProject.highlightSegments.length} segments
          </Badge>
          <Badge variant="default" className="text-sm">
            {currentProject.highlightSegments.filter(s => s.clipReady).length} ready
          </Badge>
        </div>
      </div>

      {/* Segments Content */}
      <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-900/90 to-emerald-900/90 border-green-700/50 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-green-100">
                  {currentProject.highlightSegments.filter(s => s.clipReady).length}
                </div>
                <div className="text-xs text-green-200">Clips Ready</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/90 to-cyan-900/90 border-blue-700/50 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-blue-100">
                  {Math.round(currentProject.highlightSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0))}s
                </div>
                <div className="text-xs text-blue-200">Total Duration</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/90 to-violet-900/90 border-indigo-700/50 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-indigo-100">
                  {Math.round(currentProject.highlightSegments.reduce((acc, s) => acc + s.finalScore, 0) / currentProject.highlightSegments.length)}
                </div>
                <div className="text-xs text-indigo-200">Avg Score</div>
              </CardContent>
            </Card>
          </div>

          {/* Segments List */}
          <div className="grid gap-4">
            {currentProject.highlightSegments
              .sort((a, b) => b.finalScore - a.finalScore)
              .map((segment, index) => (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`p-4 transition-all hover:shadow-lg ${segment.clipReady ? 'border-green-700/50 bg-gradient-to-br from-green-900/20 to-emerald-900/20' : 'border-gray-700/50 bg-gradient-to-br from-gray-900/20 to-slate-900/20'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${segment.clipReady ? 'bg-gradient-to-br from-green-800 to-emerald-800 text-green-100' : 'bg-gradient-to-br from-gray-800 to-slate-800 text-gray-100'} rounded-lg flex items-center justify-center shadow-md`}>
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg text-gray-100">
                            {Math.floor(segment.startTime)}s - {Math.floor(segment.endTime)}s
                          </h4>
                          {segment.clipReady ? (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Processing
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Score: {Math.round(segment.finalScore)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          Duration: {Math.floor(segment.endTime - segment.startTime)}s • Type: {segment.highlightType || 'Highlight'}
                        </p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {segment.reasoning}
                        </p>
                        {segment.s3Url && (
                          <div className="flex items-center gap-1 mt-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <p className="text-xs text-green-600 font-medium">
                              Clip generated and ready for download
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={segment.clipReady ? 'default' : 'outline'}
                        onClick={() => onPlayClip(segment)}
                        disabled={!segment.clipReady}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      {segment.s3Url && segment.clipReady ? (
                        <DownloadButton
                          s3Url={segment.s3Url}
                          fileName={`clip_${Math.floor(segment.startTime)}s-${Math.floor(segment.endTime)}s.mp4`}
                          size="sm"
                          variant="outline"
                        >
                          Download
                        </DownloadButton>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Processing...
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentView('timeline')}>
          ← Back to Timeline
        </Button>
        <Button onClick={() => setCurrentView('dashboard')} className="bg-primary hover:bg-primary/90">
          Go to Dashboard →
        </Button>
      </div>
    </motion.div>
  );
}