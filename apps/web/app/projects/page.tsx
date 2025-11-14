'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Folder,
  Play,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  FileVideo,
  Trash2,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProtectedRoute } from '@/components/protected-route';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  type: 'auto-subtitles' | 'split-streamer' | 'smart-clipper' | 'script-generator' | 'fake-conversations';
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  fileSize: number;
  duration?: number;
  thumbnail?: string;
  outputUrl?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: 'Marketing Video Subtitles',
        type: 'auto-subtitles',
        status: 'completed',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        fileSize: 45 * 1024 * 1024,
        duration: 180,
        outputUrl: '/output1.mp4'
      },
      {
        id: '2',
        name: 'Gaming Stream Clips',
        type: 'smart-clipper',
        status: 'completed',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        fileSize: 120 * 1024 * 1024,
        duration: 45,
        outputUrl: '/output2.mp4'
      },
      {
        id: '3',
        name: 'Product Demo Script',
        type: 'script-generator',
        status: 'completed',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        fileSize: 2 * 1024,
        outputUrl: '/script.txt'
      },
      {
        id: '4',
        name: 'Mobile Stream Layout',
        type: 'split-streamer',
        status: 'processing',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000),
        fileSize: 200 * 1024 * 1024,
        duration: 300
      },
      {
        id: '5',
        name: 'Story Chat Video',
        type: 'fake-conversations',
        status: 'failed',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        fileSize: 5 * 1024 * 1024,
        duration: 60
      }
    ];
    
    setProjects(mockProjects);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      'auto-subtitles': 'Auto Subtitles',
      'split-streamer': 'Split Streamer',
      'smart-clipper': 'Smart Clipper',
      'script-generator': 'Script Generator',
      'fake-conversations': 'Fake Conversations'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredProjects = projects
    .filter(project => {
      if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterType !== 'all' && project.type !== filterType) {
        return false;
      }
      if (filterStatus !== 'all' && project.status !== filterStatus) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent': return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'oldest': return a.updatedAt.getTime() - b.updatedAt.getTime();
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-gray-100">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            <motion.div variants={staggerItem} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold gradient-text">Projects</h1>
                  <p className="text-muted-foreground">Manage your video processing projects</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{filteredProjects.length} projects</span>
              </div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search projects..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="auto-subtitles">Auto Subtitles</SelectItem>
                          <SelectItem value="split-streamer">Split Streamer</SelectItem>
                          <SelectItem value="smart-clipper">Smart Clipper</SelectItem>
                          <SelectItem value="script-generator">Script Generator</SelectItem>
                          <SelectItem value="fake-conversations">Fake Conversations</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Most Recent</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="name">Name A-Z</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        variants={staggerItem}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            {project.type === 'script-generator' ? (
                              <FileVideo className="w-6 h-6 text-slate-600" />
                            ) : (
                              <Play className="w-6 h-6 text-slate-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-sm text-muted-foreground">
                                    {getTypeLabel(project.type)}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(project.status)}`}>
                                    {project.status}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {project.status === 'completed' && (
                                  <>
                                    <Button size="sm" variant="outline" className="gap-2">
                                      <Eye className="w-4 h-4" />
                                      View
                                    </Button>
                                    <Button size="sm" variant="outline" className="gap-2">
                                      <Download className="w-4 h-4" />
                                      Download
                                    </Button>
                                  </>
                                )}
                                {project.status === 'processing' && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4 animate-spin" />
                                    Processing...
                                  </div>
                                )}
                                <Button size="sm" variant="ghost">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {project.createdAt.toLocaleDateString()}
                                </span>
                              </div>
                              <span>{formatFileSize(project.fileSize)}</span>
                              {project.duration && (
                                <span>{formatDuration(project.duration)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {filteredProjects.length === 0 && (
                      <div className="text-center py-12">
                        <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="font-medium text-lg mb-2">No projects found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                            ? 'Try adjusting your filters or search terms'
                            : 'Create your first project to get started'
                          }
                        </p>
                        <Link href="/dashboard">
                          <Button>
                            Create Project
                          </Button>
                        </Link>
                      </div>
                    )}
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