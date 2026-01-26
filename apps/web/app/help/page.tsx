'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Search,
  Book,
  PlayCircle,
  MessageCircle,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Video,
  Scissors,
  FileText,
  Subtitles,
  Upload,
  Settings,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProtectedRoute } from '@/components/protected-route';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  icon: any;
  category: string;
}

const faqs: FAQItem[] = [
  {
    id: '1',
    question: 'How do I upload videos to SmartClips?',
    answer: 'You can upload videos by clicking the upload area on the dashboard or any feature page. Drag and drop your video files or click to browse. We support MP4, AVI, MOV, MKV, and WebM formats up to 200MB per file.',
    category: 'getting-started'
  },
  {
    id: '2',
    question: 'What video formats are supported?',
    answer: 'SmartClips supports all major video formats including MP4, AVI, MOV, MKV, and WebM. For best results, we recommend using MP4 format with H.264 encoding.',
    category: 'technical'
  },
  {
    id: '3',
    question: 'How accurate are the AI-generated subtitles?',
    answer: 'Our AI subtitle generation achieves 95%+ accuracy for clear audio in English. Accuracy may vary based on audio quality, background noise, and accents. You can always edit subtitles after generation.',
    category: 'features'
  },
  {
    id: '4',
    question: 'Can I edit the generated content?',
    answer: 'Yes! All AI-generated content including subtitles, scripts, and clips can be edited. Use our built-in editors to refine the output to match your needs perfectly.',
    category: 'features'
  },
  {
    id: '5',
    question: 'What are the file size limits?',
    answer: 'Free accounts can upload files up to 50MB. Pro accounts support up to 200MB per file. For larger files, contact our support team for enterprise solutions.',
    category: 'billing'
  },
  {
    id: '6',
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel your subscription anytime from the Settings > Billing page. Your account will remain active until the end of your current billing period.',
    category: 'billing'
  }
];

const guides: GuideItem[] = [
  {
    id: '1',
    title: 'Getting Started with SmartClips',
    description: 'Learn the basics of uploading, processing, and managing your videos',
    duration: '5 min',
    level: 'beginner',
    icon: Zap,
    category: 'getting-started'
  },
  {
    id: '2',
    title: 'Auto Subtitles: Best Practices',
    description: 'Tips for getting the most accurate AI-generated subtitles',
    duration: '8 min',
    level: 'beginner',
    icon: Subtitles,
    category: 'features'
  },
  {
    id: '3',
    title: 'Smart Clipper: Finding Perfect Moments',
    description: 'Advanced techniques for AI-powered highlight detection',
    duration: '12 min',
    level: 'intermediate',
    icon: Scissors,
    category: 'features'
  },
  {
    id: '4',
    title: 'Script Generator for Content Creators',
    description: 'Create engaging video scripts with AI assistance',
    duration: '10 min',
    level: 'beginner',
    icon: FileText,
    category: 'features'
  },
  {
    id: '5',
    title: 'Split Streamer: Long-form to Short-form',
    description: 'Convert lengthy videos into bite-sized clips automatically',
    duration: '15 min',
    level: 'intermediate',
    icon: Video,
    category: 'features'
  },
  {
    id: '6',
    title: 'Workspace Management',
    description: 'Organize projects efficiently with workspaces and collaboration',
    duration: '7 min',
    level: 'intermediate',
    icon: Settings,
    category: 'organization'
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openFAQs, setOpenFAQs] = useState<string[]>([]);

  const categories = [
    { id: 'all', label: 'All Topics' },
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'features', label: 'Features' },
    { id: 'technical', label: 'Technical' },
    { id: 'billing', label: 'Billing' },
    { id: 'organization', label: 'Organization' }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredGuides = guides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setOpenFAQs(prev =>
      prev.includes(id)
        ? prev.filter(faqId => faqId !== id)
        : [...prev, id]
    );
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {/* Header */}
            <motion.div variants={staggerItem}>
              <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Help & Support</h1>
                  <p className="text-muted-foreground">Find answers and learn how to use SmartClips</p>
                </div>
              </div>
            </motion.div>

            {/* Search and Categories */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search for help articles, guides, or FAQs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <Button
                          key={category.id}
                          variant={selectedCategory === category.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(category.id)}
                        >
                          {category.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={staggerItem}>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PlayCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Video Tutorials</h3>
                    <p className="text-sm text-muted-foreground">Step-by-step video guides</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Live Chat</h3>
                    <p className="text-sm text-muted-foreground">Get instant help from our team</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Email Support</h3>
                    <p className="text-sm text-muted-foreground">smart@smartclips.net</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Guides Section */}
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Book className="w-5 h-5 text-blue-600" />
                      User Guides
                    </CardTitle>
                    <CardDescription>
                      Step-by-step tutorials to master SmartClips features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {filteredGuides.map((guide, index) => {
                      const Icon = guide.icon;
                      return (
                        <motion.div
                          key={guide.id}
                          variants={staggerItem}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold text-sm">{guide.title}</h3>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {guide.description}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={getLevelColor(guide.level)}>
                                      {guide.level}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{guide.duration}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>

              {/* FAQ Section */}
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-green-600" />
                      Frequently Asked Questions
                    </CardTitle>
                    <CardDescription>
                      Quick answers to common questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredFAQs.map((faq, index) => (
                      <motion.div
                        key={faq.id}
                        variants={staggerItem}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Collapsible
                          open={openFAQs.includes(faq.id)}
                          onOpenChange={() => toggleFAQ(faq.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Card className="cursor-pointer hover:shadow-sm transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium text-sm">{faq.question}</h3>
                                  {openFAQs.includes(faq.id) ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 text-sm text-muted-foreground">
                              {faq.answer}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Contact Section */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle>Still Need Help?</CardTitle>
                  <CardDescription>
                    Can't find what you're looking for? Our support team is here to help!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Contact Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>smart@smartclips.net</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-muted-foreground" />
                            <span>Live chat available 9 AM - 6 PM EST</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Response Times</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>• Live Chat: Immediate</p>
                          <p>• Email: Within 24 hours</p>
                          <p>• Priority Support: Within 4 hours (Pro users)</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-3">
                      <Button className="gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Start Live Chat
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Mail className="w-4 h-4" />
                        Send Email
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Knowledge Base
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}