"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Copy, RefreshCw, Star, Clock, Type, Wand2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";

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

interface GeneratedScript {
  hook: string;
  keyPoints: string[];
  conclusion: string;
  fullScript: string;
  estimatedDuration: number;
  wordCount: number;
}

export default function AIScriptGenerator() {
  const [prompt, setPrompt] = useState("");
  const [scriptLength, setScriptLength] = useState("30s");
  const [tone, setTone] = useState("conversational");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [libraryVideos, setLibraryVideos] = useState<VideoLibraryItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoLibraryItem | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const response = await apiClient.get('/api/ai-script-generator/library');
      if (response.data.success) {
        setLibraryVideos(response.data.videos);
        console.log('Loaded library videos:', response.data.videos);
      }
    } catch (error) {
      console.error('Error loading library:', error);
      toast({
        title: "Library Load Error",
        description: "Failed to load video library. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleVideoSelect = (video: VideoLibraryItem) => {
    setSelectedVideo(video);
    toast({
      title: "Video Selected",
      description: `${video.title} selected for your script generation.`,
    });
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
      const response = await apiClient.post('/api/ai-script-generator/generate', {
        prompt: prompt.trim(),
        scriptLength,
        tone,
      });

      if (response.data.success) {
        setGeneratedScript(response.data.script);
        setCurrentProjectId(response.data.projectId);
        
        toast({
          title: "Script Generated!",
          description: `Your ${scriptLength} script is ready with ${response.data.script.wordCount} words.`,
        });
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
      const response = await apiClient.post(`/api/ai-script-generator/${currentProjectId}/regenerate`, {
        tone,
        length: scriptLength,
        additionalInstructions: `Please improve the script with these preferences: ${tone} tone, ${scriptLength} length.`
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Wand2 className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Script Generator
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create engaging narration scripts instantly using advanced AI. Perfect for TikTok, YouTube, marketing videos, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Library */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <span>Video Library</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLibrary ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                    <span className="ml-2">Loading library...</span>
                  </div>
                ) : libraryVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {libraryVideos.map((video) => (
                      <div
                        key={video.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedVideo?.id === video.id 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                        onClick={() => handleVideoSelect(video)}
                      >
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-32 object-cover rounded-md mb-3"
                          />
                        )}
                        <h3 className="font-semibold text-sm mb-2">{video.title}</h3>
                        {video.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{video.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDurationSeconds(video.duration)}</span>
                          <span>{formatFileSize(video.fileSize)}</span>
                        </div>
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {video.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No videos available in the library.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={loadLibrary}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Library
                    </Button>
                  </div>
                )}
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
                  placeholder="Enter your topic, idea, story, or content prompt here... 

Examples:
• 'The mystery of the Bermuda Triangle and recent discoveries'
• 'How to start a successful YouTube channel in 2024'
• 'This crazy thing happened to me at Starbucks today...'
• 'Top 5 productivity hacks that actually work'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Length</label>
                    <Select value={scriptLength} onValueChange={setScriptLength}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10s">10 seconds</SelectItem>
                        <SelectItem value="15s">15 seconds</SelectItem>
                        <SelectItem value="30s">30 seconds</SelectItem>
                        <SelectItem value="45s">45 seconds</SelectItem>
                        <SelectItem value="60s">60 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tone</label>
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
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={generateScript}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex-1"
                    size="lg"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    {isGenerating ? "Generating..." : "Generate Script"}
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
              </CardContent>
            </Card>

            {/* Generated Script */}
            {generatedScript && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span>Generated Script</span>
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                    <p className="bg-purple-50 p-4 rounded-lg border border-purple-200">
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
                    <p className="bg-green-50 p-4 rounded-lg border border-green-200">
                      {generatedScript.conclusion}
                    </p>
                  </div>

                  <Separator />

                  {/* Full Script */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-700">📝 Complete Script</h4>
                      <Button
                        onClick={() => copyToClipboard(generatedScript.fullScript, "Full Script")}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Full Script
                      </Button>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      {generatedScript.fullScript}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Video Info */}
            {selectedVideo && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedVideo.thumbnailUrl && (
                      <img
                        src={selectedVideo.thumbnailUrl}
                        alt={selectedVideo.title}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-sm mb-2">{selectedVideo.title}</h3>
                      {selectedVideo.description && (
                        <p className="text-xs text-gray-600 mb-3">{selectedVideo.description}</p>
                      )}
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{formatDurationSeconds(selectedVideo.duration)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>{formatFileSize(selectedVideo.fileSize)}</span>
                        </div>
                        {selectedVideo.category && (
                          <div className="flex justify-between">
                            <span>Category:</span>
                            <Badge variant="outline" className="text-xs">{selectedVideo.category}</Badge>
                          </div>
                        )}
                      </div>
                      {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-2">Tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedVideo.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>💡 Pro Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Select a Video First</p>
                  <p className="text-gray-600">Choose a gameplay video from the library to create engaging content.</p>
                </div>
                <div>
                  <p className="font-medium">Be Specific</p>
                  <p className="text-gray-600">The more details you provide, the better your script will be.</p>
                </div>
                <div>
                  <p className="font-medium">Try Different Tones</p>
                  <p className="text-gray-600">Experiment with dramatic, humorous, or mysterious tones for different effects.</p>
                </div>
                <div>
                  <p className="font-medium">Short Video Focus</p>
                  <p className="text-gray-600">Keep scripts 0-45 seconds for TikTok, Instagram, and YouTube Shorts.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}