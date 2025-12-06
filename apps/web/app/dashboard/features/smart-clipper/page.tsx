'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { VideoPlayerModal } from '@/components/ui/video-player-modal';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { staggerContainer, staggerItem } from '@/lib/utils';

// Import types
import { 
  SmartClipperProject, 
  HighlightSegment, 
  ContentTypeConfig, 
  ViewMode, 
  VideoModalState 
} from '@/types/smart-clipper';

// Import new components
import { SmartClipperHeader } from '@/components/smart-clipper/header';
import { NavigationSteps } from '@/components/smart-clipper/navigation-steps';
import { UploadView } from '@/components/smart-clipper/views/upload-view';
import { ConfigureView } from '@/components/smart-clipper/views/configure-view';
import { TimelineView } from '@/components/smart-clipper/views/timeline-view';
import { PreviewView } from '@/components/smart-clipper/views/preview-view';
import { DashboardView } from '@/components/smart-clipper/views/dashboard-view';
import { ProjectStatusCard } from '@/components/smart-clipper/project-status-card';

export default function DashboardSmartClipperPage() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('upload');
  const [currentProject, setCurrentProject] = useState<SmartClipperProject | null>(null);
  const [projects, setProjects] = useState<SmartClipperProject[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentTypeConfig[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<HighlightSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState({
    isOpen: false,
    videoUrl: '',
    startTime: 0,
    endTime: 0
  });
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [contentConfig, setContentConfig] = useState<Partial<ContentTypeConfig>>({});
  const [previewTab, setPreviewTab] = useState<'segments' | 'video'>('segments');

  useEffect(() => {
    loadContentTypes();
    loadProjects();
  }, []);

  const loadContentTypes = async () => {
    console.log('🔄 [SMART_CLIPPER] Loading content types...');
    try {
      const response = await apiClient.get('/api/smart-clipper/content-types');
      console.log('📦 Content types response:', response);
      console.log('📋 Content types data:', response.data);
      console.log('📝 Content types array:', response.data.contentTypes);
      
      const types = response.data.contentTypes || [];
      console.log(`✅ Setting ${types.length} content types`);
      setContentTypes(types);
    } catch (error) {
      console.error('❌ Failed to load content types:', error);
      setError('Failed to load content types. Please refresh the page.');
    }
  };

  const loadProjects = async () => {
    try {
      const response = await apiClient.get('/api/smart-clipper/projects');
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleVideoUpload = async (uploadedFiles: any[]) => {
    console.log('🟦 [SMART_CLIPPER] handleVideoUpload called with files:', uploadedFiles.length);
    
    if (uploadedFiles.length === 0) {
      console.log('⚠️ No files to upload');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const file = uploadedFiles[0].file;
      console.log('📁 Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Use the correct uploadVideo method from apiClient
      const video = await apiClient.uploadVideo(file, (progress) => {
        console.log(`📊 Upload progress: ${progress}%`);
      });
      
      console.log('✅ Video uploaded successfully:', video);
      
      // Store the uploaded video in current project
      setCurrentProject({
        id: '', // Will be set when analysis starts
        videoId: video.id,
        contentType: '',
        status: 'analyzing',
        config: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        video: {
          id: video.id,
          originalName: video.originalName,
          duration: video.duration,
          filePath: video.filePath
        }
      });
      
      // Move to configuration step with uploaded video
      setCurrentView('configure');
      
    } catch (error) {
      console.error('❌ [SMART_CLIPPER] Upload failed:', error);
      setError(`Failed to upload video: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeVideo = async (videoId: string, contentType: string, config: any) => {
    console.log('🚀 [SMART_CLIPPER] Starting video analysis...', { videoId, contentType, config });
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/api/smart-clipper/analyze', {
        videoId,
        contentType,
        config
      });
      
      console.log('📊 Analysis response:', response.data);
      
      if (response.data.projectId) {
        // Create a project object for the state
        const project = {
          id: response.data.projectId,
          videoId,
          contentType,
          status: response.data.status || 'analyzing',
          config,
          estimatedCost: response.data.estimatedCost,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          video: currentProject?.video || {
            id: videoId,
            originalName: 'Uploaded Video',
            filePath: '',
            duration: 0
          },
          highlightSegments: []
        };
        
        setCurrentProject(project);
        setCurrentView('timeline');
        
        console.log('⏱️ Starting analysis progress polling...');
        // Start polling for analysis completion
        pollAnalysisProgress(response.data.projectId);
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setError(`Failed to start video analysis: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const pollAnalysisProgress = async (projectId: string) => {
    const poll = async () => {
      try {
        const response = await apiClient.get(`/api/smart-clipper/projects/${projectId}`);
        const apiResponse = response.data;
        
        console.log('📊 Project status update:', apiResponse);
        
        if (apiResponse && apiResponse.project) {
          const projectData = apiResponse.project;
          
          // Transform backend segments to match frontend interface
          const transformedSegments = (projectData.highlightSegments || projectData.segments || []).map((segment: any): HighlightSegment => ({
            id: segment.id,
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segment.endTime - segment.startTime,
            finalScore: segment.finalScore || segment.score || 75,
            confidenceLevel: segment.confidence || segment.confidenceLevel || 0.8,
            highlightType: segment.highlightType || 'educational',
            reasoning: segment.reasoning || 'AI-generated highlight',
            status: segment.status || 'recommended' as const,
            userApproval: segment.userApproval,
            s3Url: segment.s3Url, // Include S3 URL from API
            clipReady: segment.clipReady || !!segment.s3Url // Include clip ready status
          }));
          
          console.log('🎬 Transformed segments:', transformedSegments.length, 'clips ready:', transformedSegments.filter((s: HighlightSegment) => s.clipReady).length);
          
          // Update current project with the latest data
          setCurrentProject(prevProject => ({
            ...prevProject!,
            id: projectData.id,
            status: projectData.status === 'ready' ? 'completed' : projectData.status,
            highlightSegments: transformedSegments,
            totalSegmentsFound: projectData.segmentCount || transformedSegments.length
          }));
          
          if (projectData.status === 'ready' || projectData.status === 'completed') {
            console.log('✅ Analysis complete! Found segments:', transformedSegments.length, 'with clips:', transformedSegments.filter((s: HighlightSegment) => s.clipReady).length);
            // Analysis complete, segments are loaded
            return;
          } else if (projectData.status === 'failed' || projectData.status === 'error') {
            setError('Video analysis failed. Please try again.');
            return;
          }
        }
        
        // Continue polling every 3 seconds
        setTimeout(poll, 3000);
      } catch (error) {
        console.error('❌ Failed to check analysis progress:', error);
        // Continue polling even on error (might be temporary network issue)
        setTimeout(poll, 5000);
      }
    };
    
    poll();
  };

  const handleSegmentSelect = (segments: HighlightSegment[]) => {
    setSelectedSegments(segments);
  };

  const handlePlayClip = async (segment: HighlightSegment) => {
    try {
      if (!currentProject?.video?.id || !user) {
        console.error('No project video or authentication');
        return;
      }

      // Use S3 URL if available, otherwise generate clip
      if (segment.s3Url && segment.clipReady) {
        console.log('🎬 Playing clip from S3:', segment.s3Url);
        setVideoModal({
          isOpen: true,
          videoUrl: segment.s3Url,
          startTime: segment.startTime,
          endTime: segment.endTime
        });
        return;
      }

      // Fallback: Generate and stream the clip
      const response = await apiClient.post(`/api/videos/${currentProject.video.id}/generate-clip`, {
        startTime: segment.startTime,
        endTime: segment.endTime
      });

      if (response.data.success) {
        // Open video player modal with the clip URL
        setVideoModal({
          isOpen: true,
          videoUrl: response.data.clipUrl,
          startTime: segment.startTime,
          endTime: segment.endTime
        });
      }
    } catch (error) {
      console.error('Failed to play clip:', error);
    }
  };

  const handleDownloadClip = async (segment: HighlightSegment) => {
    // Note: This is now just a placeholder - downloads are handled by the DownloadButton component
    // This function is kept for compatibility but is no longer used
    console.log('Download handler called (deprecated) - downloads now handled by DownloadButton component');
  };

  const handleBatchProcess = async (segments: HighlightSegment[], settings: any) => {
    setLoading(true);
    
    try {
      const response = await apiClient.post(`/api/smart-clipper/generate-clips/${currentProject?.id}`, {
        segmentIds: segments.map(s => s.id),
        exportSettings: settings
      });
      
      if (response.data.success) {
        // Move to dashboard view to monitor progress
        setCurrentView('dashboard');
      }
    } catch (error) {
      console.error('Batch processing failed:', error);
      setError('Failed to start batch processing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (feedback: any[]) => {
    try {
      await apiClient.post(`/api/smart-clipper/feedback/${currentProject?.id}`, {
        feedback
      });
      // Refresh project data
      loadProjects();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'upload':
        return (
          <UploadView
            error={error}
            onVideoUpload={handleVideoUpload}
          />
        );

      case 'configure':
        return (
          <ConfigureView
            contentTypes={contentTypes}
            selectedContentType={selectedContentType}
            setSelectedContentType={setSelectedContentType}
            contentConfig={contentConfig}
            setContentConfig={setContentConfig}
            loading={loading}
            currentProject={currentProject}
            onAnalyzeVideo={handleAnalyzeVideo}
          />
        );
      
      case 'timeline':
        return (
          <TimelineView
            currentProject={currentProject}
            setCurrentView={setCurrentView}
            selectedSegments={selectedSegments}
            setSelectedSegments={setSelectedSegments}
          />
        );

      case 'preview':
        return (
          <PreviewView
            currentProject={currentProject!}
            previewTab={previewTab}
            setPreviewTab={setPreviewTab}
            selectedSegments={selectedSegments}
            setSelectedSegments={setSelectedSegments}
            setCurrentView={setCurrentView}
            onPlayClip={handlePlayClip}
          />
        );



      case 'dashboard':
        return (
          <DashboardView
            currentProject={currentProject}
            setCurrentView={setCurrentView}
            onPlayClip={handlePlayClip}
          />
        );

      default:
        return null;
    }
  };



  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {/* Header */}
            <motion.div variants={staggerItem}>
              <SmartClipperHeader currentView={currentView} loading={loading} />
            </motion.div>

            {/* Navigation Steps */}
            <motion.div variants={staggerItem}>
              <NavigationSteps 
                currentView={currentView} 
                setCurrentView={setCurrentView} 
                loading={loading} 
              />
            </motion.div>

            {/* Main Content */}
            <motion.div variants={staggerItem}>
              {renderCurrentView()}
            </motion.div>

            {/* Project Status */}
            <motion.div variants={staggerItem}>
              <ProjectStatusCard currentProject={currentProject} />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ ...videoModal, isOpen: false })}
        videoUrl={videoModal.videoUrl}
        startTime={videoModal.startTime}
        endTime={videoModal.endTime}
      />
    </ProtectedRoute>
  );
}