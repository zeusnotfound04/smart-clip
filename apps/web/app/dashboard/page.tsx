'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Video, 
  Scissors, 
  FileText, 
  MessageCircle, 
  Subtitles, 
  Upload,
  BarChart3,
  Settings,
  User,
  LogOut,
  Play,
  Download,
  Calendar,
  FileVideo,
  FolderOpen,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { VideoUpload } from '@/components/video-upload';
import { fadeInUp, scaleIn, staggerContainer, staggerItem } from '@/lib/utils';

const features = [
  {
    id: 'auto-subtitles',
    title: 'Auto Subtitles',
    description: 'Generate accurate subtitles using AI speech recognition',
    icon: Subtitles,
    color: 'from-blue-500 to-cyan-500',
    href: '/features/auto-subtitles'
  },
  {
    id: 'split-streamer',
    title: 'Split Streamer',
    description: 'Split long videos into multiple clips automatically',
    icon: Video,
    color: 'from-purple-500 to-pink-500',
    href: '/features/split-streamer'
  },
  {
    id: 'smart-clipper',
    title: 'Smart Clipper',
    description: 'Extract highlights and key moments using AI',
    icon: Scissors,
    color: 'from-green-500 to-emerald-500',
    href: '/features/smart-clipper'
  },
  {
    id: 'script-generator',
    title: 'Script Generator',
    description: 'Create engaging scripts for your videos',
    icon: FileText,
    color: 'from-orange-500 to-red-500',
    href: '/features/script-generator'
  },
  {
    id: 'fake-conversations',
    title: 'Fake Conversations',
    description: 'Generate realistic chat conversations',
    icon: MessageCircle,
    color: 'from-indigo-500 to-purple-500',
    href: '/features/fake-conversations'
  }
];

const recentProjects = [
  {
    id: 1,
    name: 'Marketing Video',
    type: 'Auto Subtitles',
    status: 'completed',
    createdAt: '2 hours ago',
    thumbnail: '/placeholder.jpg'
  },
  {
    id: 2,
    name: 'Product Demo',
    type: 'Smart Clipper',
    status: 'processing',
    createdAt: '1 day ago',
    thumbnail: '/placeholder.jpg'
  },
  {
    id: 3,
    name: 'Tutorial Series',
    type: 'Split Streamer',
    status: 'completed',
    createdAt: '3 days ago',
    thumbnail: '/placeholder.jpg'
  }
];

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-8"
        >
          <motion.div 
            variants={staggerItem}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Welcome back, {user?.name}!</h1>
              <p className="text-muted-foreground mt-1">Ready to create amazing content with AI?</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
              <Link href="/help">
                <Button variant="outline" size="sm" className="gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Help</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <VideoUpload 
              maxFiles={3}
              maxSize={200 * 1024 * 1024}
              onUploadComplete={(files) => {
                console.log('Upload completed:', files);
              }}
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <h2 className="text-2xl font-bold mb-6">AI Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  variants={staggerItem}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={feature.href}>
                    <Card className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 group">
                      <CardHeader className="pb-4">
                        <div className={`w-12 h-12 rounded-lg bg-linear-to-r ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="ghost" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Get Started
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Projects</h2>
              <div className="flex gap-2">
                <Link href="/videos">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileVideo className="w-4 h-4" />
                    Videos
                  </Button>
                </Link>
                <Link href="/workspaces">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Workspaces
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button variant="outline" size="sm" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    All Projects
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  variants={staggerItem}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Play className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">{project.type}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className={`w-2 h-2 rounded-full ${
                              project.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <span className="text-xs text-muted-foreground capitalize">
                              {project.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {project.createdAt}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Video className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold">24</div>
                  <div className="text-sm text-muted-foreground">Videos Processed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Scissors className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-sm text-muted-foreground">Clips Created</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold">12h</div>
                  <div className="text-sm text-muted-foreground">Time Saved</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
    </ProtectedRoute>
  );
}