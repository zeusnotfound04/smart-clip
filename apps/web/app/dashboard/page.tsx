'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { apiClient, Project } from '@/lib/api-client';
import { CreditsDisplay } from '@/components/credits-display';



// Helper functions
const getFeatureIcon = (type: string) => {
  switch (type) {
    case 'auto-subtitles': return '';
    case 'smart-clipper': return '';
    case 'split-streamer': return '';
    case 'ai-script-generator': return '';
    case 'fake-conversations': return '';
    default: return '';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleCreateProject = () => {
    // Navigate directly to choose-feature page (no video upload here)
    window.location.href = '/choose-feature';
  };



  // Get recent projects (last 4)
  const recentProjects = projects.slice(0, 4);

  return (
    <>
      <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="flex items-center gap-4 border-b p-4">
          <SidebarTrigger />
          <div className="flex-1">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold"
            >
              Welcome back, {user?.name || 'User'}!
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm"
            >
              Ready to create amazing content with AI?
            </motion.p>
          </div>
          <CreditsDisplay />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Create Project Section */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-center mb-8">
                
                <h2 className="text-3xl font-bold mb-2">
                  Create New Project
                </h2>
              </div>
              
              <div className="flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >

                  <Card 
                    className="w-full max-w-md cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-dashed border-gray-400 hover:border-blue-400 group"
                    onClick={handleCreateProject}
                  >
                    
                    <CardContent className="p-10 text-center relative z-10">
                      <motion.div className="space-y-6">
                        <motion.div
                          className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-600 flex items-center justify-center group-hover:bg-blue-700 transition-colors"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Plus className="w-10 h-10 text-white" />
                        </motion.div>

                        <div className="space-y-4">
                          <h3 className="text-2xl font-bold">
                            Create New Project
                          </h3>
                          <p className="text-muted-foreground">
                            Select an AI feature to get started
                          </p>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>
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
                          onClick={handleCreateProject}
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
    </>
  );
}