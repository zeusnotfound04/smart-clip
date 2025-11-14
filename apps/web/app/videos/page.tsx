'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search,
  Filter,
  Grid3X3,
  List,
  Play,
  Download,
  Share2,
  Trash2,
  Calendar,
  Clock,
  FileVideo,
  MoreVertical,
  ArrowUpDown,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProtectedRoute } from '@/components/protected-route';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  size: string;
  format: string;
  createdAt: Date;
  lastModified: Date;
  views: number;
  status: 'processed' | 'processing' | 'failed';
  tags: string[];
}

const mockVideos: Video[] = [
  {
    id: '1',
    title: 'Marketing Presentation Q4 2024',
    thumbnail: '/api/placeholder/320/180',
    duration: '15:42',
    size: '245 MB',
    format: 'MP4',
    createdAt: new Date('2024-11-10'),
    lastModified: new Date('2024-11-12'),
    views: 156,
    status: 'processed',
    tags: ['marketing', 'presentation', 'business']
  },
  {
    id: '2',
    title: 'Product Demo - New Features',
    thumbnail: '/api/placeholder/320/180',
    duration: '8:33',
    size: '128 MB',
    format: 'MP4',
    createdAt: new Date('2024-11-08'),
    lastModified: new Date('2024-11-08'),
    views: 89,
    status: 'processed',
    tags: ['demo', 'product', 'features']
  },
  {
    id: '3',
    title: 'Tutorial: Getting Started Guide',
    thumbnail: '/api/placeholder/320/180',
    duration: '22:15',
    size: '387 MB',
    format: 'MP4',
    createdAt: new Date('2024-11-05'),
    lastModified: new Date('2024-11-06'),
    views: 234,
    status: 'processing',
    tags: ['tutorial', 'guide', 'education']
  },
  {
    id: '4',
    title: 'Team Meeting Recording',
    thumbnail: '/api/placeholder/320/180',
    duration: '45:20',
    size: '892 MB',
    format: 'MP4',
    createdAt: new Date('2024-11-03'),
    lastModified: new Date('2024-11-03'),
    views: 12,
    status: 'processed',
    tags: ['meeting', 'team', 'internal']
  },
  {
    id: '5',
    title: 'Customer Testimonial Video',
    thumbnail: '/api/placeholder/320/180',
    duration: '3:45',
    size: '67 MB',
    format: 'MP4',
    createdAt: new Date('2024-10-28'),
    lastModified: new Date('2024-10-29'),
    views: 445,
    status: 'processed',
    tags: ['testimonial', 'customer', 'marketing']
  },
  {
    id: '6',
    title: 'Webinar: AI in Content Creation',
    thumbnail: '/api/placeholder/320/180',
    duration: '1:12:33',
    size: '1.2 GB',
    format: 'MP4',
    createdAt: new Date('2024-10-25'),
    lastModified: new Date('2024-10-25'),
    views: 678,
    status: 'failed',
    tags: ['webinar', 'ai', 'content']
  }
];

export default function VideosPage() {
  const [videos, setVideos] = useState(mockVideos);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('createdAt');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterBy === 'all' || video.status === filterBy;
    
    return matchesSearch && matchesFilter;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'duration':
        return a.duration.localeCompare(b.duration);
      case 'size':
        return a.size.localeCompare(b.size);
      case 'views':
        return b.views - a.views;
      case 'createdAt':
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      processed: 'bg-green-100 text-green-800 border-green-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            <motion.div variants={staggerItem}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Video Library</h1>
                  <p className="text-muted-foreground mt-1">
                    Manage and organize your video content
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileVideo className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload Video</span>
                  </Button>
                  <Link href="/dashboard">
                    <Button size="sm">Back to Dashboard</Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search videos by title or tags..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={filterBy} onValueChange={setFilterBy}>
                        <SelectTrigger className="w-32">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="processed">Processed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-32">
                          <ArrowUpDown className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt">Date Created</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                          <SelectItem value="duration">Duration</SelectItem>
                          <SelectItem value="size">File Size</SelectItem>
                          <SelectItem value="views">Views</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex border rounded-md">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="rounded-r-none"
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="rounded-l-none"
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      {sortedVideos.length} videos found
                      {selectedVideos.length > 0 && ` • ${selectedVideos.length} selected`}
                    </p>
                    
                    {selectedVideos.length > 0 && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sortedVideos.map((video, index) => (
                        <motion.div
                          key={video.id}
                          variants={staggerItem}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`group relative border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow ${
                            selectedVideos.includes(video.id) ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => toggleVideoSelection(video.id)}
                        >
                          <div className="relative aspect-video bg-slate-100">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            <div className="absolute bottom-2 right-2">
                              <span className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                                {video.duration}
                              </span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-black/50 rounded-full p-3">
                                <Play className="w-6 h-6 text-white fill-current" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <h3 className="font-medium text-sm line-clamp-2 mb-2">
                              {video.title}
                            </h3>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{video.size} • {video.format}</span>
                                {getStatusBadge(video.status)}
                              </div>
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {video.views}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {video.createdAt.toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="absolute top-2 right-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Play className="w-4 h-4 mr-2" />
                                  Play Video
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedVideos.map((video, index) => (
                        <motion.div
                          key={video.id}
                          variants={staggerItem}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`flex items-center gap-4 p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors ${
                            selectedVideos.includes(video.id) ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => toggleVideoSelection(video.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedVideos.includes(video.id)}
                            onChange={() => toggleVideoSelection(video.id)}
                            className="rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          <div className="w-16 h-9 bg-slate-100 rounded flex items-center justify-center">
                            <FileVideo className="w-4 h-4 text-slate-400" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{video.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              {video.duration} • {video.size} • {video.format}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {getStatusBadge(video.status)}
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {video.views}
                            </div>
                            <span>{video.createdAt.toLocaleDateString()}</span>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Play className="w-4 h-4 mr-2" />
                                Play Video
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}