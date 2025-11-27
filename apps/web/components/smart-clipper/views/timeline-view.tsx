'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Clock, Loader2, Scissors } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoTimeline } from '@/components/smart-clipper/video-timeline';
import { SmartClipperProject, HighlightSegment, ViewMode } from '@/types/smart-clipper';

interface TimelineViewProps {
  currentProject: SmartClipperProject | null;
  setCurrentView: (view: ViewMode) => void;
  selectedSegments: HighlightSegment[];
  setSelectedSegments: (segments: HighlightSegment[]) => void;
}

export function TimelineView({ 
  currentProject, 
  setCurrentView, 
  selectedSegments, 
  setSelectedSegments 
}: TimelineViewProps) {
  if (!currentProject) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No project selected</p>
        <Button onClick={() => setCurrentView('upload')}>
          Start New Project
        </Button>
      </div>
    );
  }

  const handleSegmentSelect = (segment: HighlightSegment) => {
    console.log('Segment selected:', segment);
    setSelectedSegments([segment]);
  };

  const handleSegmentModify = (segmentId: string, startTime: number, endTime: number) => {
    console.log('Segment modified:', segmentId, startTime, endTime);
    // This would need to be passed up to the parent to update the project
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Video Timeline</h2>
        <div className="flex items-center gap-2">
          {currentProject.status === 'analyzing' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing video...
            </div>
          )}
          <Badge variant={currentProject.status === 'completed' ? 'default' : 'secondary'}>
            {currentProject.status}
          </Badge>
        </div>
      </div>
      
      {(currentProject.status === 'analyzing' || currentProject.status === 'processing') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 border-gray-700/50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>
            
            <CardContent className="p-8 relative z-10">
              <div className="space-y-6">
                {/* Animated Header */}
                <div className="text-center space-y-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <Scissors className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-white">
                    AI Processing Your Video
                  </h3>
                  <p className="text-sm text-gray-300">
                    Creating intelligent highlights from your content
                  </p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                      />
                      <span className="text-sm font-medium text-white">Video Analysis</span>
                    </div>
                    <span className="text-xs text-green-400">✓ Complete</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], backgroundColor: ['#60a5fa', '#3b82f6', '#60a5fa'] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"
                      />
                      <span className="text-sm font-medium text-white">Generating Clips</span>
                    </div>
                    <span className="text-xs text-blue-400">
                      {currentProject.highlightSegments?.filter(s => s.clipReady).length || 0} / {currentProject.highlightSegments?.length || 0} clips ready
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50"
                      />
                      <span className="text-sm font-medium text-white">Uploading to Cloud</span>
                    </div>
                    <span className="text-xs text-purple-400">In Progress</span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-white">Overall Progress</span>
                    <span className="text-gray-300">
                      {Math.round(((currentProject.highlightSegments?.filter(s => s.clipReady).length || 0) / Math.max(currentProject.highlightSegments?.length || 1, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-lg shadow-blue-500/50"
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: `${Math.round(((currentProject.highlightSegments?.filter(s => s.clipReady).length || 0) / Math.max(currentProject.highlightSegments?.length || 1, 1)) * 100)}%` 
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                    <motion.div
                      className="absolute top-0 left-0 h-full w-8 bg-white/20 rounded-full blur-sm"
                      animate={{ x: [-32, 320] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="flex justify-center space-x-4">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [-5, 5, -5] }}
                      transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                      className="w-2 h-2 bg-blue-400 rounded-full opacity-80 shadow-lg shadow-blue-400/50"
                    />
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-300">
                    This process typically takes 2-5 minutes depending on video length.
                    <br />
                    <span className="font-medium text-blue-400 glow">Please keep this tab open.</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {currentProject.status === 'completed' && currentProject.highlightSegments && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 border-green-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-100">
                  {currentProject.highlightSegments.length}
                </div>
                <div className="text-sm text-green-200">Segments Found</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 border-blue-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-100">
                  {currentProject.highlightSegments.filter(s => s.clipReady).length}
                </div>
                <div className="text-sm text-blue-200">Clips Ready</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-indigo-900 via-purple-800 to-violet-900 border-indigo-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-indigo-100">
                  {currentProject.highlightSegments.filter(s => s.finalScore >= 85).length}
                </div>
                <div className="text-sm text-indigo-200">High Quality</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-900 via-amber-800 to-yellow-900 border-orange-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-100">
                  {Math.round(currentProject.highlightSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0))}s
                </div>
                <div className="text-sm text-orange-200">Total Duration</div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Video Timeline & Segments
              </CardTitle>
              <CardDescription>
                Green segments are ready for preview and download. Click on any segment to view details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoTimeline
                segments={currentProject.highlightSegments}
                videoDuration={currentProject.video.duration || 300}
                currentTime={0}
                onTimeChange={(time) => console.log('Time changed:', time)}
                onSegmentSelect={handleSegmentSelect}
                onSegmentModify={handleSegmentModify}
                selectedSegmentId={selectedSegments[0]?.id}
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentView('configure')}>
              ← Back to Configure
            </Button>
            <Button onClick={() => setCurrentView('preview')} className="bg-primary hover:bg-primary/90">
              Continue to Preview →
            </Button>
          </div>
        </motion.div>
      )}
      
      {currentProject.status === 'error' && (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Analysis Failed
            </h3>
            <p className="text-red-700 mb-4">
              There was an error processing your video. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setCurrentView('configure')}>
                Try Again
              </Button>
              <Button onClick={() => setCurrentView('upload')}>
                Upload New Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}