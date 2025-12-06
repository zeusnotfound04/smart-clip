'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { AppHeader } from '@/components/shared/AppHeader';
import { DualVideoUploadPanel } from '@/components/split-streamer/DualVideoUploadPanel';
import { CombinedVideoPreview } from '@/components/split-streamer/CombinedVideoPreview';
import { LayoutConfigurationPanel } from '@/components/split-streamer/LayoutConfigurationPanel';
import { ProcessingOverlay } from '@/components/split-streamer/ProcessingOverlay';
import { CompletionActionBar } from '@/components/split-streamer/CompletionActionBar';

type ProcessingStage = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface VideoFile {
  file: File;
  preview: string;
  type: 'webcam' | 'gameplay';
}

interface ProjectData {
  id: string;
  name: string;
  outputUrl?: string;
  status: string;
}

interface LayoutConfig {
  orientation: 'vertical' | 'horizontal';
  topRatio: number;
  bottomRatio: number;
  gap: number;
  backgroundColor: string;
  cornerRadius: number;
  swapVideos: boolean;
  webcamZoom: number;
  gameplayZoom: number;
}

export default function SplitStreamerPage() {
  const { user } = useAuth();
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [uploadProgress, setUploadProgress] = useState({ webcam: 0, gameplay: 0 });
  const [processingProgress, setProcessingProgress] = useState(0);
  const [webcamVideo, setWebcamVideo] = useState<VideoFile | null>(null);
  const [gameplayVideo, setGameplayVideo] = useState<VideoFile | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string>('');
  
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    orientation: 'vertical',
    topRatio: 50,
    bottomRatio: 50,
    gap: 4,
    backgroundColor: '#000000',
    cornerRadius: 8,
    swapVideos: false,
    webcamZoom: 1,
    gameplayZoom: 1
  });

  const handleWebcamSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setWebcamVideo({ file, preview, type: 'webcam' });
      setError('');
    }
  };

  const handleGameplaySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setGameplayVideo({ file, preview, type: 'gameplay' });
      setError('');
    }
  };

  const handleCombineVideos = async () => {
    if (!webcamVideo || !gameplayVideo) {
      setError('Please select both webcam and gameplay videos');
      return;
    }

    try {
      setProcessingStage('uploading');
      setUploadProgress({ webcam: 0, gameplay: 0 });
      setError('');

      // Upload webcam video
      const webcamUpload = await apiClient.uploadVideo(webcamVideo.file, (progress) => {
        setUploadProgress(prev => ({ ...prev, webcam: progress }));
      });

      // Upload gameplay video
      const gameplayUpload = await apiClient.uploadVideo(gameplayVideo.file, (progress) => {
        setUploadProgress(prev => ({ ...prev, gameplay: progress }));
      });

      setProcessingStage('processing');
      setProcessingProgress(0);

      // Start video combination (returns immediately with project ID)
      const initialResult = await apiClient.combineVideos(webcamUpload.id, gameplayUpload.id, layoutConfig);
      
      // Poll for completion
      const finalResult = await apiClient.pollJobStatus(
        initialResult.projectId,
        (progress) => {
          // Update progress based on status
          const progressMap: { [key: string]: number } = {
            'processing': 30,
            'uploading': 60,
            'finalizing': 80,
            'completed': 100
          };
          
          const currentProgress = progressMap[progress.status] || 10;
          setProcessingProgress(currentProgress);
        }
      );

      setProjectData({
        id: finalResult.id,
        name: `Split Stream - ${new Date().toLocaleDateString()}`,
        outputUrl: finalResult.outputUrl,
        status: finalResult.status
      });
      
      setProcessingStage('completed');

    } catch (error: any) {
      setError(error.message || 'Failed to combine videos');
      setProcessingStage('error');
    }
  };

  const resetUpload = () => {
    setWebcamVideo(null);
    setGameplayVideo(null);
    setProjectData(null);
    setProcessingStage('idle');
    setUploadProgress({ webcam: 0, gameplay: 0 });
    setProcessingProgress(0);
    setError('');
  };

  const handlePreview = () => {
    if (projectData?.outputUrl) {
      window.open(projectData.outputUrl, '_blank');
    }
  };

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleConfigurationChange = useCallback(async (config: LayoutConfig) => {
    setLayoutConfig(config);
    
    if (!projectData?.id || processingStage !== 'completed') return;
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the regeneration to avoid too frequent requests
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        setProcessingStage('processing');
        setProcessingProgress(0);
        
        const progressInterval = setInterval(() => {
          setProcessingProgress((prev) => {
            if (prev >= 80) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 20;
          });
        }, 500);
        
        const result = await apiClient.updateVideoLayout(projectData.id, config);
        
        clearInterval(progressInterval);
        setProcessingProgress(100);
        
        if (result.outputUrl) {
          setProjectData(prev => prev ? {
            ...prev,
            outputUrl: result.outputUrl
          } : null);
        }
        
        setProcessingStage('completed');
      } catch (error: any) {
        console.error('Failed to update layout:', error);
        setError('Failed to regenerate video with new layout');
        setProcessingStage('error');
      }
    }, 1500);
  }, [projectData?.id, processingStage]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <AppHeader 
        title="Split Streamer"
        description="Combine webcam and gameplay videos into vertical mobile-friendly format"
        icon={<Video className="w-6 h-6 text-white" />}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Upload Panel */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-80 border-r bg-background/50 p-4"
          >
            <DualVideoUploadPanel
              webcamVideo={webcamVideo}
              gameplayVideo={gameplayVideo}
              processingStage={processingStage}
              uploadProgress={uploadProgress}
              onWebcamSelect={handleWebcamSelect}
              onGameplaySelect={handleGameplaySelect}
              onCombine={handleCombineVideos}
              onReset={resetUpload}
            />
          </motion.section>

          {/* Main Preview Area */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <CombinedVideoPreview
              webcamVideo={webcamVideo}
              gameplayVideo={gameplayVideo}
              layoutConfig={layoutConfig}
              processingStage={processingStage}
              outputUrl={projectData?.outputUrl}
            />
          </motion.section>

          {/* Configuration Panel */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-80 border-l bg-background/50 overflow-y-auto"
          >
            <LayoutConfigurationPanel
              layoutConfig={layoutConfig}
              onConfigChange={handleConfigurationChange}
              disabled={processingStage === 'processing'}
            />
          </motion.section>
        </div>
      </main>

      {/* Processing Overlay */}
      <ProcessingOverlay
        processingStage={processingStage}
        uploadProgress={uploadProgress}
        processingProgress={processingProgress}
        error={error}
        onRetry={resetUpload}
      />

      {/* Completion Action Bar */}
      {processingStage === 'completed' && (
        <CompletionActionBar
          projectData={projectData}
          onPreview={handlePreview}
        />
      )}
    </div>
  );
}