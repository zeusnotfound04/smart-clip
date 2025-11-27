"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Loader2, Copy, RefreshCw, Star, Clock, Type, Wand2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";

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

export default function AIScriptGenerator() {
  const [prompt, setPrompt] = useState("");
  const [targetAudience, setTargetAudience] = useState("casual");
  const [scriptLength, setScriptLength] = useState("medium");
  const [tone, setTone] = useState("conversational");
  const [format, setFormat] = useState("youtube");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [recentProjects, setRecentProjects] = useState<ScriptProject[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
    loadRecentProjects();
  }, []);

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Panel */}
            <div className="lg:col-span-2 space-y-6">
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
                          <SelectItem value="short">Short (30-45s)</SelectItem>
                          <SelectItem value="medium">Medium (60-90s)</SelectItem>
                          <SelectItem value="long">Long (120s+)</SelectItem>
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
                      <label className="text-sm font-medium mb-2 block">Format</label>
                      <Select value={format} onValueChange={setFormat}>
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

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Scripts</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentProjects.length > 0 ? (
                    <div className="space-y-3">
                      {recentProjects.map((project) => (
                        <div key={project.id} className="p-3 bg-gradient-to-br from-gray-900/20 to-slate-900/20 border border-gray-700/30 rounded-lg hover:border-gray-600/50 cursor-pointer transition-colors">
                          <h4 className="font-medium text-sm truncate">{project.title}</h4>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {project.format || 'General'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No recent scripts yet. Generate your first script!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>💡 Pro Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Be Specific</p>
                    <p className="text-muted-foreground">The more details you provide, the better your script will be.</p>
                  </div>
                  <div>
                    <p className="font-medium">Try Different Tones</p>
                    <p className="text-muted-foreground">Experiment with dramatic, humorous, or mysterious tones for different effects.</p>
                  </div>
                  <div>
                    <p className="font-medium">Use Templates</p>
                    <p className="text-muted-foreground">Start with a template and customize it for your specific needs.</p>
                  </div>
                  <div>
                    <p className="font-medium">Copy Sections</p>
                    <p className="text-muted-foreground">Copy individual sections (hook, conclusion) to use in different projects.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}