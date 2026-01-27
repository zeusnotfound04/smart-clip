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
  Link2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { apiClient, Project } from '@/lib/api-client';
import { CreditsDisplay } from '@/components/credits-display';
import Silk from '@/components/slik-background';
import { useRouter } from 'next/navigation';
import { LogoLoop } from '@/components/logo-loop';
import { SiYoutube, SiInstagram, SiTiktok, SiX, SiRumble, SiKick, SiTwitch, SiGoogledrive, SiZoom } from 'react-icons/si';


// Platform logos for LogoLoop
const platformLogos = [
  { node: <SiYoutube className="text-gray-300" />, title: "YouTube" },
  { node: <SiInstagram className="text-gray-300" />, title: "Instagram" },
  { node: <SiTiktok className="text-gray-300" />, title: "TikTok" },
  { node: <SiX className="text-gray-300" />, title: "X/Twitter" },
  { node: <SiRumble className="text-gray-300" />, title: "Rumble" },
  { node: <SiKick className="text-gray-300" />, title: "Kick" },
  { node: <SiTwitch className="text-gray-300" />, title: "Twitch" },
  { node: <SiGoogledrive className="text-gray-300" />, title: "Google Drive" },
  { node: <SiZoom className="text-gray-300" />, title: "Zoom" },
];

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
  const [videoUrl, setVideoUrl] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [currentPlatformIndex, setCurrentPlatformIndex] = useState(0);
  const [platformFade, setPlatformFade] = useState(true);

  const platforms = [
    'YouTube',
    'Instagram',
    'X',
    'Rumble',
    'Kick',
    'Twitch',
    'Zoom',
    'Google Drive',
    'TikTok'
  ];

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

  const handleValidateUrl = async () => {
    if (!videoUrl.trim()) return;

    setIsValidatingUrl(true);
    setUrlError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/video-url-upload/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartclips_token')}`
        },
        body: JSON.stringify({ url: videoUrl })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invalid URL');
      }

      // URL is valid, redirect to choose-feature with the URL
      router.push(`/choose-feature?url=${encodeURIComponent(videoUrl)}`);
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : 'Invalid video URL');
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidatingUrl && videoUrl.trim()) {
      handleValidateUrl();
    }
  };

  // Animated placeholder effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPlatformFade(false);
      
      setTimeout(() => {
        setCurrentPlatformIndex((prev) => (prev + 1) % platforms.length);
        setPlatformFade(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, [platforms.length]);

  // Get recent projects (last 4)
  const recentProjects = projects.slice(0, 4);

  return (
    <>
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {/* Silk Background */}
        <div className="absolute inset-0 z-0">
          <Silk speed={3} scale={1.5} color="#2B2B2B" noiseIntensity={1.2} rotation={0.3} />
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
                  className="w-full max-w-2xl"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className="relative cursor-pointer group"
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
                      <CardContent className="p-5 lg:p-6">
                        <div className="text-center space-y-2">
                          {/* Icon with animation */}
                          <motion.div
                            className="relative mx-auto w-10 h-10 lg:w-14 lg:h-14"
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
                              <Upload className="w-5 h-5 lg:w-7 lg:h-7 text-black" />
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
                              <Sparkles className="w-3 h-3 text-yellow-400" />
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
                                className="text-base font-bold text-blue-400 tracking-wider uppercase relative"
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
                              className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-400 via-white to-blue-600 bg-clip-text text-transparent"
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
                            
                            <p className="text-muted-foreground text-xs max-w-2xl mx-auto">
                              {isDragging 
                                ? 'Release to start creating amazing clips' 
                                : 'Paste a video link or drag and drop your file'}
                            </p>

                            {/* URL Input Section */}
                            <div className="max-w-lg mx-auto pt-2 space-y-1.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Link2 className="w-3.5 h-3.5 text-blue-400" />
                                <p className="text-xs text-muted-foreground font-semibold">
                                  Paste video link from any platform
                                </p>
                              </div>
                              
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type="url"
                                    placeholder={`Drop a link for ${platforms[currentPlatformIndex]}`}
                                    value={videoUrl}
                                    onChange={(e) => {
                                      setVideoUrl(e.target.value);
                                      setUrlError(null);
                                    }}
                                    onKeyPress={handleKeyPress}
                                    disabled={isValidatingUrl}
                                    className="w-full h-9 text-sm bg-black/70 border-2 border-gray-700 focus:border-blue-500 text-white transition-all duration-300 rounded-lg"
                                    style={{
                                      '--placeholder-opacity': platformFade ? '1' : '0.3',
                                    } as React.CSSProperties}
                                  />
                                  <style jsx>{`
                                    input::placeholder {
                                      opacity: var(--placeholder-opacity);
                                      transition: opacity 0.5s ease-in-out;
                                      color: rgb(107, 114, 128);
                                    }
                                  `}</style>
                                </div>
                                
                                <Button 
                                  onClick={handleValidateUrl} 
                                  disabled={isValidatingUrl || !videoUrl.trim()}
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold px-4 h-9 text-sm shadow-lg shadow-blue-500/30 transition-all duration-300"
                                >
                                  {isValidatingUrl ? (
                                    <>
                                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <Link2 className="mr-1.5 h-3.5 w-3.5" />
                                      Import
                                    </>
                                  )}
                                </Button>
                              </div>

                              {urlError && (
                                <motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-xs text-red-400 text-left"
                                >
                                  {urlError}
                                </motion.p>
                              )}

                              {/* Supported platforms */}
                              <div className="pt-3">
                                <LogoLoop
                                  logos={platformLogos}
                                  speed={30}
                                  direction="left"
                                  logoHeight={22}
                                  gap={56}
                                  pauseOnHover
                                  scaleOnHover
                                  ariaLabel="Supported platforms"
                                />
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="relative py-2">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-600"></div>
                              </div>
                              <div className="relative flex justify-center">
                                <span className="px-4 text-sm text-gray-400 bg-black/40">OR</span>
                              </div>
                            </div>
                            
                            <motion.div
                              className="flex items-center justify-center gap-4 text-xs text-muted-foreground"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <div className="flex items-center gap-2">
                                <Film className="w-3 h-3" />
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
                              size="default"
                              onClick={handleUploadClick}
                              className="bg-gradient-to-r from-blue-600 to-black hover:from-blue-700 hover:to-gray-900 text-white font-semibold px-4 py-2 text-sm shadow-lg shadow-blue-500/50"
                            >
                              <Upload className="w-3.5 h-3.5 mr-2" />
                              Choose Video File
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </div>
            </motion.section>

            {/* Features Section */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="my-12"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-white to-purple-400 bg-clip-text text-transparent mb-1">
                  Powerful Features
                </h2>
                <p className="text-sm text-muted-foreground">Transform your videos with AI-powered tools</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Auto Subtitles */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link href="/auto-subtitles">
                    <Card className="h-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500 transition-all cursor-pointer group">
                      <CardContent className="p-4 text-center">
                        <motion.div
                          className="w-10 h-10 mx-auto mb-2 relative"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <svg viewBox="0 0 48 48" className="w-full h-full">
                            {/* TV/Screen */}
                            <rect x="6" y="8" width="36" height="24" rx="2" fill="currentColor" className="text-blue-400/30" />
                            {/* CC letters */}
                            <text x="14" y="26" fontSize="14" fontWeight="bold" fill="currentColor" className="text-blue-400">CC</text>
                            {/* Subtitle bars */}
                            <motion.rect
                              x="10" y="36" width="28" height="2" rx="1"
                              fill="currentColor"
                              className="text-cyan-400"
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </svg>
                        </motion.div>
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-blue-400 transition-colors">
                          Auto Subtitles
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          AI captions
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* AI Script Generator */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link href="/ai-script-generator">
                    <Card className="h-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500 transition-all cursor-pointer group">
                      <CardContent className="p-4 text-center">
                        <motion.div
                          className="w-10 h-10 mx-auto mb-2 relative"
                          animate={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <svg viewBox="0 0 48 48" className="w-full h-full">
                            {/* Document */}
                            <rect x="10" y="6" width="24" height="32" rx="2" fill="currentColor" className="text-purple-400/30" />
                            {/* Lines */}
                            <rect x="14" y="12" width="16" height="2" rx="1" fill="currentColor" className="text-purple-400" />
                            <rect x="14" y="18" width="12" height="2" rx="1" fill="currentColor" className="text-purple-400" />
                            <rect x="14" y="24" width="14" height="2" rx="1" fill="currentColor" className="text-purple-400" />
                            {/* AI Sparkle */}
                            <motion.path
                              d="M38 12 L40 16 L44 18 L40 20 L38 24 L36 20 L32 18 L36 16 Z"
                              fill="currentColor"
                              className="text-pink-400"
                              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </svg>
                        </motion.div>
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-purple-400 transition-colors">
                          AI Script
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Script writer
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* Podcast Clipper */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link href="/choose-feature">
                    <Card className="h-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-500 transition-all cursor-pointer group">
                      <CardContent className="p-4 text-center">
                        <motion.div className="w-10 h-10 mx-auto mb-2 relative">
                          <svg viewBox="0 0 48 48" className="w-full h-full">
                            {/* Microphone body */}
                            <rect x="20" y="8" width="8" height="16" rx="4" fill="currentColor" className="text-green-400" />
                            {/* Mic stand */}
                            <line x1="24" y1="24" x2="24" y2="34" stroke="currentColor" strokeWidth="2" className="text-emerald-400" />
                            <line x1="18" y1="34" x2="30" y2="34" stroke="currentColor" strokeWidth="2" className="text-emerald-400" />
                            {/* Sound waves */}
                            <motion.path
                              d="M12 16 Q10 16 10 14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-green-300"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                            />
                            <motion.path
                              d="M36 16 Q38 16 38 14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-green-300"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                            />
                          </svg>
                        </motion.div>
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-green-400 transition-colors">
                          Podcast Clipper
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Best moments
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* Smart Clipper */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link href="/choose-feature">
                    <Card className="h-full bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30 hover:border-orange-500 transition-all cursor-pointer group">
                      <CardContent className="p-4 text-center">
                        <motion.div 
                          className="w-10 h-10 mx-auto mb-2 relative"
                          animate={{ rotate: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <svg viewBox="0 0 48 48" className="w-full h-full">
                            {/* Scissors */}
                            <circle cx="16" cy="12" r="4" fill="currentColor" className="text-orange-400" />
                            <circle cx="16" cy="36" r="4" fill="currentColor" className="text-orange-400" />
                            <path d="M16 12 L34 24 L16 36" stroke="currentColor" strokeWidth="2" fill="none" className="text-amber-400" />
                            {/* Film strip being cut */}
                            <motion.rect
                              x="30" y="22" width="12" height="4" rx="1"
                              fill="currentColor"
                              className="text-orange-300"
                              animate={{ x: [30, 34, 30] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </svg>
                        </motion.div>
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-orange-400 transition-colors">
                          Smart Clipper
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          AI clipping
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* Split Streamer */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link href="/choose-feature">
                    <Card className="h-full bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/30 hover:border-red-500 transition-all cursor-pointer group">
                      <CardContent className="p-4 text-center">
                        <motion.div className="w-10 h-10 mx-auto mb-2 relative">
                          <svg viewBox="0 0 48 48" className="w-full h-full">
                            {/* Video frame */}
                            <rect x="6" y="12" width="36" height="24" rx="2" fill="currentColor" className="text-red-400/30" />
                            {/* Left segment */}
                            <motion.rect
                              x="8" y="14" width="16" height="20" rx="1"
                              fill="currentColor"
                              className="text-red-400"
                              animate={{ opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                            />
                            {/* Right segment */}
                            <motion.rect
                              x="26" y="14" width="14" height="20" rx="1"
                              fill="currentColor"
                              className="text-rose-400"
                              animate={{ opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            />
                            {/* Split line */}
                            <motion.line
                              x1="24" y1="14" x2="24" y2="34"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray="2,2"
                              className="text-white"
                              animate={{ strokeDashoffset: [0, 4] }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                          </svg>
                        </motion.div>
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-red-400 transition-colors">
                          Split Streamer
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Split videos
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
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