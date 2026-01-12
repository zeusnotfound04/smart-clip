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

type UploadStage = 'idle' | 'configuring' | 'downloading' | 'uploading' | 'processing' | 'completed' | 'error';

interface VideoData {
  id: string;
  name: string;
  size: number;
  filePath: string;
  videoUrl?: string;
  subtitles?: string;
  detectedLanguages?: string[];
  subtitledVideoUrl?: string;
  isUrlPreview?: boolean;
  urlData?: {
    url: string;
    originalUrl?: string;
    directUrl?: string;
    platform?: string;
    thumbnail?: string;
    duration?: number;
  };
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
  // Gradient support
  useGradient?: boolean;
  gradientType?: 'linear' | 'radial';
  gradientColors?: string[];
  gradientDirection?: number;
  // Enhanced shadow
  shadowIntensity?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Position and scale
  position?: { x: number; y: number };
  scale?: number;
  maxWordsPerLine?: number;
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
  const [subtitlePosition, setSubtitlePosition] = useState({ x: 0, y: 0 });
  const [subtitleScale, setSubtitleScale] = useState(1);
  
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
        // Set the first language as default if none selected
        if (data.languages.length > 0 && !selectedLanguage) {
          const defaultLang = data.languages[0].code;
          setSelectedLanguage(defaultLang);
          console.log('🌐 Default language set to:', defaultLang);
        }
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
      console.log('📹 handleVideoSelect called with:', video);
      console.log('📹 video.videoUrl:', video.videoUrl);
      console.log('📹 video.s3Url:', video.s3Url);
      console.log('📹 video.urlData:', video.urlData);
      console.log('📹 video.isUrlPreview:', video.isUrlPreview);
      
      // Handle URL preview (from YouTube, etc.) - don't download yet
      if (video.isUrlPreview) {
        // Use the videoUrl which is already set correctly by VideoUploadPanel
        // For Twitter videos, this will be the proxy URL
        // For other platforms, this will be the direct URL
        const previewUrl = video.videoUrl || video.s3Url;
        
        console.log('🎬 Video Preview URL Selection:');
        console.log('   - Platform:', video.urlData?.platform);
        console.log('   - Original URL:', video.urlData?.url);
        console.log('   - Direct URL (yt-dlp):', video.urlData?.directUrl);
        console.log('   - Proxy URL (if Twitter):', video.urlData?.proxyUrl);
        console.log('   - Selected Preview URL:', previewUrl);
        console.log('   - Is Direct MP4:', previewUrl?.includes('.mp4'));
        
        setVideoData(video);
        setVideoPreviewUrl(previewUrl);
        setUploadStage('configuring');
        setError('');
        console.log('✅ URL Preview video added to state');
        console.log('   - videoData set:', !!video);
        console.log('   - selectedFile:', !!selectedFile);
        console.log('   - selectedLanguage:', selectedLanguage);
        console.log('   - hasVideo should be:', !!(selectedFile || video));
        console.log('   - hasLanguageSelected should be:', !!selectedLanguage);
        return;
      }
      
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
    // If this is a URL preview, download and upload from URL first
    if (videoData?.isUrlPreview && videoData?.urlData) {
      setUploadStage('downloading');
      setUploadProgress(0);
      setError('');
      
      try {
        // Simulate download progress (since backend doesn't emit progress yet)
        const downloadInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 50) {
              clearInterval(downloadInterval);
              return 50;
            }
            return prev + 10;
          });
        }, 500);
        
        const result = await apiClient.uploadFromUrl({
          url: videoData.urlData.url,
          projectName: videoData.name,
          processType: 'subtitles',
          options: {
            language: selectedLanguage || undefined,
            detectAllLanguages: !selectedLanguage,
            style: subtitleOptions.style,
          },
        });
        
        clearInterval(downloadInterval);
        setUploadProgress(100);
        
        if (result.success && result.video) {
          setVideoData({
            id: result.video.id,
            name: result.video.title || videoData.name,
            size: videoData.size || 0,
            filePath: result.video.s3Url,
            videoUrl: result.video.s3Url,
            subtitledVideoUrl: (result.video as any).subtitledVideoUrl
          });
          setUploadStage('processing');
          setCurrentJobId(result.jobId || null);
          setProcessingProgress(0);
          
          // Poll for progress and completion
          if (!result.jobId) throw new Error('No job ID returned');
          const jobResult = await apiClient.pollSubtitleJob(
            result.jobId,
            (progress, etaMs) => {
              setProcessingProgress(progress);
              setEstimatedTimeRemaining(Math.ceil(etaMs / 60000));
              console.log(`Progress: ${progress}%, ETA: ${Math.ceil(etaMs / 60000)} minutes`);
            },
            20000
          );

          setProcessingProgress(100);
          setEstimatedTimeRemaining(0);

          setVideoData(prev => prev ? { 
            ...prev, 
            subtitles: 'Generated successfully',
            detectedLanguages: [],
            videoUrl: jobResult.subtitledVideoUrl
          } : null);
          setUploadStage('completed');
          setCurrentJobId(null);
        } else {
          throw new Error('Upload failed');
        }
      } catch (err: any) {
        console.error('URL upload error:', err);
        setError(err.response?.data?.error || err.message || 'Failed to upload from URL');
        setUploadStage('error');
      }
      return;
    }
    
    // Original file upload logic
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

      // Calculate final font size with scale
      const finalFontSize = Math.round(Math.max(16, Math.min(24, subtitleOptions.style.fontSize * 0.8)) * subtitleScale);

      // Log the exact values being sent
      console.log('🎨 Sending subtitle configuration to backend:');
      console.log('   - Position X:', subtitlePosition.x);
      console.log('   - Position Y:', subtitlePosition.y);
      console.log('   - Scale:', subtitleScale);
      console.log('   - Base Font Size:', subtitleOptions.style.fontSize);
      console.log('   - Final Font Size:', finalFontSize);
      console.log('   - USE GRADIENT:', subtitleOptions.style.useGradient);
      console.log('   - Gradient Colors:', subtitleOptions.style.gradientColors);
      console.log('   - Full Style Object:', JSON.stringify(subtitleOptions.style, null, 2));

      // Merge position and scale into subtitle options
      const subtitleOptionsWithPosition = {
        ...subtitleOptions,
        style: {
          ...subtitleOptions.style,
          fontSize: finalFontSize, // Send the final scaled font size
          position: subtitlePosition,
          scale: subtitleScale
        }
      };
      
      console.log('📤 Final payload being sent:', JSON.stringify(subtitleOptionsWithPosition, null, 2));

      // Start subtitle generation (returns immediately with job ID)
      const jobResponse = await apiClient.generateSubtitles(video.id, subtitleOptionsWithPosition, selectedLanguage || undefined);
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
        // Skip configuration updates for URL previews (video doesn't exist in DB yet)
    if (videoData.isUrlPreview) {
      console.log('⏭️ Skipping config update for URL preview - will apply on upload');
      return;
    }
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
              subtitledVideoUrl={videoData?.isUrlPreview ? null : videoData?.subtitledVideoUrl || videoData?.videoUrl}
              onPositionChange={setSubtitlePosition}
              onScaleChange={setSubtitleScale}
            />
          </motion.section>

          {/* Subtitle Configuration Panel */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-80 border-l bg-background/50 overflow-y-auto"
          >
            {(() => {
              const hasVideoValue = !!selectedFile || !!videoData;
              const hasLanguageValue = !!selectedLanguage;
              console.log('📊 Passing props to SubtitleConfigurationPanel:');
              console.log('   - selectedFile:', selectedFile ? selectedFile.name : 'null');
              console.log('   - videoData:', videoData ? videoData.id : 'null');
              console.log('   - selectedLanguage:', selectedLanguage);
              console.log('   - hasVideo (computed):', hasVideoValue);
              console.log('   - hasLanguageSelected (computed):', hasLanguageValue);
              return (
                <SubtitleConfigurationPanel
                  subtitleOptions={subtitleOptions}
                  onOptionsChange={setSubtitleOptions}
                  onApplyTheme={applyStyleTheme}
                  onBack={() => setUploadStage('idle')}
                  onGenerate={handleUpload}
                  onConfigurationChange={handleConfigurationChange}
                  hasVideo={hasVideoValue}
                  hasLanguageSelected={hasLanguageValue}
                />
              );
            })()}
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
        platform={videoData?.urlData?.platform || 'YouTube'}
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