'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Subtitles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { AppHeader } from '@/components/shared/AppHeader';
import { VideoUploadPanel } from '@/components/auto-subtitles/VideoUploadPanel';
import { VideoPreviewArea } from '@/components/auto-subtitles/VideoPreviewArea';
import { SubtitleConfigurationPanel } from '@/components/auto-subtitles/SubtitleConfigurationPanel';
import { ProgressOverlay } from '@/components/auto-subtitles/ProgressOverlay';
import { CompletionActionBar } from '@/components/auto-subtitles/CompletionActionBar';

type UploadStage = 'idle' | 'configuring' | 'uploading' | 'processing' | 'completed' | 'error';

interface VideoData {
  id: string;
  name: string;
  size: number;
  filePath: string;
  videoUrl?: string;
  subtitles?: string;
  detectedLanguages?: string[];
}

interface SubtitleStyle {
  textCase: 'normal' | 'uppercase' | 'lowercase' | 'capitalize';
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  outlineColor: string;
  shadowColor: string;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right';
  showShadow: boolean;
}

interface SubtitleOptions {
  detectAllLanguages: boolean;
  style: SubtitleStyle;
}

export default function AutoSubtitlesPage() {
  const { user } = useAuth();
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string>('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [demoText, setDemoText] = useState('Hello! This is a sample subtitle text.');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [availableLanguages, setAvailableLanguages] = useState<Array<{ code: string; name: string; priority: number }>>([]);
  
  const [subtitleOptions, setSubtitleOptions] = useState<SubtitleOptions>({
    detectAllLanguages: false,
    style: {
      textCase: 'normal',
      fontFamily: 'Inter',
      fontSize: 22,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#000000',
      bold: false,
      italic: false,
      alignment: 'center',
      showShadow: true
    }
  });

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const data = await apiClient.getSupportedLanguages();
        setAvailableLanguages(data.languages);
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      }
    };
    fetchLanguages();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      
      // Create preview URL for the video
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
    }
  };

  const handleVideoSelect = async (video: any) => {
    try {
      // Create a File-like object from the selected video
      const response = await fetch(video.s3Url || video.videoUrl);
      const blob = await response.blob();
      const file = new File([blob], video.originalName || video.name, { type: 'video/mp4' });
      
      setSelectedFile(file);
      setVideoData({
        id: video.id,
        name: video.originalName || video.name,
        size: video.size,
        filePath: video.s3Url || video.videoUrl
      });
      setVideoPreviewUrl(video.s3Url || video.videoUrl);
      setError('');
    } catch (err) {
      console.error('Error loading video:', err);
      setError('Failed to load video from My Clips');
    }
  };

  const proceedToConfiguration = () => {
    handleUpload();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStage('uploading');
      setUploadProgress(0);
      setError('');

      const video = await apiClient.uploadVideo(selectedFile, (progress) => {
        setUploadProgress(progress);
      }, selectedLanguage || undefined);
      setVideoData({
        id: video.id,
        name: video.originalName || selectedFile.name,
        size: selectedFile.size,
        filePath: video.filePath
      });

      setUploadStage('processing');
      setProcessingProgress(0);

      // Start subtitle generation (returns immediately with job ID)
      const jobResponse = await apiClient.generateSubtitles(video.id, subtitleOptions, selectedLanguage || undefined);
      setCurrentJobId(jobResponse.jobId);
      
      console.log('Subtitle job started:', jobResponse);
      console.log(`Estimated time: ${jobResponse.estimatedTimeMinutes} minutes`);

      // Poll for progress and completion
      const result = await apiClient.pollSubtitleJob(
        jobResponse.jobId,
        (progress, etaMs) => {
          setProcessingProgress(progress);
          setEstimatedTimeRemaining(Math.ceil(etaMs / 60000)); // Convert to minutes
          console.log(`Progress: ${progress}%, ETA: ${Math.ceil(etaMs / 60000)} minutes`);
        },
        20000 // Poll every 20 seconds to reduce server load
      );

      setProcessingProgress(100);
      setEstimatedTimeRemaining(0);

      console.log('Subtitle generation completed:', result); // Debug log
      
      setVideoData(prev => prev ? { 
        ...prev, 
        subtitles: 'Generated successfully',
        detectedLanguages: [],
        videoUrl: result.subtitledVideoUrl
      } : null);
      setUploadStage('completed');
      setCurrentJobId(null);

    } catch (error: any) {
      setError(error.message || 'Failed to process video');
      setUploadStage('error');
      setCurrentJobId(null);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setVideoData(null);
    setUploadStage('idle');
    setEstimatedTimeRemaining(0);
    setCurrentJobId(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setError('');
    
    // Clean up video preview URL
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
  };

  const applyStyleTheme = (theme: any) => {
    setSubtitleOptions(prev => ({
      ...prev,
      style: {
        ...prev.style,
        ...theme.style
      }
    }));
  };

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleConfigurationChange = useCallback(async (config: SubtitleOptions) => {
    if (!videoData?.id) return;
    
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the API call to avoid too frequent requests
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        setUploadStage('processing');
        setProcessingProgress(0);
        
        // Simulate progress for regeneration
        const progressInterval = setInterval(() => {
          setProcessingProgress((prev) => {
            if (prev >= 80) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + Math.random() * 20;
          });
        }, 500);
        
        // Send configuration changes to backend for real-time processing
        const result = await apiClient.updateSubtitleConfiguration(videoData.id, config);
        
        clearInterval(progressInterval);
        setProcessingProgress(100);
        
        // Update video data if new subtitled video URL is provided
        if (result.subtitledVideoUrl) {
          setVideoData(prev => prev ? {
            ...prev,
            videoUrl: result.subtitledVideoUrl
          } : null);
        }
        
        setUploadStage('completed');
      } catch (error: any) {
        console.error('Failed to update subtitle configuration:', error);
        setError('Failed to regenerate video with new configuration');
        setUploadStage('error');
      }
    }, 1500); // 1.5 second debounce
  }, [videoData?.id]);

  const handlePreview = () => {
    if (videoData?.videoUrl) {
      // Open the subtitled video in a new tab for preview
      window.open(videoData.videoUrl, '_blank');
    } else if (videoPreviewUrl) {
      // If no subtitled video URL, open the original video
      window.open(videoPreviewUrl, '_blank');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header with Logo Integration */}
      <AppHeader 
        title="Auto Subtitles"
        description="Generate accurate subtitles using AI speech recognition"
        icon={<Subtitles className="w-6 h-6 text-white" />}
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
            <VideoUploadPanel
              selectedFile={selectedFile}
              uploadStage={uploadStage}
              onFileSelect={handleFileSelect}
              onVideoSelect={handleVideoSelect}
              onReset={resetUpload}
              onConfigure={proceedToConfiguration}
              availableLanguages={availableLanguages}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
          </motion.section>

          {/* Main Video Preview Area */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <VideoPreviewArea
              videoPreviewUrl={videoPreviewUrl}
              uploadStage={uploadStage}
              subtitleStyle={subtitleOptions.style}
              demoText={demoText}
              onDemoTextChange={setDemoText}
              subtitledVideoUrl={videoData?.videoUrl}
            />
          </motion.section>

          {/* Subtitle Configuration Panel */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-80 border-l bg-background/50 overflow-y-auto"
          >
            <SubtitleConfigurationPanel
              subtitleOptions={subtitleOptions}
              onOptionsChange={setSubtitleOptions}
              onApplyTheme={applyStyleTheme}
              onBack={() => setUploadStage('idle')}
              onGenerate={handleUpload}
              onConfigurationChange={handleConfigurationChange}
            />
          </motion.section>
        </div>
      </main>



      {/* Progress Overlay */}
      <ProgressOverlay
        uploadStage={uploadStage}
        uploadProgress={uploadProgress}
        processingProgress={processingProgress}
        estimatedTimeRemaining={estimatedTimeRemaining}
        error={error}
        onRetry={resetUpload}
      />

      {/* Completion Action Bar */}
      {uploadStage === 'completed' && (
        <CompletionActionBar
          videoData={videoData}
          onPreview={handlePreview}
        />
      )}
    </div>
  );
}