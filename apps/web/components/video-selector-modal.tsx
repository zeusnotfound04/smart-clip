'use client';

import { useState, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Search, 
  Star, 
  Play, 
  Clock,
  CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Clip {
  id: string;
  originalName: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl?: string;
  duration: number | null;
  size: number | null;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  createdAt: string;
}

interface VideoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (clip: Clip | File, source: 'my-clips' | 'local') => void;
  acceptedFileTypes?: string;
  maxFileSize?: number; // in MB
}

export function VideoSelectorModal({
  isOpen,
  onClose,
  onSelect,
  acceptedFileTypes = 'video/*',
  maxFileSize = 500
}: VideoSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<'my-clips' | 'upload'>('my-clips');
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'my-clips') {
      fetchClips();
    }
  }, [isOpen, activeTab]);

  const fetchClips = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('smartclips_token') : null;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/my-clips?sortBy=lastUsedAt&order=desc`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch clips');

      const data = await response.json();
      console.log('Fetched clips:', data.clips);
      if (data.clips && data.clips.length > 0) {
        console.log('First clip:', data.clips[0]);
        console.log('Thumbnail URL:', data.clips[0]?.thumbnailUrl);
        console.log('Video URL:', data.clips[0]?.videoUrl);
      }
      setClips(data.clips || []);
    } catch (error) {
      console.error('Error fetching clips:', error);
      toast.error('Failed to load your clips');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      toast.error(`File size must be less than ${maxFileSize}MB`);
      return;
    }

    // Validate file type
    if (acceptedFileTypes !== '*' && !file.type.match(acceptedFileTypes)) {
      toast.error('Invalid file type');
      return;
    }

    setUploadedFile(file);
  };

  const handleSelectClip = () => {
    if (!selectedClip) {
      toast.error('Please select a clip');
      return;
    }

    const clip = clips.find((c) => c.id === selectedClip);
    if (!clip) return;

    onSelect(clip, 'my-clips');
    handleClose();
  };

  const handleUploadFile = () => {
    if (!uploadedFile) {
      toast.error('Please select a file');
      return;
    }

    onSelect(uploadedFile, 'local');
    handleClose();
  };

  const handleClose = () => {
    setSelectedClip(null);
    setUploadedFile(null);
    setSearchQuery('');
    onClose();
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

  const filteredClips = clips.filter((clip) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      clip.originalName.toLowerCase().includes(query) ||
      clip.title?.toLowerCase().includes(query) ||
      clip.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Video</DialogTitle>
          <DialogDescription>
            Choose a video from your clips or upload a new one
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-clips">
              <Star className="h-4 w-4 mr-2" />
              My Clips
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-clips" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your clips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredClips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No clips found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try uploading your first video
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredClips.map((clip) => (
                    <button
                      key={clip.id}
                      onClick={() => setSelectedClip(clip.id)}
                      className={cn(
                        'relative rounded-lg overflow-hidden border-2 transition-all hover:shadow-md',
                        selectedClip === clip.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-transparent hover:border-muted'
                      )}
                    >
                      <div className="aspect-video bg-muted relative">
                        {clip.thumbnailUrl ? (
                          <img
                            src={clip.thumbnailUrl}
                            alt={clip.title || clip.originalName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Thumbnail failed to load:', clip.thumbnailUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : clip.videoUrl ? (
                          <video
                            src={clip.videoUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {clip.duration && (
                          <Badge className="absolute bottom-2 right-2 bg-black/70 text-xs">
                            {formatDuration(clip.duration)}
                          </Badge>
                        )}
                        {clip.isFavorite && (
                          <Star className="absolute top-2 right-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                        {selectedClip === clip.id && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-background">
                        <p className="font-medium text-sm truncate text-left">
                          {clip.title || clip.originalName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatFileSize(clip.size)}</span>
                          {clip.usageCount > 0 && (
                            <>
                              <span>•</span>
                              <span>Used {clip.usageCount}x</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSelectClip} disabled={!selectedClip}>
                Select Clip
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 flex flex-col mt-4">
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
              {uploadedFile ? (
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <p className="font-semibold">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setUploadedFile(null)}
                    className="mt-4"
                  >
                    Choose Different File
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">Upload a video file</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Maximum file size: {maxFileSize}MB
                  </p>
                  <label htmlFor="file-upload">
                    <Button asChild>
                      <span>Choose File</span>
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept={acceptedFileTypes}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUploadFile} disabled={!uploadedFile}>
                Upload & Continue
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
