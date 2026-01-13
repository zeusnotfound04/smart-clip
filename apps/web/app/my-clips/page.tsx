'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Star, 
  Clock, 
  Trash2, 
  Edit2, 
  Play, 
  Download,
  MoreVertical,
  Grid3x3,
  List,
  Filter
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Clip {
  id: string;
  originalName: string;
  title: string | null;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  size: number | null;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  projectCount: number;
}

export default function MyClipsPage() {
  const { user } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastUsedAt' | 'usageCount'>('createdAt');
  const [filterFavorites, setFilterFavorites] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClips();
    }
  }, [user, sortBy, filterFavorites]);

  const fetchClips = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sortBy,
        order: 'desc',
      });

      if (filterFavorites) {
        params.append('favorite', 'true');
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('smartclips_token') : null;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/my-clips?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch clips');

      const data = await response.json();
      setClips(data.clips);
    } catch (error) {
      console.error('Error fetching clips:', error);
      toast.error('Failed to load your clips');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (clipId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('smartclips_token') : null;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/my-clips/${clipId}/favorite`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to update favorite');

      const data = await response.json();
      toast.success(data.message);
      fetchClips();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const deleteClip = async (clipId: string) => {
    if (!confirm('Are you sure you want to delete this clip?')) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('smartclips_token') : null;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${clipId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete clip');

      toast.success('Clip deleted successfully');
      fetchClips();
    } catch (error) {
      console.error('Error deleting clip:', error);
      toast.error('Failed to delete clip');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredClips = clips.filter(clip => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      clip.originalName.toLowerCase().includes(query) ||
      clip.title?.toLowerCase().includes(query) ||
      clip.description?.toLowerCase().includes(query) ||
      clip.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Clips</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your uploaded video clips in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clips by name, title, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Button
          variant={filterFavorites ? 'default' : 'outline'}
          onClick={() => setFilterFavorites(!filterFavorites)}
        >
          <Star className={`h-4 w-4 mr-2 ${filterFavorites ? 'fill-current' : ''}`} />
          Favorites
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Sort by
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortBy('createdAt')}>
              Most Recent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('lastUsedAt')}>
              Recently Used
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('usageCount')}>
              Most Used
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="aspect-video bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-lg">No clips found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Upload your first video to get started
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClips.map((clip) => (
            <Card key={clip.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted">
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title || clip.originalName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {clip.duration && (
                    <Badge className="absolute bottom-2 right-2 bg-black/70">
                      {formatDuration(clip.duration)}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                    onClick={() => toggleFavorite(clip.id)}
                  >
                    <Star
                      className={`h-4 w-4 ${clip.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`}
                    />
                  </Button>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate">
                    {clip.title || clip.originalName}
                  </h3>
                  {clip.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {clip.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(clip.createdAt)}</span>
                    {clip.usageCount > 0 && (
                      <>
                        <span>•</span>
                        <span>Used {clip.usageCount}x</span>
                      </>
                    )}
                  </div>
                  {clip.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {clip.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1">
                      <Play className="h-3 w-3 mr-1" />
                      Use Clip
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteClip(clip.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClips.map((clip) => (
            <Card key={clip.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="relative w-32 h-20 bg-muted rounded flex-shrink-0">
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title || clip.originalName}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{clip.title || clip.originalName}</h3>
                    {clip.isFavorite && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                  {clip.description && (
                    <p className="text-sm text-muted-foreground mt-1">{clip.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{formatDate(clip.createdAt)}</span>
                    <span>{formatDuration(clip.duration)}</span>
                    <span>{formatFileSize(clip.size)}</span>
                    <span>Used {clip.usageCount}x</span>
                    <span>{clip.projectCount} projects</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">
                    <Play className="h-3 w-3 mr-1" />
                    Use
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => toggleFavorite(clip.id)}>
                        <Star className="h-4 w-4 mr-2" />
                        {clip.isFavorite ? 'Remove from' : 'Add to'} Favorites
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteClip(clip.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
