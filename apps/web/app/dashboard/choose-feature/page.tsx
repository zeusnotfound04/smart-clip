'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Scissors, 
  FileText, 
  MessageCircle, 
  Subtitles, 
  ArrowLeft,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { SidebarTrigger } from '@/components/ui/sidebar';
// apiClient will be used in individual feature pages
import LightRays from '@/components/LightRays';

const coreFeatures = [
  {
    id: 'auto-subtitles',
    title: 'Auto Subtitles',
    description: 'Generate accurate subtitles using AI speech recognition',
    icon: Subtitles,
    href: '/dashboard/auto-subtitles',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'split-streamer',
    title: 'Split Streamer',
    description: 'Split long videos into multiple clips automatically',
    icon: Video,
    href: '/dashboard/features/split-streamer',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 'smart-clipper',
    title: 'Smart Clipper',
    description: 'Extract highlights and key moments using AI',
    icon: Scissors,
    href: '/dashboard/features/smart-clipper',
    gradient: 'from-green-500 to-teal-500'
  },
  {
    id: 'script-generator',
    title: 'Script Generator',
    description: 'Create engaging scripts for your videos',
    icon: FileText,
    href: '/dashboard/features/script-generator',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    id: 'fake-conversations',
    title: 'Fake Conversations',
    description: 'Generate realistic chat conversations',
    icon: MessageCircle,
    href: '/dashboard/fake-conversations',
    gradient: 'from-indigo-500 to-purple-500'
  }
];

function ChooseFeaturePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const handleFeatureSelect = async (feature: any) => {
    try {
      setCreateProjectLoading(true);
      
      // Navigate directly to the feature page - video upload will happen there
      router.push(feature.href);
      
    } catch (error: any) {
    } finally {
      setCreateProjectLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  return (
    <>
      {/* Light Rays Background */}
      <div className="fixed inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#3b82f6"
          raysSpeed={0.8}
          lightSpread={1.5}
          rayLength={3}
          pulsating={true}
          fadeDistance={0.8}
          saturation={0.7}
          followMouse={true}
          mouseInfluence={0.15}
          noiseAmount={0.1}
          distortion={0.2}
          className="opacity-30"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-screen bg-background/95 backdrop-blur-md text-foreground relative z-10">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-white/20 p-4 bg-background/80 backdrop-blur-md">
          <SidebarTrigger />
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="gap-2 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold"
            >
              Choose Your Feature
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm"
            >
              Select an AI feature to process your video
            </motion.p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Feature Selection Info */}
            <motion.section
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="bg-background/95 backdrop-blur-md border border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">Choose Your AI Feature</h3>
                      <p className="text-purple-400 font-medium">Select the perfect AI tool for your project</p>
                      <p className="text-sm text-muted-foreground">
                        Upload and process your video on the feature page
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500 flex items-center justify-center"
                    >
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>



            {/* Features Grid */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold mb-4">AI Features</h2>
                <p className="text-muted-foreground text-lg">
                  Choose from our powerful AI tools to transform your video
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {coreFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    whileHover={{ scale: 1.03, y: -8 }}
                    whileTap={{ scale: 0.97 }}
                    className="cursor-pointer"
                    onClick={() => !createProjectLoading && handleFeatureSelect(feature)}
                    onHoverStart={() => setHoveredFeature(feature.id)}
                    onHoverEnd={() => setHoveredFeature(null)}
                  >
                    <Card className={`h-full hover:shadow-2xl transition-all duration-500 border-2 hover:border-white/30 group relative overflow-hidden bg-background/95 backdrop-blur-md ${
                      createProjectLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}>
                      {/* Gradient background overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                      
                      {/* Animated border effect */}
                      <motion.div
                        className={`absolute inset-0 rounded-lg border-2 ${feature.gradient.includes('blue') ? 'border-blue-500/50' : 
                          feature.gradient.includes('purple') ? 'border-purple-500/50' : 
                          feature.gradient.includes('green') ? 'border-green-500/50' : 
                          feature.gradient.includes('orange') ? 'border-orange-500/50' : 'border-indigo-500/50'}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: hoveredFeature === feature.id ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      
                      <CardHeader className="pb-4 relative z-10">
                        <motion.div 
                          className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative shadow-lg`}
                          whileHover={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          <feature.icon className="w-10 h-10 text-white" />
                          
                          {/* Sparkle effects on hover */}
                          <AnimatePresence>
                            {hoveredFeature === feature.id && (
                              <motion.div
                                className="absolute inset-0 rounded-2xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                {[...Array(5)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className="absolute w-1.5 h-1.5 bg-white rounded-full"
                                    initial={{ scale: 0, x: 40, y: 40 }}
                                    animate={{
                                      scale: [0, 1, 0],
                                      x: 40 + (Math.random() - 0.5) * 60,
                                      y: 40 + (Math.random() - 0.5) * 60,
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      delay: i * 0.2,
                                      repeat: Infinity,
                                    }}
                                  />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                        
                        <CardTitle className="text-2xl group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-500 mb-3">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="group-hover:text-gray-300 transition-colors text-base leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="relative z-10">
                        <Button 
                          variant="ghost" 
                          size="lg"
                          className="w-full group-hover:bg-white/20 transition-all duration-500 relative overflow-hidden text-lg py-6 font-semibold border border-white/10 group-hover:border-white/30"
                          disabled={createProjectLoading}
                        >
                          <motion.span
                            className="relative z-10 flex items-center gap-2"
                            animate={{ opacity: createProjectLoading ? 0 : 1 }}
                          >
                            <CheckCircle className="w-5 h-5" />
                            Choose This Feature
                          </motion.span>
                          
                          {createProjectLoading && (
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <motion.div
                                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                            </motion.div>
                          )}
                          
                          {/* Shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: hoveredFeature === feature.id ? '100%' : '-100%' }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                          />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </main>
      </div>
    </>
  );
}

export default function ChooseFeaturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ChooseFeaturePageContent />
    </Suspense>
  );
}