'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MessageCircle, 
  Plus,
  Trash2,
  Play,
  Download,
  Settings2,
  Smartphone,
  Palette,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ProtectedRoute } from '@/components/protected-route';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

interface ConversationSettings {
  theme: string;
  speed: number;
  duration: number;
  showTyping: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  settings: ConversationSettings;
  status: 'draft' | 'generating' | 'completed';
  videoUrl?: string;
}

export default function FakeConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState({ sender: '', text: '' });
  const [settings, setSettings] = useState<ConversationSettings>({
    theme: 'ios',
    speed: 2,
    duration: 30,
    showTyping: true
  });

  const createConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: `Conversation ${conversations.length + 1}`,
      messages: [],
      settings: { ...settings },
      status: 'draft'
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation.id);
  };

  const addMessage = () => {
    if (!newMessage.sender.trim() || !newMessage.text.trim() || !activeConversation) return;
    
    const message: Message = {
      id: Date.now().toString(),
      sender: newMessage.sender,
      text: newMessage.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeConversation 
          ? { ...conv, messages: [...conv.messages, message] }
          : conv
      )
    );
    
    setNewMessage({ sender: '', text: '' });
  };

  const removeMessage = (messageId: string) => {
    if (!activeConversation) return;
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeConversation 
          ? { ...conv, messages: conv.messages.filter(m => m.id !== messageId) }
          : conv
      )
    );
  };

  const generateVideo = async (conversationId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, status: 'generating' }
          : conv
      )
    );
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, status: 'completed', videoUrl: '/fake-video.mp4' }
          : conv
      )
    );
  };

  const activeConv = conversations.find(c => c.id === activeConversation);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
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
                <div className="inline-flex items-center gap-3 text-4xl font-bold">
                  <MessageCircle className="w-10 h-10 text-foreground" />
                  Fake Conversations
                </div>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Create engaging text conversation videos for storytelling and social media. 
                  Perfect for TikTok, Instagram Stories, and YouTube Shorts.
                </p>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={staggerItem}>
                  <Card className="h-fit">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-cyan-600" />
                          Conversations
                        </CardTitle>
                        <CardDescription>
                          Create and manage your chat conversations
                        </CardDescription>
                      </div>
                      <Button onClick={createConversation} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        New
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            activeConversation === conversation.id 
                              ? 'bg-cyan-50 border-cyan-200' 
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => setActiveConversation(conversation.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{conversation.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {conversation.messages.length} messages
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {conversation.status === 'generating' && (
                                <Clock className="w-4 h-4 text-muted-foreground animate-spin" />
                              )}
                              {conversation.status === 'completed' && (
                                <Button size="sm" variant="outline">
                                  <Download className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {conversations.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No conversations yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Card className="h-fit">
                    <CardHeader>
                      <CardTitle>Chat Preview</CardTitle>
                      <CardDescription>
                        {activeConv ? `Editing: ${activeConv.title}` : 'Select a conversation to preview'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {activeConv ? (
                        <div className="space-y-4">
                          <div className="bg-slate-900 rounded-lg p-4 h-80 overflow-y-auto">
                            <div className="space-y-3">
                              {activeConv.messages.map((message) => (
                                <div key={message.id} className="group">
                                  <div className={`max-w-xs p-3 rounded-2xl relative ${
                                    message.sender === 'You' 
                                      ? 'bg-blue-500 text-white ml-auto'
                                      : 'bg-gray-200 text-black'
                                  }`}>
                                    <p className="text-sm">{message.text}</p>
                                    <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
                                      onClick={() => removeMessage(message.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground text-center mt-1">
                                    {message.sender}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                placeholder="Sender name"
                                value={newMessage.sender}
                                onChange={(e) => setNewMessage(prev => ({ ...prev, sender: e.target.value }))}
                              />
                              <Input
                                placeholder="Message text"
                                className="col-span-2"
                                value={newMessage.text}
                                onChange={(e) => setNewMessage(prev => ({ ...prev, text: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && addMessage()}
                              />
                            </div>
                            <Button onClick={addMessage} className="w-full gap-2" size="sm">
                              <Plus className="w-4 h-4" />
                              Add Message
                            </Button>
                          </div>
                          
                          <Button 
                            onClick={() => generateVideo(activeConv.id)}
                            disabled={activeConv.messages.length === 0 || activeConv.status === 'generating'}
                            className="w-full gap-2"
                          >
                            {activeConv.status === 'generating' ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin" />
                                Generating Video...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Generate Video
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Select a conversation to start editing</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="space-y-6">
                <motion.div variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-cyan-600" />
                        Video Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Theme</label>
                        <Select 
                          value={settings.theme} 
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, theme: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ios">iOS Messages</SelectItem>
                            <SelectItem value="android">Android</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="discord">Discord</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Animation Speed ({settings.speed}x)
                        </label>
                        <Slider
                          value={[settings.speed]}
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, speed: value[0] }))
                          }
                          max={5}
                          min={0.5}
                          step={0.5}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Max Duration ({settings.duration}s)
                        </label>
                        <Slider
                          value={[settings.duration]}
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, duration: value[0] }))
                          }
                          max={120}
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
                        <Palette className="w-8 h-8 text-cyan-500 mx-auto" />
                        <h3 className="font-semibold">Engaging Stories</h3>
                        <p className="text-sm text-muted-foreground">
                          Create viral conversation videos that capture attention
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