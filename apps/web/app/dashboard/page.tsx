'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Film,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { apiClient, Project } from '@/lib/api-client';
import { CreditsDisplay } from '@/components/credits-display';
import Silk from '@/components/slik-background';
import { useRouter } from 'next/navigation';



// Helper functions
const getFeatureIcon = (type: string) => {
  switch (type) {
    case 'auto-subtitles': return '📝';
    case 'smart-clipper': return '✂️';
    case 'split-streamer': return '🎬';
    case 'ai-script-generator': return '🤖';
    case 'fake-conversations': return '💬';
    default: return '🎥';
  }
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'processing': return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
    default: return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getProjects();
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    router.push('/choose-feature');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter(file => 
      file.type.startsWith('video/') || 
      file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)
    );
    
    if (videoFiles.length > 0) {
      // Store the file for the next page to use
      // For now, redirect to choose feature page
      router.push('/choose-feature');
    }
  }, [router]);



  // Get recent projects (last 4)
  const recentProjects = projects.slice(0, 4);

  return (
    <>
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Silk Background */}
        <div className="absolute inset-0 z-0">
          <Silk speed={3} scale={1.5} color="#121212" noiseIntensity={1.2} rotation={0.3} />
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col min-h-screen text-foreground">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b p-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <CreditsDisplay />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Upload Section */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex justify-center">
                <motion.div
                  className="w-full max-w-4xl"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className="relative cursor-pointer group"
                    onClick={handleUploadClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {/* Glowing background effect */}
                    <motion.div
                      className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-white to-black rounded-2xl opacity-75 blur-xl"
                      animate={{
                        opacity: isDragging ? 1 : [0.5, 0.8, 0.5],
                        scale: isDragging ? 1.05 : [1, 1.02, 1],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    {/* Main card */}
                    <Card className={`relative border-2 border-dashed transition-all duration-300 bg-black/40 backdrop-blur-sm ${
                      isDragging 
                        ? 'border-blue-400 bg-blue-500/10 scale-105' 
                        : 'border-gray-600 group-hover:border-blue-500'
                    }`}>
                      <CardContent className="p-12 lg:p-16">
                        <div className="text-center space-y-6">
                          {/* Icon with animation */}
                          <motion.div
                            className="relative mx-auto w-24 h-24 lg:w-32 lg:h-32"
                            animate={{
                              y: isDragging ? -15 : [0, -10, 0],
                              scale: isDragging ? 1.1 : 1,
                            }}
                            transition={{
                              duration: isDragging ? 0.3 : 5,
                              repeat: isDragging ? 0 : Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            {/* Glow effect behind icon */}
                            <motion.div
                              className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl"
                              animate={{
                                scale: isDragging ? 1.3 : [1, 1.2, 1],
                                opacity: isDragging ? 1 : [0.5, 0.8, 0.5],
                              }}
                              transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            
                            {/* Icon container */}
                            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <Upload className="w-12 h-12 lg:w-16 lg:h-16 text-black" />
                            </div>
                            
                            {/* Sparkles */}
                            <motion.div
                              className="absolute -top-2 -right-2"
                              animate={{
                                rotate: [0, 360],
                                scale: [1, 1.2, 1],
                              }}
                              transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                            >
                              <Sparkles className="w-6 h-6 text-yellow-400" />
                            </motion.div>
                          </motion.div>

                          {/* Text content */}
                          <div className="space-y-3">
                            {/* Smart Clip Branding */}
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex items-center justify-center mb-2"
                            >
                              <motion.span 
                                className="text-2xl font-bold text-blue-400 tracking-wider uppercase relative"
                                animate={{
                                  textShadow: [
                                    '0 0 10px rgba(59, 130, 246, 0.5)',
                                    '0 0 20px rgba(59, 130, 246, 0.8)',
                                    '0 0 30px rgba(59, 130, 246, 1)',
                                    '0 0 20px rgba(59, 130, 246, 0.8)',
                                    '0 0 10px rgba(59, 130, 246, 0.5)',
                                  ],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                Smart Clips
                              </motion.span>
                            </motion.div>

                            <motion.h2 
                              className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 via-white to-blue-600 bg-clip-text text-transparent"
                              animate={{
                                backgroundPosition: ["0%", "100%", "0%"],
                              }}
                              transition={{
                                duration: 10,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                            >
                              {isDragging ? 'Drop Your Video Here! ✨' : 'Upload Your Video'}
                            </motion.h2>
                            
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                              {isDragging 
                                ? 'Release to start creating amazing clips' 
                                : 'Drag and drop your video here or click to browse'}
                            </p>
                            
                            <motion.div
                              className="flex items-center justify-center gap-4 text-sm text-muted-foreground pt-4"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <div className="flex items-center gap-2">
                                <Film className="w-4 h-4" />
                                <span>MP4, MOV, AVI</span>
                              </div>
                              <span>•</span>
                              <span>Max 500MB</span>
                            </motion.div>
                          </div>

                          {/* Action button */}
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="lg"
                              className="bg-gradient-to-r from-blue-600 to-black hover:from-blue-700 hover:to-gray-900 text-white font-semibold px-8 py-6 text-lg shadow-lg shadow-blue-500/50"
                            >
                              <Upload className="w-5 h-5 mr-2" />
                              Choose Video
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </div>
            </motion.section>

            {/* Recent Projects Section */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Recent Projects</h2>
                <Link href="/dashboard/projects">
                  <Button variant="outline" className="gap-2">
                    View All Projects
                  </Button>
                </Link>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                    >
                      <Card className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-lg bg-gray-700" />
                            <div className="flex-1 space-y-2">
                              <div className="h-5 bg-gray-700 rounded w-3/4" />
                              <div className="h-4 bg-gray-800 rounded w-1/2" />
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-700 rounded-full" />
                                <div className="h-3 bg-gray-800 rounded w-16" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="w-8 h-8 bg-gray-700 rounded" />
                              <div className="h-3 bg-gray-800 rounded w-12" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-blue-400/30">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <motion.div 
                                className="w-16 h-16 rounded-lg bg-linear-to-br from-gray-700 to-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 relative overflow-hidden"
                                whileHover={{ rotate: 5 }}
                              >
                                {getFeatureIcon(project.type)}
                                
                                {/* Subtle glow effect */}
                                <motion.div
                                  className="absolute inset-0 bg-blue-400/20 rounded-lg"
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                />
                              </motion.div>
                              
                              <div className="flex-1 min-w-0">
                                <motion.h3 
                                  className="font-bold text-lg truncate mb-1 group-hover:text-blue-400 transition-colors"
                                  whileHover={{ x: 2 }}
                                >
                                  {project.name}
                                </motion.h3>
                                <p className="text-sm text-muted-foreground mb-2 capitalize">
                                  {project.type.replace('-', ' ')}
                                </p>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(project.status)}
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {project.status}
                                  </span>
                                  {project.progress > 0 && project.status === 'processing' && (
                                    <motion.span 
                                      className="text-xs text-blue-400"
                                      animate={{ opacity: [0.5, 1, 0.5] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    >
                                      {project.progress}%
                                    </motion.span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end">
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button variant="ghost" size="sm" className="mb-2 hover:bg-blue-500/20">
                                    <Play className="w-4 h-4" />
                                  </Button>
                                </motion.div>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(project.createdAt)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {!isLoading && recentProjects.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="text-center py-16"
                    >
                      <motion.div
                        animate={{ 
                          rotateY: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="text-8xl mb-6"
                      >
                        
                      </motion.div>
                      <motion.h3 
                        className="text-2xl font-bold mb-2"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        No projects yet
                      </motion.h3>
                      <motion.p 
                        className="text-muted-foreground mb-6"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                      >
                        Create your first project and watch the magic happen!
                      </motion.p>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.9 }}
                      >
                        <Button 
                          onClick={handleUploadClick}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Project
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.section>
          </div>
        </main>
        </div>
      </div>
    </>
  );
}