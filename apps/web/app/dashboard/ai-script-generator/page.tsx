"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Copy, RefreshCw, Star, Clock, Type, Wand2, Sparkles, 
  FileText, Mic, Video, ArrowRight, ArrowLeft, CheckCircle, 
  Download, Play, Pause 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { motion } from "framer-motion";
import { useAuth } from '@/lib/auth-context';
import { DownloadButton } from '@/components/download-button';

// API Base URL - Remove trailing slashes to prevent double slashes in URLs
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/+$/, '');

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
  isMockVideo?: boolean;
  isMockAudio?: boolean;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  createdAt?: string;
}

interface VoiceOption {
  name: string;
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
  filename?: string;
  duration: number;
  thumbnailUrl?: string;
  s3Url?: string;
  url?: string;
  createdAt: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  tags?: string[];
}

interface GeneratedScript {
  hook: string;
  keyPoints: string[];
  conclusion: string;
  fullScript: string;
  estimatedDuration: number;
  wordCount: number;
}

interface ScriptGenerationOptions {
  targetAudience?: 'casual' | 'formal' | 'educational' | 'entertainment' | 'marketing';
  scriptLength?: 'short' | 'medium' | 'long';
  tone?: 'dramatic' | 'conversational' | 'professional' | 'humorous' | 'mysterious';
  format?: 'tiktok' | 'youtube' | 'instagram' | 'marketing' | 'educational';
}

export default function AIScriptGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  
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
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([
    {
      name: 'en-US-Neural2-J',
      languageCode: 'en-US',
      ssmlGender: 'MALE',
      naturalSampleRateHertz: 24000,
      displayName: 'Journey (Male, Dramatic)',
      category: 'neural'
    },
    {
      name: 'en-US-Neural2-F',
      languageCode: 'en-US', 
      ssmlGender: 'FEMALE',
      naturalSampleRateHertz: 24000,
      displayName: 'Luna (Female, Professional)',
      category: 'neural'
    },
    {
      name: 'en-US-Neural2-A',
      languageCode: 'en-US',
      ssmlGender: 'MALE',
      naturalSampleRateHertz: 24000,
      displayName: 'Alex (Male, Conversational)',
      category: 'neural'
    },
    {
      name: 'en-US-Neural2-C',
      languageCode: 'en-US',
      ssmlGender: 'FEMALE',
      naturalSampleRateHertz: 24000,
      displayName: 'Clara (Female, Casual)',
      category: 'neural'
    }
  ]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>({
    name: 'en-US-Neural2-J',
    languageCode: 'en-US',
    ssmlGender: 'MALE',
    naturalSampleRateHertz: 24000,
    displayName: 'Journey (Male, Dramatic)',
    category: 'neural'
  });
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  
  // Phase 3: Video Selection
  const [videoLibrary, setVideoLibrary] = useState<VideoLibraryItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoLibraryItem | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);

  useEffect(() => {
    console.log('Loading voices and video library...');
    loadAvailableVoices();
    loadVideoLibrary();
  }, []);

  const loadAvailableVoices = async () => {
    // Voices are already initialized in state, but we can try to load from API if available
    console.log('Current available voices:', availableVoices.length);
    
    // Try to load from API, but don't replace if it fails
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-script-generator/voices`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.voices && data.voices.length > 0) {
          setAvailableVoices(data.voices);
          setSelectedVoice(data.voices[0]);
        }
      }
    } catch (error) {
      console.log('Using default voices since API is not available');
    }
  };

  const loadVideoLibrary = async () => {
    setLoadingVideos(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-script-generator/library`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
        }
      });

      if (!response.ok) {
        console.warn('Video library API not available, using empty library');
        setVideoLibrary([]);
        return;
      }

      const data = await response.json();
      setVideoLibrary(data.videos || []);
    } catch (error) {
      console.warn('Error loading library videos, using empty library:', error);
      setVideoLibrary([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Phase 1: Generate Script
  const handleGenerateScript = async () => {
    if (!scriptPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a script prompt",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-script-generator/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
        },
        body: JSON.stringify({
          prompt: scriptPrompt,
          targetAudience: scriptOptions.targetAudience,
          scriptLength: scriptOptions.scriptLength,
          tone: scriptOptions.tone,
          format: scriptOptions.format
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
        script: result.script?.fullScript || result.script?.content || 'Script generated',
        scriptWordCount: result.script?.wordCount || 0,
        scriptDuration: result.script?.estimatedDuration || 30,
        status: 'generating'
      }));

      toast({
        title: "Script Generated!",
        description: "Your script has been generated successfully.",
      });
      setCurrentPhase('voice');
      
    } catch (error) {
      console.error('Script generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate script');
      toast({
        title: "Generation Failed",
        description: "Failed to generate script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Generate Audio
  const handleGenerateAudio = async () => {
    if (!selectedVoice) {
      toast({
        title: "Voice Required",
        description: "Please select a voice",
        variant: "destructive",
      });
      return;
    }

    setGeneratingAudio(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-script-generator/gameplay/generate-narration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
        },
        body: JSON.stringify({
          scriptId: project.projectId,
          voice: selectedVoice.name,
          speed: voiceSpeed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate audio');
      }

      const result = await response.json();
      
      // Only accept successful TTS generation
      if (result.success !== true) {
        throw new Error(result.message || result.error || 'TTS generation failed');
      }
      
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
        audioUrl: result.audioPath || `/uploads/narrations/${result.audioFilename}`,
        audioDuration: result.duration || 30,
        isMockAudio: false // Only real TTS audio allowed
      }));

      toast({
        title: "Audio Generated!",
        description: "Your narration audio has been generated successfully using Google Cloud TTS.",
      });
      
      setCurrentPhase('video');
      
    } catch (error) {
      console.error('Audio generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate audio');
      toast({
        title: "Audio Generation Failed",
        description: "Failed to generate audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAudio(false);
    }
  };

  // Phase 3: Prepare Final Video
  const handlePrepareVideo = async () => {
    if (!selectedVideo) {
      toast({
        title: "Video Required",
        description: "Please select a video from the library",
        variant: "destructive",
      });
      return;
    }

    setPreparingVideo(true);
    setError(null);
    setCurrentPhase('processing');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-script-generator/gameplay/combine-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`,
        },
        body: JSON.stringify({
          scriptId: project.projectId,
          videoId: selectedVideo.id,
          addSubtitles: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Video preparation failed:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to prepare video');
      }

      const result = await response.json();
      
      // Handle the video URL from the response
      let finalUrl = '#processing';
      if (result.videoUrl) {
        finalUrl = result.videoUrl; // Use the S3 URL directly from the response
      } else if (result.outputFilename) {
        finalUrl = `/uploads/${result.outputFilename}`;
      }
      
      setProject(prev => ({
        ...prev,
        selectedVideo: {
          id: selectedVideo.id,
          name: selectedVideo.title,
          url: selectedVideo.url || selectedVideo.s3Url || '',
          duration: selectedVideo.duration || 0
        },
        finalVideoUrl: finalUrl,
        isMockVideo: false, // Always treat as real video now
        status: 'completed'
      }));

      toast({
        title: "Video Complete!",
        description: "Your video has been generated successfully.",
      });
      setCurrentPhase('complete');
      
    } catch (error) {
      console.error('Video preparation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to prepare video');
      toast({
        title: "Video Generation Failed",
        description: "Failed to prepare video. Please try again.",
        variant: "destructive",
      });
      setCurrentPhase('video'); // Go back to video selection
    } finally {
      setPreparingVideo(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDurationSeconds = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, section: string = "script") => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `${section} has been copied to your clipboard.`,
    });
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
            <div key={phase.key} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-colors
                ${isCompleted ? 'bg-green-600 text-white dark:bg-green-500' : 
                  isActive ? 'bg-primary text-primary-foreground' : 
                  'bg-muted text-muted-foreground'}
              `}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-primary' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              }`}>
                {phase.label}
              </span>
              {index < phases.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground mx-4" />
              )}
            </div>
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
            <div className="bg-card p-4 rounded border max-h-48 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm text-card-foreground">{project.script}</p>
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
          Select a Google Cloud Text-to-Speech voice for narration
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {project.script && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-2">Script Preview</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {project.scriptWordCount} words • ~{project.scriptDuration}s duration
            </p>
            <div className="bg-card p-3 rounded border max-h-32 overflow-y-auto">
              <p className="text-sm text-card-foreground">{project.script?.substring(0, 200)}...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Voice Selection</label>
            <Select
              value={selectedVoice?.name || ''}
              onValueChange={(value) => {
                console.log('Voice selected:', value);
                const voice = availableVoices.find(v => v.name === value);
                console.log('Found voice:', voice);
                setSelectedVoice(voice || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Choose a voice (${availableVoices.length} available)`} />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.length > 0 ? (
                  availableVoices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.displayName} ({voice.ssmlGender})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="loading" disabled>
                    Loading voices...
                  </SelectItem>
                )}
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
                  selectedVideo?.id === video.id ? 'border-primary bg-primary/10 dark:bg-primary/20' : 'hover:bg-muted/50'
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
                    {formatDurationSeconds(video.duration || 0)}
                  </p>
                  {video.tags && Array.isArray(video.tags) && video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
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
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
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
            {project.isMockVideo ? (
              <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                <div className="text-center space-y-3">
                  <Video className="w-16 h-16 mx-auto text-muted-foreground/50" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-lg">Mock Video Generated</h4>
                    <p className="text-sm text-muted-foreground">
                      Video generation completed successfully in development mode
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Development Mode
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <video 
                controls 
                className="w-full rounded-lg"
                src={project.finalVideoUrl}
              >
                Your browser does not support video playbook.
              </video>
            )}
            
            <div className="flex gap-3">
              {!project.isMockVideo && project.finalVideoUrl && (
                <DownloadButton
                  s3Url={project.finalVideoUrl}
                  fileName={`${project.projectName || 'generated-video'}.mp4`}
                  className="flex-1"
                >
                  Download Video
                </DownloadButton>
              )}
              {project.isMockVideo && (
                <Button disabled className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download (Mock Mode)
                </Button>
              )}
              
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <SidebarTrigger />
            <div className="flex items-center space-x-2">
              <Wand2 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                AI Video Generation
              </h1>
            </div>
            <div></div>
          </div>
          
          <div className="text-center">
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create complete videos with AI-generated scripts, narration, and background footage. Perfect for TikTok, YouTube, and social media.
            </p>
          </div>

          {/* Progress Indicator */}
          {renderPhaseIndicator()}

          {/* Progress Bar */}
          <div className="w-full max-w-4xl mx-auto">
            <Progress value={getPhaseProgress()} className="h-2 bg-muted/50" />
          </div>

          {/* Error Display */}
          {error && (
            <div className="w-full max-w-4xl mx-auto">
              <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-lg p-4">
                <p className="text-destructive dark:text-destructive-foreground text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Phase Content */}
          <div className="w-full">
            {currentPhase === 'script' && renderScriptPhase()}
            {currentPhase === 'voice' && renderVoicePhase()}
            {currentPhase === 'video' && renderVideoPhase()}
            {currentPhase === 'processing' && renderProcessingPhase()}
            {currentPhase === 'complete' && renderCompletePhase()}
          </div>

        </motion.div>
      </div>
    </div>
  );
}