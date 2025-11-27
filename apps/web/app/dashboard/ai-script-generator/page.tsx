"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Loader2, Copy, RefreshCw, Star, Clock, Type, Wand2, Sparkles, Play, Video, Headphones, Subtitles, CheckCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultOptions: {
    tone?: string;
    format?: string;
    targetAudience?: string;
    scriptLength?: string;
  };
}

interface GeneratedScript {
  hook: string;
  keyPoints: string[];
  conclusion: string;
  fullScript: string;
  estimatedDuration: number;
  wordCount: number;
}

interface ScriptProject {
  id: string;
  title: string;
  originalPrompt: string;
  targetAudience?: string;
  scriptLength?: string;
  tone?: string;
  format?: string;
  status: string;
  createdAt: string;
  generatedScripts: any[];
}

interface VideoLibraryItem {
  id: string;
  title: string;
  description?: string;
  filename: string;
  duration: number;
  thumbnailUrl?: string;
  s3Url?: string;
  createdAt: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  tags?: string[];
}

interface NarrationJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioPath?: string;
  progress?: number;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export default function AIScriptGenerator() {
  const [prompt, setPrompt] = useState("");
  const [targetAudience, setTargetAudience] = useState("casual");
  const [scriptLength, setScriptLength] = useState("very-short");
  const [tone, setTone] = useState("conversational");
  const [format, setFormat] = useState("tiktok");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [recentProjects, setRecentProjects] = useState<ScriptProject[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // New workflow states
  const [activeTab, setActiveTab] = useState<'script' | 'library' | 'narration' | 'subtitles'>('script');
  const [videoLibrary, setVideoLibrary] = useState<VideoLibraryItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoLibraryItem | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [narrationJob, setNarrationJob] = useState<NarrationJob | null>(null);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("en-US-Neural2-J");
  const [narrationSpeed, setNarrationSpeed] = useState(1.0);
  const [addSubtitles, setAddSubtitles] = useState(true);
  const [isProcessingFinal, setIsProcessingFinal] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: 'video', title: 'Select Video', description: 'Choose gameplay clip from library', completed: false, active: false },
    { id: 'script', title: 'Generate Script', description: 'AI creates 10-15s story', completed: false, active: true },
    { id: 'narration', title: 'Add Narration', description: 'Convert script to speech', completed: false, active: false },
    { id: 'combine', title: 'Final Video', description: 'Combine video + narration + subtitles', completed: false, active: false }
  ]);

  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
    loadRecentProjects();
    loadVideoLibrary();
  }, []);

  useEffect(() => {
    // Update workflow steps based on current progress
    updateWorkflowProgress();
  }, [selectedVideo, generatedScript, narrationJob]);

  const loadTemplates = async () => {
    try {
      const response = await apiClient.get('/ai-script-generator/templates');
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadRecentProjects = async () => {
    try {
      const response = await apiClient.get('/ai-script-generator/projects');
      if (response.data.success) {
        setRecentProjects(response.data.scripts.slice(0, 5)); // Show only recent 5
      }
    } catch (error) {
      console.error('Error loading recent projects:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setPrompt(template.prompt.replace('[TOPIC]', ''));
      
      // Apply template defaults
      if (template.defaultOptions.tone) setTone(template.defaultOptions.tone);
      if (template.defaultOptions.format) setFormat(template.defaultOptions.format);
      if (template.defaultOptions.targetAudience) setTargetAudience(template.defaultOptions.targetAudience);
      if (template.defaultOptions.scriptLength) setScriptLength(template.defaultOptions.scriptLength);

      toast({
        title: "Template Applied",
        description: `${template.name} template has been applied. Fill in your topic and generate!`,
      });
    }
  };

  const generateScript = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a topic or prompt for your script.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedScript(null);

    try {
      const response = await apiClient.post('/ai-script-generator/generate', {
        prompt: prompt.trim(),
        targetAudience,
        scriptLength,
        tone,
        format,
      });

      if (response.data.success) {
        setGeneratedScript(response.data.script);
        setCurrentProjectId(response.data.projectId);
        
        toast({
          title: "Script Generated!",
          description: `Your ${scriptLength} ${format} script is ready with ${response.data.script.wordCount} words.`,
        });

        // Refresh recent projects
        loadRecentProjects();
      }
    } catch (error: any) {
      console.error('Error generating script:', error);
      
      let errorMessage = "Failed to generate script. Please try again.";
      
      if (error.response?.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (error.response?.status === 503) {
        errorMessage = "AI service is temporarily unavailable. Please try again later.";
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      }

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateScript = async () => {
    if (!currentProjectId) return;

    setIsGenerating(true);

    try {
      const response = await apiClient.post(`/ai-script-generator/${currentProjectId}/regenerate`, {
        tone,
        length: scriptLength,
        additionalInstructions: `Please improve the script with these preferences: ${tone} tone, ${scriptLength} length for ${format} format.`
      });

      if (response.data.success) {
        setGeneratedScript(response.data.script);
        
        toast({
          title: "Script Regenerated!",
          description: "Your script has been regenerated with the new preferences.",
        });
      }
    } catch (error: any) {
      console.error('Error regenerating script:', error);
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, section: string = "script") => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `${section} has been copied to your clipboard.`,
    });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  // New workflow functions
  const loadVideoLibrary = async () => {
    try {
      setIsLoadingLibrary(true);
      const response = await apiClient.get('/ai-script-generator/library');
      if (response.data.success) {
        setVideoLibrary(response.data.videos);
      }
    } catch (error) {
      console.error('Error loading video library:', error);
      toast({
        title: "Failed to load videos",
        description: "Could not load your video library. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const updateWorkflowProgress = () => {
    setWorkflowSteps(prev => prev.map(step => {
      switch (step.id) {
        case 'video':
          return { ...step, completed: !!selectedVideo, active: !selectedVideo };
        case 'script':
          return { ...step, completed: !!generatedScript, active: !!selectedVideo && !generatedScript };
        case 'narration':
          return { ...step, completed: !!narrationJob?.audioPath, active: !!generatedScript && !narrationJob?.audioPath };
        case 'combine':
          return { ...step, completed: false, active: !!narrationJob?.audioPath };
        default:
          return step;
      }
    }));
  };

  const generateGameplayScript = async () => {
    if (!prompt.trim() || !selectedVideo) {
      toast({
        title: "Missing Information",
        description: "Please select a video and enter a story prompt.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedScript(null);

    try {
      const response = await apiClient.post('/ai-script-generator/gameplay/generate-script', {
        prompt: prompt.trim(),
        videoId: selectedVideo.id,
        targetAudience,
        tone,
        scriptLength,
        format,
      });

      if (response.data.success) {
        setGeneratedScript(response.data.script);
        setCurrentProjectId(response.data.projectId);
        
        toast({
          title: "Gameplay Script Generated!",
          description: `Your 10-15 second story is ready for ${selectedVideo.title}.`,
        });

        setActiveTab('narration');
      }
    } catch (error: any) {
      console.error('Error generating gameplay script:', error);
      toast({
        title: "Generation Failed",
        description: error.response?.data?.details || "Failed to generate script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateNarration = async () => {
    if (!currentProjectId || !generatedScript) {
      toast({
        title: "No Script Available",
        description: "Please generate a script first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingNarration(true);
    
    try {
      const response = await apiClient.post('/ai-script-generator/gameplay/generate-narration', {
        scriptId: currentProjectId,
        voice: selectedVoice,
        speed: narrationSpeed,
      });

      if (response.data.success) {
        setNarrationJob({
          id: currentProjectId,
          status: 'completed',
          audioPath: response.data.audioPath,
        });
        
        toast({
          title: "Narration Generated!",
          description: "Your AI narration is ready. You can now combine it with your video.",
        });

        setActiveTab('subtitles');
      }
    } catch (error: any) {
      console.error('Error generating narration:', error);
      toast({
        title: "Narration Failed",
        description: error.response?.data?.details || "Failed to generate narration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  const combineVideoWithNarration = async () => {
    if (!currentProjectId || !selectedVideo || !narrationJob?.audioPath) {
      toast({
        title: "Missing Components",
        description: "Video, script, and narration are all required.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingFinal(true);
    
    try {
      const response = await apiClient.post('/ai-script-generator/gameplay/combine-video', {
        scriptId: currentProjectId,
        videoId: selectedVideo.id,
        addSubtitles: addSubtitles,
      });

      if (response.data.success) {
        toast({
          title: "Processing Started!",
          description: `Your gameplay story is being created. Estimated time: ${response.data.estimatedTime}`,
        });

        // Update final step
        setWorkflowSteps(prev => prev.map(step => 
          step.id === 'combine' ? { ...step, completed: true, active: false } : step
        ));

        // Poll for completion status here if needed
      }
    } catch (error: any) {
      console.error('Error combining video:', error);
      toast({
        title: "Processing Failed",
        description: error.response?.data?.details || "Failed to process video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingFinal(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-4 border-b p-4">
        <SidebarTrigger />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Wand2 className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Script Generator
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Create engaging narration scripts instantly using advanced AI
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Workflow Progress */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        step.completed 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : step.active 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'bg-gray-800 border-gray-600 text-gray-400'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className="w-16 h-0.5 bg-gray-600 mx-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Library Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Video className="h-5 w-5 text-blue-600" />
                    <span>Video Library</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Select a video for AI narration</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingLibrary ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : videoLibrary.length > 0 ? (
                    <div className="space-y-3">
                      {videoLibrary.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => setSelectedVideo(video)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-500 ${
                            selectedVideo?.id === video.id 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {video.thumbnailUrl && (
                            <img 
                              src={video.thumbnailUrl} 
                              alt={video.title}
                              className="w-full h-20 object-cover rounded mb-2"
                            />
                          )}
                          <h4 className="font-medium text-sm truncate">{video.title}</h4>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {video.duration ? formatDuration(Math.floor(video.duration)) : 'Unknown'}
                            </span>
                            {video.category && (
                              <Badge variant="secondary" className="text-xs">
                                {video.category}
                              </Badge>
                            )}
                          </div>
                          {video.tags && video.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {video.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-muted-foreground text-sm mb-4">No videos in library</p>
                      <Button size="sm" variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Video
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content Panel */}
            <div className="lg:col-span-4 space-y-6">

              {/* Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span>Quick Start Templates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((template) => (
                      <Button
                        key={template.id}
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        className="h-auto p-4 text-left justify-start flex-col items-start space-y-2"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <span className="font-medium">{template.name}</span>
                        <span className="text-sm text-muted-foreground">{template.description}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Main Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Type className="h-5 w-5 text-blue-600" />
                    <span>Your Script Topic</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter your short video idea or story prompt...

Perfect for TikTok, Instagram Reels & YouTube Shorts:
• 'This insane gaming moment changed everything...'
• 'POV: You discover a secret in your favorite game'
• 'The most satisfying combo ever performed'
• 'When you finally beat that impossible level'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Audience</label>
                      <Select value={targetAudience} onValueChange={setTargetAudience}>
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
                      <label className="text-sm font-medium mb-2 block">Length</label>
                      <Select value={scriptLength} onValueChange={setScriptLength}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="very-short">Ultra Short (0-15s)</SelectItem>
                          <SelectItem value="short">Short (15-30s)</SelectItem>
                          <SelectItem value="max">Max Length (30-45s)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Tone</label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="dramatic">Dramatic</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="humorous">Humorous</SelectItem>
                          <SelectItem value="mysterious">Mysterious</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Platform</label>
                      <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram Reels</SelectItem>
                          <SelectItem value="youtube">YouTube Shorts</SelectItem>
                          <SelectItem value="snapchat">Snapchat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={selectedVideo ? generateGameplayScript : generateScript}
                      disabled={isGenerating || !prompt.trim()}
                      className="flex-1"
                      size="lg"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      {isGenerating 
                        ? "Generating..." 
                        : selectedVideo 
                          ? "Generate Gameplay Script" 
                          : "Generate Script"
                      }
                    </Button>

                    {generatedScript && (
                      <Button
                        onClick={regenerateScript}
                        disabled={isGenerating}
                        variant="outline"
                        size="lg"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                        Regenerate
                      </Button>
                    )}
                  </div>

                  {selectedVideo && (
                    <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Video className="h-5 w-5 text-blue-600 mr-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Selected: {selectedVideo.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Will generate 10-15 second narration for this gameplay
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workflow Tabs - Show when video is selected */}
              {selectedVideo && generatedScript && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Script Generator Workflow</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Complete the workflow to create your AI-narrated gameplay story
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="script">Script Ready ✓</TabsTrigger>
                        <TabsTrigger value="narration">Add Narration</TabsTrigger>
                        <TabsTrigger value="subtitles">Final Video</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="script" className="space-y-4">
                        <div className="text-center py-4">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Script Generated Successfully!</h3>
                          <p className="text-muted-foreground mb-4">
                            Your {generatedScript.wordCount}-word script is ready for AI narration.
                          </p>
                          <Button 
                            onClick={() => setActiveTab('narration')}
                            className="gap-2"
                          >
                            <Headphones className="h-4 w-4" />
                            Generate AI Narration
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="narration" className="space-y-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Generate AI Narration</h3>
                          <p className="text-muted-foreground">
                            Convert your script to realistic AI speech using Google's neural voices.
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Voice Style</label>
                              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="en-US-Neural2-J">Dramatic Male (Neural2-J)</SelectItem>
                                  <SelectItem value="en-US-Neural2-A">Professional Female (Neural2-A)</SelectItem>
                                  <SelectItem value="en-US-Neural2-C">Casual Female (Neural2-C)</SelectItem>
                                  <SelectItem value="en-US-Neural2-D">Young Male (Neural2-D)</SelectItem>
                                  <SelectItem value="en-US-Neural2-F">Mature Male (Neural2-F)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Speed: {narrationSpeed}x
                              </label>
                              <Select value={narrationSpeed.toString()} onValueChange={(v) => setNarrationSpeed(parseFloat(v))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.8">Slow (0.8x)</SelectItem>
                                  <SelectItem value="1.0">Normal (1.0x)</SelectItem>
                                  <SelectItem value="1.1">Fast (1.1x)</SelectItem>
                                  <SelectItem value="1.2">Very Fast (1.2x)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {!narrationJob?.audioPath ? (
                            <Button 
                              onClick={generateNarration}
                              disabled={isGeneratingNarration}
                              className="w-full gap-2"
                              size="lg"
                            >
                              {isGeneratingNarration ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Headphones className="h-4 w-4" />
                              )}
                              {isGeneratingNarration ? "Generating Narration..." : "Generate AI Narration"}
                            </Button>
                          ) : (
                            <div className="text-center py-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-green-700 dark:text-green-300 font-medium">
                                Narration generated successfully!
                              </p>
                              <Button 
                                onClick={() => setActiveTab('subtitles')}
                                className="mt-2 gap-2"
                                size="sm"
                              >
                                <Play className="h-4 w-4" />
                                Continue to Final Video
                              </Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="subtitles" className="space-y-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Create Final Video</h3>
                          <p className="text-muted-foreground">
                            Combine your gameplay footage with AI narration and optional subtitles.
                          </p>
                          
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="subtitles" 
                                checked={addSubtitles}
                                onChange={(e) => setAddSubtitles(e.target.checked)}
                                className="rounded"
                              />
                              <label htmlFor="subtitles" className="text-sm font-medium">
                                Add subtitles to the video
                              </label>
                            </div>

                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium mb-2">Final Video Preview:</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Video className="h-4 w-4" />
                                  <span>{selectedVideo.title}</span>
                                </div>
                                <span>+</span>
                                <div className="flex items-center space-x-1">
                                  <Headphones className="h-4 w-4" />
                                  <span>AI Narration ({selectedVoice.split('-').pop()})</span>
                                </div>
                                {addSubtitles && (
                                  <>
                                    <span>+</span>
                                    <div className="flex items-center space-x-1">
                                      <Subtitles className="h-4 w-4" />
                                      <span>Subtitles</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <Button 
                              onClick={combineVideoWithNarration}
                              disabled={isProcessingFinal || !narrationJob?.audioPath}
                              className="w-full gap-2"
                              size="lg"
                            >
                              {isProcessingFinal ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                              {isProcessingFinal ? "Creating Final Video..." : "Create Final Video"}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Generated Script */}
              {generatedScript && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span>Generated Script</span>
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Type className="h-4 w-4" />
                          <span>{generatedScript.wordCount} words</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(generatedScript.estimatedDuration)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Hook */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-purple-700">🎣 Hook</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedScript.hook, "Hook")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="bg-gradient-to-br from-purple-900/20 to-violet-900/20 border border-purple-700/30 p-4 rounded-lg">
                        {generatedScript.hook}
                      </p>
                    </div>

                    <Separator />

                    {/* Key Points */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-700">📋 Key Points</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedScript.keyPoints.join('\n'), "Key Points")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {generatedScript.keyPoints.map((point, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <Badge variant="secondary" className="mt-1">{index + 1}</Badge>
                            <p className="flex-1">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Conclusion */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-700">🎯 Conclusion</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedScript.conclusion, "Conclusion")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 p-4 rounded-lg">
                        {generatedScript.conclusion}
                      </p>
                    </div>

                    <Separator />

                    {/* Full Script */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">📝 Complete Script</h4>
                        <Button
                          onClick={() => copyToClipboard(generatedScript.fullScript, "Full Script")}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy Full Script
                        </Button>
                      </div>
                      <div className="bg-gradient-to-br from-gray-900/20 to-slate-900/20 border border-gray-700/30 p-6 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {generatedScript.fullScript}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>


          </div>
        </div>
      </main>
    </div>
  );
}