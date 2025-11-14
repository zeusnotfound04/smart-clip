'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  FileText, 
  Wand2, 
  Download, 
  Copy,
  Sparkles,
  Clock,
  RotateCcw,
  Settings2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ProtectedRoute } from '@/components/protected-route';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface ScriptSettings {
  tone: string;
  length: number;
  style: string;
  audience: string;
}

interface GeneratedScript {
  id: string;
  prompt: string;
  content: string;
  timestamp: Date;
  settings: ScriptSettings;
}

export default function ScriptGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [settings, setSettings] = useState<ScriptSettings>({
    tone: 'casual',
    length: 60,
    style: 'educational',
    audience: 'general'
  });

  const generateScript = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newScript: GeneratedScript = {
      id: Date.now().toString(),
      prompt,
      content: `Hook: Did you know that AI is changing everything we thought we knew about content creation?

Introduction: Welcome back to the channel! Today we're diving deep into something that's absolutely mind-blowing. If you're a content creator, this will change how you work forever.

Main Content: 
- First, let me show you this incredible breakthrough
- The technology behind this is actually fascinating
- Here's what most people don't realize about AI
- This could save you literally hours every single day
- The results speak for themselves

Call to Action: If this blew your mind, make sure to hit that subscribe button and let me know in the comments what you want to see next. Trust me, you won't want to miss what's coming up.

Outro: Thanks for watching, and I'll see you in the next video where we'll take this even further!`,
      timestamp: new Date(),
      settings: { ...settings }
    };
    
    setScripts(prev => [newScript, ...prev]);
    setIsGenerating(false);
  };

  const copyScript = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const regenerateScript = async (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;
    
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const updatedContent = script.content + "\n\nAlternative Ending: Don't forget to check out our previous video on this topic, and as always, keep creating amazing content!";
    
    setScripts(prev => 
      prev.map(s => 
        s.id === scriptId 
          ? { ...s, content: updatedContent }
          : s
      )
    );
    
    setIsGenerating(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-red-50">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            <motion.div variants={staggerItem} className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={staggerItem}>
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 text-4xl font-bold gradient-text">
                  <FileText className="w-10 h-10 text-orange-600" />
                  Script Generator
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Create engaging video scripts using AI. Perfect for YouTube, TikTok, 
                  and social media content with customizable tone and style.
                </p>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <motion.div variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-orange-600" />
                        Generate Script
                      </CardTitle>
                      <CardDescription>
                        Describe your video topic and let AI create an engaging script
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Video Topic or Idea</label>
                        <Textarea
                          placeholder="e.g., How AI is revolutionizing content creation for beginners"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      
                      <Button 
                        onClick={generateScript}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            Generating Script...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Script
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {scripts.length > 0 && (
                  <motion.div 
                    variants={staggerItem}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Generated Scripts</CardTitle>
                        <CardDescription>
                          Your AI-generated video scripts ready to use
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {scripts.map((script) => (
                          <div key={script.id} className="border rounded-lg p-6 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-lg mb-2">"{script.prompt}"</h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Tone: {script.settings.tone}</span>
                                  <span>Length: ~{script.settings.length}s</span>
                                  <span>Style: {script.settings.style}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => regenerateScript(script.id)}
                                  disabled={isGenerating}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyScript(script.content)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-lg p-4">
                              <pre className="text-sm whitespace-pre-wrap font-sans">
                                {script.content}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <motion.div variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-orange-600" />
                        Script Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tone</label>
                        <Select 
                          value={settings.tone} 
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, tone: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                            <SelectItem value="humorous">Humorous</SelectItem>
                            <SelectItem value="serious">Serious</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Style</label>
                        <Select 
                          value={settings.style} 
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, style: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="educational">Educational</SelectItem>
                            <SelectItem value="entertainment">Entertainment</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="vlog">Vlog</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Target Audience</label>
                        <Select 
                          value={settings.audience} 
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, audience: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="beginners">Beginners</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="kids">Kids</SelectItem>
                            <SelectItem value="professionals">Professionals</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Target Length ({settings.length}s)
                        </label>
                        <Slider
                          value={[settings.length]}
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, length: value[0] }))
                          }
                          max={300}
                          min={15}
                          step={15}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center space-y-3">
                        <Wand2 className="w-8 h-8 text-orange-500 mx-auto" />
                        <h3 className="font-semibold">AI-Powered</h3>
                        <p className="text-sm text-muted-foreground">
                          Generate professional scripts in seconds with advanced AI
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}