'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Scissors, 
  FileText, 
  MessageCircle, 
  Subtitles, 
  CheckCircle,
  FileVideo,
  Sparkles
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
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
    href: '/dashboard/ai-script-generator',
    gradient: 'from-orange-500 to-red-500'
  },

];

function ChooseFeaturePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [createProjectLoading, setCreateProjectLoading] = useState(false);

  // No video required - feature selection first
  const handleFeatureSelect = async (feature: any) => {
    try {
      setCreateProjectLoading(true);
      // Navigate directly to the feature page - video upload will happen there
      router.push(feature.href);
      
    } catch (error: any) {
      console.error('Failed to navigate to feature:', error);
    } finally {
      setCreateProjectLoading(false);
    }
  };

  return (
    <>
      {/* Light Rays Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <LightRays
          raysOrigin="top-center"
          raysColor="#3b82f6"
          raysSpeed={0.9}
          lightSpread={0.9}
          rayLength={4}
          pulsating={true}
          fadeDistance={1.2}
          saturation={0.9}
          followMouse={true}
          mouseInfluence={0.2}
          noiseAmount={0.05}
          distortion={0.1}
          className="opacity-80"
        />
      </div>

      <div className="min-h-screen bg-background/20 text-foreground relative z-10 flex flex-col">
        {/* Header */}
        <header className="text-center py-14 px-4">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
              Choose Your Feature
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select an AI feature to process your video and create amazing content
            </p>
          </motion.div>
        </header>

       



        {/* Features Grid */}
        <main className="flex-1 px-4 pb-12">
          <div className="max-w-7xl mx-auto">
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {coreFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + 0.1 * index }}
                    whileHover={{ scale: 1.03, y: -8 }}
                    whileTap={{ scale: 0.97 }}
                    className="cursor-pointer"
                    onClick={() => !createProjectLoading && handleFeatureSelect(feature)}
                    onHoverStart={() => setHoveredFeature(feature.id)}
                    onHoverEnd={() => setHoveredFeature(null)}
                  >
                    <Card className={`h-full hover:shadow-2xl transition-all duration-500 border-2 hover:border-white/40 group relative overflow-hidden bg-background/70 backdrop-blur-sm ${
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
                        {/* {feature.isNew && (
                          <motion.div
                            className="absolute -top-2 -right-2 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            NEW
                          </motion.div>
                        )} */}
                        <motion.div 
                          className={`w-24 h-24 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative shadow-lg mx-auto`}
                          whileHover={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          <feature.icon className="w-12 h-12 text-white" />
                          
                          {/* Sparkle effects on hover */}
                          <AnimatePresence>
                            {hoveredFeature === feature.id && (
                              <motion.div
                                className="absolute inset-0 rounded-2xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                {[...Array(6)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-white rounded-full"
                                    initial={{ scale: 0, x: 48, y: 48 }}
                                    animate={{
                                      scale: [0, 1, 0],
                                      x: 48 + (Math.random() - 0.5) * 80,
                                      y: 48 + (Math.random() - 0.5) * 80,
                                    }}
                                    transition={{
                                      duration: 2,
                                      delay: i * 0.2,
                                      repeat: Infinity,
                                    }}
                                  />
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                        
                        <CardTitle className="text-2xl text-center group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-500 mb-3">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="group-hover:text-gray-300 transition-colors text-base leading-relaxed text-center">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="relative z-10 pb-8">
                        <Button 
                          variant="ghost" 
                          size="lg"
                          className="w-full group-hover:bg-white/20 transition-all duration-500 relative overflow-hidden text-lg py-6 font-semibold border border-white/10 group-hover:border-white/30"
                          disabled={createProjectLoading}
                        >
                          <motion.span
                            className="relative z-10 flex items-center justify-center gap-2"
                            animate={{ opacity: createProjectLoading ? 0 : 1 }}
                          >
                            <CheckCircle className="w-5 h-5" />
                            Select Feature
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