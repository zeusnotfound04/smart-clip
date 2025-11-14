'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  Clock,
  Users,
  FileVideo,
  FolderOpen,
  Star,
  Archive,
  MoreVertical,
  Settings,
  Share2,
  Download,
  Trash2,
  Eye,
  Edit3,
  Copy,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ProtectedRoute } from '@/components/protected-route';
import { VideoPlayer } from '@/components/video-player';
import { staggerContainer, staggerItem } from '@/lib/utils';

interface Workspace {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  projectCount: number;
  collaborators: number;
  lastActivity: Date;
  isStarred: boolean;
  isArchived: boolean;
  tags: string[];
  totalSize: number;
  owner: string;
}

interface RecentActivity {
  id: string;
  type: 'created' | 'completed' | 'shared' | 'uploaded';
  projectName: string;
  workspace: string;
  timestamp: Date;
  user: string;
}

const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Marketing Campaign Q4',
    description: 'Video content for Q4 marketing push including product demos and testimonials',
    thumbnail: '/api/placeholder/400/300',
    projectCount: 12,
    collaborators: 4,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isStarred: true,
    isArchived: false,
    tags: ['marketing', 'q4', 'campaign'],
    totalSize: 2.4,
    owner: 'Sarah Johnson'
  },
  {
    id: '2',
    name: 'Product Training Videos',
    description: 'Comprehensive training materials for new product features',
    thumbnail: '/api/placeholder/400/300',
    projectCount: 8,
    collaborators: 2,
    lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isStarred: false,
    isArchived: false,
    tags: ['training', 'product', 'education'],
    totalSize: 1.8,
    owner: 'Mike Chen'
  },
  {
    id: '3',
    name: 'Customer Success Stories',
    description: 'Collection of customer testimonials and case studies',
    thumbnail: '/api/placeholder/400/300',
    projectCount: 15,
    collaborators: 3,
    lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isStarred: true,
    isArchived: false,
    tags: ['testimonials', 'customers', 'success'],
    totalSize: 3.2,
    owner: 'Emma Davis'
  },
  {
    id: '4',
    name: 'Internal Communications',
    description: 'Company updates, meetings, and internal training content',
    thumbnail: '/api/placeholder/400/300',
    projectCount: 6,
    collaborators: 8,
    lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    isStarred: false,
    isArchived: false,
    tags: ['internal', 'communication', 'team'],
    totalSize: 0.9,
    owner: 'Alex Rivera'
  },
  {
    id: '5',
    name: 'Archive - Q3 Content',
    description: 'Previous quarter marketing and training materials',
    thumbnail: '/api/placeholder/400/300',
    projectCount: 25,
    collaborators: 0,
    lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    isStarred: false,
    isArchived: true,
    tags: ['archive', 'q3', 'completed'],
    totalSize: 4.1,
    owner: 'System'
  }
];

const mockRecentActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'completed',
    projectName: 'Product Demo Video',
    workspace: 'Marketing Campaign Q4',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    user: 'Sarah Johnson'
  },
  {
    id: '2',
    type: 'uploaded',
    projectName: 'Training Module 3',
    workspace: 'Product Training Videos',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    user: 'Mike Chen'
  },
  {
    id: '3',
    type: 'shared',
    projectName: 'Customer Testimonial',
    workspace: 'Customer Success Stories',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    user: 'Emma Davis'
  },
  {
    id: '4',
    type: 'created',
    projectName: 'Weekly Update',
    workspace: 'Internal Communications',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    user: 'Alex Rivera'
  }
];

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState(mockWorkspaces);
  const [recentActivity] = useState(mockRecentActivity);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('lastActivity');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredWorkspaces = workspaces.filter(workspace => {
    const matchesSearch = workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workspace.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workspace.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterBy === 'all' || 
                         (filterBy === 'starred' && workspace.isStarred) ||
                         (filterBy === 'archived' && workspace.isArchived) ||
                         (filterBy === 'active' && !workspace.isArchived);
    
    return matchesSearch && matchesFilter;
  });

  const sortedWorkspaces = [...filteredWorkspaces].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'projectCount':
        return b.projectCount - a.projectCount;
      case 'size':
        return b.totalSize - a.totalSize;
      case 'lastActivity':
      default:
        return b.lastActivity.getTime() - a.lastActivity.getTime();
    }
  });

  const toggleStar = (workspaceId: string) => {
    setWorkspaces(prev => 
      prev.map(w => 
        w.id === workspaceId 
          ? { ...w, isStarred: !w.isStarred }
          : w
      )
    );
  };

  const toggleArchive = (workspaceId: string) => {
    setWorkspaces(prev => 
      prev.map(w => 
        w.id === workspaceId 
          ? { ...w, isArchived: !w.isArchived }
          : w
      )
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed': return <Clock className="w-4 h-4 text-green-500" />;
      case 'uploaded': return <FileVideo className="w-4 h-4 text-blue-500" />;
      case 'shared': return <Share2 className="w-4 h-4 text-purple-500" />;
      case 'created': return <Plus className="w-4 h-4 text-orange-500" />;
      default: return <FileVideo className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (sizeInGB: number) => {
    return `${sizeInGB.toFixed(1)} GB`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Header */}
            <motion.div variants={staggerItem}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Project Workspaces</h1>
                  <p className="text-muted-foreground mt-1">
                    Organize and manage your video projects
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Workspace
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Workspace</DialogTitle>
                        <DialogDescription>
                          Create a new workspace to organize your video projects
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="workspace-name">Workspace Name</Label>
                          <Input id="workspace-name" placeholder="Enter workspace name" />
                        </div>
                        <div>
                          <Label htmlFor="workspace-desc">Description</Label>
                          <Textarea id="workspace-desc" placeholder="Describe your workspace" />
                        </div>
                        <div>
                          <Label htmlFor="workspace-tags">Tags</Label>
                          <Input id="workspace-tags" placeholder="marketing, video, campaign" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => setShowCreateDialog(false)}>
                            Create Workspace
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">Back to Dashboard</Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Search and Filters */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search workspaces..."
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
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="starred">Starred</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lastActivity">Recent Activity</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="projectCount">Project Count</SelectItem>
                          <SelectItem value="size">File Size</SelectItem>
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

                  <p className="text-sm text-muted-foreground">
                    {sortedWorkspaces.length} workspace{sortedWorkspaces.length !== 1 ? 's' : ''} found
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Workspaces */}
              <div className="lg:col-span-3">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedWorkspaces.map((workspace, index) => (
                      <motion.div
                        key={workspace.id}
                        variants={staggerItem}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`group cursor-pointer hover:shadow-lg transition-all ${workspace.isArchived ? 'opacity-75' : ''}`}>
                          <CardContent className="p-0">
                            <div className="relative aspect-video bg-linear-to-br from-blue-100 to-purple-100 rounded-t-lg">
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-t-lg" />
                              
                              {/* Workspace Actions */}
                              <div className="absolute top-2 right-2 flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStar(workspace.id);
                                  }}
                                >
                                  <Star className={`w-4 h-4 ${workspace.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Workspace
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Edit3 className="w-4 h-4 mr-2" />
                                      Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Copy className="w-4 h-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => toggleArchive(workspace.id)}>
                                      <Archive className="w-4 h-4 mr-2" />
                                      {workspace.isArchived ? 'Unarchive' : 'Archive'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Project Count Badge */}
                              <div className="absolute bottom-2 left-2">
                                <Badge variant="secondary" className="bg-white/90">
                                  {workspace.projectCount} projects
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold truncate flex-1">{workspace.name}</h3>
                                {workspace.isStarred && (
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 ml-2 flex-shrink-0" />
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {workspace.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-1 mb-3">
                                {workspace.tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {workspace.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{workspace.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {workspace.collaborators}
                                  </div>
                                  <span>{formatFileSize(workspace.totalSize)}</span>
                                </div>
                                <span>{formatTimeAgo(workspace.lastActivity)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedWorkspaces.map((workspace, index) => (
                      <motion.div
                        key={workspace.id}
                        variants={staggerItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <Card className={`group cursor-pointer hover:shadow-md transition-all ${workspace.isArchived ? 'opacity-75' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                                <FolderOpen className="w-6 h-6 text-blue-600" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate">{workspace.name}</h3>
                                  {workspace.isStarred && (
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                  )}
                                  {workspace.isArchived && (
                                    <Badge variant="outline" className="text-xs">Archived</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {workspace.description}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <div className="text-center">
                                  <div className="font-medium">{workspace.projectCount}</div>
                                  <div className="text-xs">Projects</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">{workspace.collaborators}</div>
                                  <div className="text-xs">Members</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">{formatFileSize(workspace.totalSize)}</div>
                                  <div className="text-xs">Size</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">{formatTimeAgo(workspace.lastActivity)}</div>
                                  <div className="text-xs">Updated</div>
                                </div>
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Workspace
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleStar(workspace.id)}>
                                    <Star className="w-4 h-4 mr-2" />
                                    {workspace.isStarred ? 'Remove Star' : 'Add Star'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => toggleArchive(workspace.id)}>
                                    <Archive className="w-4 h-4 mr-2" />
                                    {workspace.isArchived ? 'Unarchive' : 'Archive'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity Sidebar */}
              <div className="lg:col-span-1">
                <motion.div variants={staggerItem}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                      <CardDescription>
                        Latest updates across all workspaces
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          {getActivityIcon(activity.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {activity.projectName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.workspace}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{activity.user}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(activity.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <Button variant="outline" size="sm" className="w-full">
                        View All Activity
                      </Button>
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