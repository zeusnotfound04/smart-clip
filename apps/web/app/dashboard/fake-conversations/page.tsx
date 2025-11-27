'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle,
  Smartphone,
  Play,
  Settings,
  Copy,
  Download,
  Trash2,
  Edit3,
  Users,
  Clock,
  Zap,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

interface ConversationTemplate {
  name: string;
  description: string;
  defaultPrompt: string;
  characterCount: number;
  messageCount: number;
  tone: string;
}

interface ConversationProject {
  id: string;
  title: string;
  description: string;
  conversationType: string;
  chatStyle: string;
  status: string;
  createdAt: string;
  characters: any[];
  messages: any[];
}

interface GenerationForm {
  prompt: string;
  conversationType: string;
  characterCount: number;
  messageCount: number;
  tone: string;
  context: string;
}

const fallbackTemplates: Record<string, ConversationTemplate> = {
  drama: {
    name: 'Drama/Conflict',
    description: 'Dramatic conversations with tension and conflict',
    defaultPrompt: 'Create a dramatic text conversation between two friends having a falling out',
    characterCount: 2,
    messageCount: 20,
    tone: 'dramatic'
  },
  comedy: {
    name: 'Comedy/Funny',
    description: 'Humorous conversations with jokes and funny situations',
    defaultPrompt: 'Create a funny text conversation between roommates about a ridiculous situation',
    characterCount: 2,
    messageCount: 15,
    tone: 'funny'
  },
  story: {
    name: 'Story/Narrative',
    description: 'Story-telling conversations with plot development',
    defaultPrompt: 'Create a story told through text messages between characters',
    characterCount: 3,
    messageCount: 25,
    tone: 'casual'
  },
  casual: {
    name: 'Casual Chat',
    description: 'Everyday conversations between friends or family',
    defaultPrompt: 'Create a casual conversation between friends making weekend plans',
    characterCount: 2,
    messageCount: 12,
    tone: 'casual'
  }
};

export default function FakeConversationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState<Record<string, ConversationTemplate>>(fallbackTemplates);
  const [conversations, setConversations] = useState<ConversationProject[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('casual');
  const [generatedProject, setGeneratedProject] = useState<ConversationProject | null>(null);

  const [form, setForm] = useState<GenerationForm>({
    prompt: '',
    conversationType: 'casual',
    characterCount: 2,
    messageCount: 15,
    tone: 'casual',
    context: ''
  });

  useEffect(() => {
    loadTemplates();
    loadConversations();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiClient.get('/api/fake-conversations/templates');
      if (response.data?.success) {
        // Merge API templates with fallback templates
        setTemplates({ ...fallbackTemplates, ...response.data.data.templates });
      } else {
        setTemplates(fallbackTemplates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Use fallback templates if API fails
      setTemplates(fallbackTemplates);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await apiClient.get('/api/fake-conversations/conversations');
      if (response.data?.success) {
        setConversations(response.data.data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Don't redirect on conversations loading error, just use empty array
      setConversations([]);
    }
  };

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = templates[templateKey];
    if (template) {
      setForm(prev => ({
        ...prev,
        prompt: template.defaultPrompt,
        conversationType: templateKey,
        characterCount: template.characterCount,
        messageCount: template.messageCount,
        tone: template.tone
      }));
    }
  };

  const handleGenerateConversation = async () => {
    if (!form.prompt.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a conversation prompt',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await apiClient.post('/api/fake-conversations/generate', form);
      
      if (response.data?.success) {
        setGeneratedProject(response.data.data.project);
        setActiveTab('preview');
        
        toast({
          title: 'Success!',
          description: 'Conversation generated successfully',
        });

        // Reload conversations list
        loadConversations();
      }
    } catch (error: any) {
      console.error('Generation failed:', error);
      toast({
        title: 'Generation Failed',
        description: error.response?.data?.error || 'Failed to generate conversation',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteConversation = async (projectId: string) => {
    try {
      await apiClient.delete(`/api/fake-conversations/conversations/${projectId}`);
      
      toast({
        title: 'Deleted',
        description: 'Conversation deleted successfully',
      });
      
      loadConversations();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-4 border-b p-4">
        <SidebarTrigger />
        <div className="flex-1">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold flex items-center gap-3"
          >
            <MessageCircle className="w-8 h-8 text-blue-500" />
            Fake Text Conversations
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm"
          >
            Create engaging conversation videos with AI-generated dialogue
          </motion.p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="library">Library</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Generate New Conversation</CardTitle>
                    <CardDescription>
                      Create realistic text conversations with AI assistance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Templates Selection */}
                    <div className="space-y-3">
                      <Label htmlFor="template">Choose Template (Optional)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(templates).map(([key, template]) => (
                          <motion.div
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Card 
                              className={`cursor-pointer border-2 transition-all ${
                                selectedTemplate === key 
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleTemplateSelect(key)}
                            >
                              <CardContent className="p-4">
                                <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {template.description}
                                </p>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{template.characterCount} chars</span>
                                  <span>{template.messageCount} msgs</span>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="prompt">Conversation Prompt *</Label>
                          <Textarea
                            id="prompt"
                            placeholder="Describe the conversation you want to create..."
                            value={form.prompt}
                            onChange={(e) => setForm(prev => ({ ...prev, prompt: e.target.value }))}
                            rows={4}
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {form.prompt.length}/1000 characters
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="context">Additional Context</Label>
                          <Textarea
                            id="context"
                            placeholder="Any additional background or context..."
                            value={form.context}
                            onChange={(e) => setForm(prev => ({ ...prev, context: e.target.value }))}
                            rows={2}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="conversationType">Conversation Type</Label>
                          <Select
                            value={form.conversationType}
                            onValueChange={(value) => setForm(prev => ({ ...prev, conversationType: value }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="drama">Drama/Conflict</SelectItem>
                              <SelectItem value="comedy">Comedy/Funny</SelectItem>
                              <SelectItem value="story">Story/Narrative</SelectItem>
                              <SelectItem value="debate">Debate/Argument</SelectItem>
                              <SelectItem value="casual">Casual Chat</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="tone">Tone</Label>
                          <Select
                            value={form.tone}
                            onValueChange={(value) => setForm(prev => ({ ...prev, tone: value }))}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="funny">Funny</SelectItem>
                              <SelectItem value="dramatic">Dramatic</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="emotional">Emotional</SelectItem>
                              <SelectItem value="mysterious">Mysterious</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="characterCount">Characters</Label>
                            <Select
                              value={form.characterCount.toString()}
                              onValueChange={(value) => setForm(prev => ({ ...prev, characterCount: parseInt(value) }))}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 Characters</SelectItem>
                                <SelectItem value="3">3 Characters</SelectItem>
                                <SelectItem value="4">4 Characters</SelectItem>
                                <SelectItem value="5">5 Characters</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="messageCount">Messages</Label>
                            <Input
                              id="messageCount"
                              type="number"
                              min="5"
                              max="50"
                              value={form.messageCount}
                              onChange={(e) => setForm(prev => ({ ...prev, messageCount: parseInt(e.target.value) }))}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerateConversation}
                      disabled={isGenerating || !form.prompt.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Conversation...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate Conversation
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              {generatedProject ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5" />
                            {generatedProject.title}
                          </CardTitle>
                          <CardDescription>{generatedProject.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit3 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Play className="w-4 h-4 mr-1" />
                            Generate Video
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Conversation Preview */}
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 space-y-3 max-h-96 overflow-y-auto">
                            {generatedProject.messages?.map((message, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex ${message.character?.isUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                                    message.character?.isUser
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                  }`}
                                >
                                  {message.content}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {/* Conversation Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                            <div className="text-lg font-semibold">{generatedProject.characters?.length || 0}</div>
                            <div className="text-sm text-muted-foreground">Characters</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                            <div className="text-lg font-semibold">{generatedProject.messages?.length || 0}</div>
                            <div className="text-sm text-muted-foreground">Messages</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Clock className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                            <div className="text-lg font-semibold">~45s</div>
                            <div className="text-sm text-muted-foreground">Duration</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Smartphone className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                            <div className="text-lg font-semibold">iPhone</div>
                            <div className="text-sm text-muted-foreground">Style</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">No Conversation Generated</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate a conversation to see the preview here
                  </p>
                  <Button onClick={() => setActiveTab('generate')}>
                    Start Generating
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Conversation Library</h2>
                <Badge variant="outline">{conversations.length} conversations</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {conversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span className="truncate">{conversation.title}</span>
                          <Badge variant="secondary" className="ml-2">
                            {conversation.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{conversation.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{conversation.characters?.length || 0} characters</span>
                            <span>{conversation.messages?.length || 0} messages</span>
                            <span>{formatRelativeTime(conversation.createdAt)}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Play className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteConversation(conversation.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {conversations.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">No Conversations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first conversation to get started
                  </p>
                  <Button onClick={() => setActiveTab('generate')}>
                    Create First Conversation
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}