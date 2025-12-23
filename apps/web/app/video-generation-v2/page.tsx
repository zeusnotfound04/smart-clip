'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, Download, Clock, FileText, Video, Mic, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { staggerContainer, staggerItem } from '@/lib/utils';

// Types
type VideoGenerationPhase = 'script' | 'voice' | 'video' | 'processing' | 'complete';

interface VideoGenerationProject {
  id?: string;
  projectId?: string;
  projectName?: string;
  script?: string;
  scriptWordCount?: number;
  scriptDuration?: number;
  voiceConfig?: {
    name: string;
    languageCode: string;
    ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    audioEncoding: string;
    speed?: number;
    pitch?: number;
  };
  audioUrl?: string;
  audioDuration?: number;
  selectedVideo?: {
    id: string;
    name: string;
    url: string;
    duration: number;
  };
  finalVideoUrl?: string;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  createdAt?: string;
}

interface VoiceOption {
  name: string;
  referenceId?: string;
  languageCode: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
  displayName: string;
  category: string;
}

interface VideoLibraryItem {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  category?: string;
  tags: string[];
  url?: string;
}

interface ScriptGenerationOptions {
  targetAudience?: 'casual' | 'formal' | 'educational' | 'entertainment' | 'marketing';
  scriptLength?: 'short' | 'medium' | 'long';
  tone?: 'dramatic' | 'conversational' | 'professional' | 'humorous' | 'mysterious';
  format?: 'tiktok' | 'youtube' | 'instagram' | 'marketing' | 'educational';
}

export default function VideoGenerationPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Phase management
  const [currentPhase, setCurrentPhase] = useState<VideoGenerationPhase>('script');
  const [project, setProject] = useState<VideoGenerationProject>({ status: 'idle' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Phase 1: Script Generation
  const [scriptPrompt, setScriptPrompt] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [scriptOptions, setScriptOptions] = useState<ScriptGenerationOptions>({
    targetAudience: 'casual',
    scriptLength: 'medium',
    tone: 'conversational',
    format: 'youtube'
  });
  
  // Phase 2: Voice Selection
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  
  // Phase 3: Video Selection
  const [videoLibrary, setVideoLibrary] = useState<VideoLibraryItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoLibraryItem | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);

  useEffect(() => {
    loadAvailableVoices();
    loadVideoLibrary();
  }, []);

  const loadAvailableVoices = async () => {
    try {
      const response = await fetch('/api/video-generation/voices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load voices');
      }

      const data = await response.json();
      setAvailableVoices(data.voices || []);
      
      // Set default voice
      if (data.voices && data.voices.length > 0) {
        const defaultVoice = data.voices.find((v: VoiceOption) => v.name === 'default') || data.voices[0];
        setSelectedVoice(defaultVoice);
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      toast.error('Failed to load voice options');
    }
  };

  const loadVideoLibrary = async () => {
    setLoadingVideos(true);
    try {
      const response = await fetch('/api/video-generation/library', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load library videos');
      }

      const data = await response.json();
      setVideoLibrary(data.data || []);
    } catch (error) {
      console.error('Error loading library videos:', error);
      toast.error('Failed to load video library');
    } finally {
      setLoadingVideos(false);
    }
  };

  // Phase 1: Generate Script
  const handleGenerateScript = async () => {
    if (!scriptPrompt.trim()) {
      toast.error('Please enter a script prompt');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/video-generation/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          prompt: scriptPrompt,
          projectName: projectName || 'Untitled Project',
          options: scriptOptions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate script');
      }

      const result = await response.json();
      
      setProject(prev => ({
        ...prev,
        projectId: result.projectId,
        projectName: projectName || 'Untitled Project',
        script: result.script.fullScript,
        scriptWordCount: result.script.wordCount,
        scriptDuration: result.script.estimatedDuration,
        status: 'generating'
      }));

      toast.success('Script generated successfully!');
      setCurrentPhase('voice');
      
    } catch (error) {
      console.error('Script generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate script');
      toast.error('Failed to generate script');
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Generate Audio
  const handleGenerateAudio = async () => {
    if (!selectedVoice) {
      toast.error('Please select a voice');
      return;
    }

    setGeneratingAudio(true);
    setError(null);
    
    try {
      const response = await fetch('/api/video-generation/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          projectId: project.projectId,
          script: project.script,
          voiceConfig: {
            name: selectedVoice.name,
            referenceId: selectedVoice.referenceId,
            languageCode: selectedVoice.languageCode,
            ssmlGender: selectedVoice.ssmlGender,
            audioEncoding: 'MP3',
            speed: voiceSpeed,
            pitch: voicePitch
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate audio');
      }

      const result = await response.json();
      
      setProject(prev => ({
        ...prev,
        voiceConfig: {
          name: selectedVoice.name,
          languageCode: selectedVoice.languageCode,
          ssmlGender: selectedVoice.ssmlGender,
          audioEncoding: 'MP3',
          speed: voiceSpeed,
          pitch: voicePitch
        },
        audioUrl: result.audioUrl,
        audioDuration: result.audioDuration
      }));

      toast.success('Audio generated successfully!');
      setCurrentPhase('video');
      
    } catch (error) {
      console.error('Audio generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate audio');
      toast.error('Failed to generate audio');
    } finally {
      setGeneratingAudio(false);
    }
  };

  // Phase 3: Prepare Final Video
  const handlePrepareVideo = async () => {
    if (!selectedVideo) {
      toast.error('Please select a video from the library');
      return;
    }

    setPreparingVideo(true);
    setError(null);
    setCurrentPhase('processing');
    
    try {
      const response = await fetch('/api/video-generation/prepare-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          projectId: project.projectId,
          audioUrl: project.audioUrl,
          audioDuration: project.audioDuration,
          selectedVideo: {
            id: selectedVideo.id,
            url: selectedVideo.url,
            duration: selectedVideo.duration
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to prepare video');
      }

      const result = await response.json();
      
      setProject(prev => ({
        ...prev,
        selectedVideo: {
          id: selectedVideo.id,
          name: selectedVideo.title,
          url: selectedVideo.url || '',
          duration: selectedVideo.duration || 0
        },
        finalVideoUrl: result.videoUrl,
        status: 'completed'
      }));

      toast.success('Video prepared successfully!');
      setCurrentPhase('complete');
      
    } catch (error) {
      console.error('Video preparation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to prepare video');
      toast.error('Failed to prepare video');
      setCurrentPhase('video'); // Go back to video selection
    } finally {
      setPreparingVideo(false);
    }
  };

  const getPhaseProgress = () => {
    switch (currentPhase) {
      case 'script': return 0;
      case 'voice': return 33;
      case 'video': return 66;
      case 'processing': return 90;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const renderPhaseIndicator = () => {
    const phases = [
      { key: 'script', label: 'Script', icon: FileText },
      { key: 'voice', label: 'Voice', icon: Mic },
      { key: 'video', label: 'Video', icon: Video }
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isActive = currentPhase === phase.key;
          const isCompleted = ['voice', 'video', 'processing', 'complete'].includes(currentPhase) && phase.key === 'script' ||
                              ['video', 'processing', 'complete'].includes(currentPhase) && phase.key === 'voice' ||
                              ['processing', 'complete'].includes(currentPhase) && phase.key === 'video';
          
          return (
            <React.Fragment key={phase.key}>
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${isCompleted ? 'bg-green-500 text-white' : 
                    isActive ? 'bg-primary text-primary-foreground' : 
                    'bg-muted text-muted-foreground'}
                `}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                }`}>
                  {phase.label}
                </span>
              </div>
              {index < phases.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderScriptPhase = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Phase 1: Generate Script
        </CardTitle>
        <p className="text-muted-foreground">
          Create an engaging script for your video using AI
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Project Name</label>
          <Input
            placeholder="Enter project name (optional)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Script Prompt</label>
          <Textarea
            placeholder="Describe what your video should be about..."
            value={scriptPrompt}
            onChange={(e) => setScriptPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Target Audience</label>
            <Select
              value={scriptOptions.targetAudience}
              onValueChange={(value) => setScriptOptions(prev => ({ ...prev, targetAudience: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Script Length</label>
            <Select
              value={scriptOptions.scriptLength}
              onValueChange={(value) => setScriptOptions(prev => ({ ...prev, scriptLength: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (30-60s)</SelectItem>
                <SelectItem value="medium">Medium (1-3min)</SelectItem>
                <SelectItem value="long">Long (3-5min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tone</label>
            <Select
              value={scriptOptions.tone}
              onValueChange={(value) => setScriptOptions(prev => ({ ...prev, tone: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="dramatic">Dramatic</SelectItem>
                <SelectItem value="humorous">Humorous</SelectItem>
                <SelectItem value="mysterious">Mysterious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <Select
              value={scriptOptions.format}
              onValueChange={(value) => setScriptOptions(prev => ({ ...prev, format: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {project.script && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="font-medium">Generated Script</h3>
              <Badge variant="secondary">
                {project.scriptWordCount} words • ~{project.scriptDuration}s
              </Badge>
            </div>
            <div className="bg-white p-4 rounded border max-h-48 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm">{project.script}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={handleGenerateScript}
            disabled={loading || !scriptPrompt.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Script...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Script
              </>
            )}
          </Button>
          
          {project.script && (
            <Button 
              onClick={() => setCurrentPhase('voice')}
              variant="outline"
            >
              Next: Choose Voice
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderVoicePhase = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-6 h-6" />
          Phase 2: Choose Voice & Generate Audio
        </CardTitle>
        <p className="text-muted-foreground">
          Select a Fish Audio voice for narration
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {project.script && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-2">Script Preview</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {project.scriptWordCount} words • ~{project.scriptDuration}s duration
            </p>
            <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
              <p className="text-sm">{project.script?.substring(0, 200)}...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Voice Selection</label>
            <Select
              value={selectedVoice?.name || ''}
              onValueChange={(value) => {
                const voice = availableVoices.find(v => v.name === value);
                setSelectedVoice(voice || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a voice" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voice) => (
                  <SelectItem key={voice.name} value={voice.name}>
                    {voice.displayName} ({voice.ssmlGender})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Speech Speed ({voiceSpeed}x)
              </label>
              <input
                type="range"
                min="0.25"
                max="4.0"
                step="0.25"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Pitch ({voicePitch > 0 ? '+' : ''}{voicePitch})
              </label>
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={voicePitch}
                onChange={(e) => setVoicePitch(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {project.audioUrl && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="font-medium">Generated Audio</h3>
              <Badge variant="secondary">
                {project.audioDuration}s duration
              </Badge>
            </div>
            <audio controls className="w-full">
              <source src={project.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={() => setCurrentPhase('script')}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Script
          </Button>
          
          <Button 
            onClick={handleGenerateAudio}
            disabled={generatingAudio || !selectedVoice}
            className="flex-1"
          >
            {generatingAudio ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Audio...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Generate Audio
              </>
            )}
          </Button>
          
          {project.audioUrl && (
            <Button 
              onClick={() => setCurrentPhase('video')}
              variant="outline"
            >
              Next: Choose Video
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderVideoPhase = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-6 h-6" />
          Phase 3: Choose Background Video
        </CardTitle>
        <p className="text-muted-foreground">
          Select a video from the library to use as background
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {project.audioUrl && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-2">Audio Preview</h3>
            <div className="flex items-center gap-4">
              <audio controls className="flex-1">
                <source src={project.audioUrl} type="audio/mpeg" />
              </audio>
              <Badge variant="secondary">
                {project.audioDuration}s duration
              </Badge>
            </div>
          </div>
        )}

        {loadingVideos ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading video library...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoLibrary.map((video) => (
              <Card 
                key={video.id}
                className={`cursor-pointer transition-colors ${
                  selectedVideo?.id === video.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedVideo(video)}
              >
                <CardContent className="p-4">
                  <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Video className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-medium text-sm mb-1">{video.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'Duration unknown'}
                  </p>
                  {video.tags && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={() => setCurrentPhase('voice')}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Voice
          </Button>
          
          <Button 
            onClick={handlePrepareVideo}
            disabled={!selectedVideo || preparingVideo}
            className="flex-1"
          >
            {preparingVideo ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Preparing Video...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Prepare Final Video
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderProcessingPhase = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Processing Your Video
        </CardTitle>
        <p className="text-muted-foreground">
          Combining audio and video to create your final output...
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Creating Your Video</h3>
          <p className="text-muted-foreground mb-4">
            This may take a few minutes depending on the video length
          </p>
          <Progress value={85} className="w-full max-w-md mx-auto" />
        </div>
      </CardContent>
    </Card>
  );

  const renderCompletePhase = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-500" />
          Video Ready!
        </CardTitle>
        <p className="text-muted-foreground">
          Your video has been successfully generated and is ready for download
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {project.finalVideoUrl && (
          <div className="space-y-4">
            <video 
              controls 
              className="w-full rounded-lg"
              src={project.finalVideoUrl}
            >
              Your browser does not support video playback.
            </video>
            
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <a 
                  href={project.finalVideoUrl}
                  download={`${project.projectName || 'generated-video'}.mp4`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </a>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setCurrentPhase('script');
                  setProject({ status: 'idle' });
                  setScriptPrompt('');
                  setProjectName('');
                }}
              >
                Create New Video
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!user) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Video Generation</h1>
          </header>
          
          <div className="flex-1 space-y-4 p-4">
            <div className="max-w-6xl mx-auto">
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-8"
              >
                {/* Header */}
                <motion.div variants={staggerItem} className="text-center">
                  <h1 className="text-3xl font-bold mb-2">AI Video Generation</h1>
                  <p className="text-muted-foreground">
                    Create complete videos with AI-generated scripts, narration, and background footage
                  </p>
                </motion.div>

                {/* Progress Indicator */}
                <motion.div variants={staggerItem}>
                  <div className="mb-6">
                    <Progress value={getPhaseProgress()} className="w-full mb-4" />
                    {renderPhaseIndicator()}
                  </div>
                </motion.div>

                {/* Error Display */}
                {error && (
                  <motion.div variants={staggerItem}>
                    <Card className="border-destructive">
                      <CardContent className="p-4">
                        <p className="text-destructive text-sm">{error}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Phase Content */}
                <motion.div variants={staggerItem}>
                  <AnimatePresence mode="wait">
                    {currentPhase === 'script' && (
                      <motion.div
                        key="script"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {renderScriptPhase()}
                      </motion.div>
                    )}
                    
                    {currentPhase === 'voice' && (
                      <motion.div
                        key="voice"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {renderVoicePhase()}
                      </motion.div>
                    )}
                    
                    {currentPhase === 'video' && (
                      <motion.div
                        key="video"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {renderVideoPhase()}
                      </motion.div>
                    )}
                    
                    {currentPhase === 'processing' && (
                      <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {renderProcessingPhase()}
                      </motion.div>
                    )}
                    
                    {currentPhase === 'complete' && (
                      <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {renderCompletePhase()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}