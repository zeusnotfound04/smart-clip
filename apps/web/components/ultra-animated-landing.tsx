'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import AnimatedParticles from './animated-particles';
import MorphingShapes from './morphing-shapes';
import { TypingText, GlitchText, FloatingWords, CounterAnimation, WaveText } from './animated-text';
import { AnimatedButton, PulseButton, FloatingActionButton } from './animated-buttons';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  Rocket, 
  Zap, 
  VideoIcon, 
  Wand2, 
  Bot, 
  Play, 
  ArrowRight,
  Star,
  Heart,
  Code,
  Palette
} from 'lucide-react';
import Link from 'next/link';

const heroWords = ['CREATE', 'DESIGN', 'ANIMATE', 'INSPIRE', 'INNOVATE'];

export default function UltraAnimatedLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white overflow-hidden relative">
      
      {/* Multiple Background Layers */}
      <AnimatedParticles />
      <MorphingShapes />
      
      {/* Parallax Hero Section */}
      <motion.section 
        className="relative z-10 min-h-screen flex items-center justify-center px-4"
        style={{ y, opacity, scale }}
      >
        <div className="max-w-7xl mx-auto text-center relative">
          
          {/* Floating Words Background */}
          <FloatingWords 
            words={heroWords}
            className="absolute inset-0"
          />
          
          {/* Main Hero Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10"
          >
            
            {/* Animated Badge */}
            <motion.div
              className="mb-8"
              animate={{
                y: [-5, 5, -5],
                rotate: [0, 1, -1, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm">
                <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                <TypingText 
                  text="Next-Gen AI Video Creation Platform" 
                  speed={80}
                  className="text-purple-300 font-medium"
                />
              </div>
            </motion.div>

            {/* Main Title with Multiple Effects */}
            <div className="mb-8">
              <motion.h1 className="text-7xl md:text-9xl font-black mb-4">
                <motion.div
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ backgroundSize: "400% 400%" }}
                  className="bg-gradient-to-r from-purple-400 via-pink-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"
                >
                  <WaveText text="SMART" className="block" />
                </motion.div>
                
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotateX: [0, 180, 360],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-white"
                >
                  <GlitchText text="CLIP" className="block" intensity={2} />
                </motion.div>
              </motion.h1>
            </div>

            {/* Animated Subtitle */}
            <motion.div 
              className="text-2xl md:text-3xl text-gray-300 mb-12 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <TypingText 
                text="Transform your content creation with AI-powered video clipping, script generation, and automatic subtitles. Go viral in minutes, not hours."
                speed={50}
                delay={1000}
              />
            </motion.div>

            {/* CTA Buttons with Different Animations */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.8 }}
            >
              <Link href="/auth/signup">
                <AnimatedButton variant="liquid" className="text-xl px-12 py-6">
                  <Rocket className="w-6 h-6 mr-2" />
                  Launch Your Creativity
                  <ArrowRight className="w-6 h-6 ml-2" />
                </AnimatedButton>
              </Link>
              
              <Link href="/choose-feature">
                <PulseButton className="text-xl px-12 py-6">
                  <Play className="w-6 h-6 mr-2" />
                  Experience the Magic
                </PulseButton>
              </Link>
            </motion.div>

            {/* Stats Counter */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 1 }}
            >
              {[
                { icon: <VideoIcon />, value: 1000000, suffix: "+", label: "Videos Created" },
                { icon: <Star />, value: 50000, suffix: "+", label: "Happy Creators" },
                { icon: <Zap />, value: 99, suffix: "%", label: "Success Rate" },
                { icon: <Heart />, value: 4.9, suffix: "/5", label: "User Rating" },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center group"
                  whileHover={{ scale: 1.1 }}
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut",
                  }}
                >
                  <motion.div 
                    className="text-purple-400 mb-2 flex justify-center group-hover:text-pink-400 transition-colors"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    {stat.icon}
                  </motion.div>
                  <div className="text-4xl font-bold text-white mb-1">
                    <CounterAnimation 
                      target={stat.value} 
                      suffix={stat.suffix}
                      duration={2}
                    />
                  </div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-8 right-8 z-50">
          <FloatingActionButton 
            icon={<Code className="w-8 h-8" />}
            onClick={() => window.open('/choose-feature', '_blank')}
          />
        </div>
      </motion.section>

      {/* Features Showcase */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Header */}
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <WaveText 
              text="REVOLUTIONARY FEATURES" 
              className="text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"
            />
            <TypingText 
              text="Experience the future of content creation with our cutting-edge AI technology"
              className="text-2xl text-gray-300 max-w-3xl mx-auto"
              speed={60}
            />
          </motion.div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <VideoIcon className="w-12 h-12" />,
                title: "Smart Video Clipping",
                description: "AI analyzes your content and automatically creates viral-worthy clips",
                color: "from-purple-500 to-pink-500",
                delay: 0
              },
              {
                icon: <Wand2 className="w-12 h-12" />,
                title: "AI Script Generator",
                description: "Generate compelling scripts with natural voice synthesis",
                color: "from-blue-500 to-cyan-500",
                delay: 0.2
              },
              {
                icon: <Bot className="w-12 h-12" />,
                title: "Auto Subtitles",
                description: "Perfect subtitle generation with millisecond accuracy",
                color: "from-green-500 to-teal-500",
                delay: 0.4
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 100, rotateX: 45 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: feature.delay }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 10,
                  z: 50,
                }}
                className="group perspective-1000"
              >
                <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-purple-500/30 transition-all duration-500 overflow-hidden relative h-full">
                  <CardContent className="p-8 relative z-10">
                    
                    {/* Animated Icon */}
                    <motion.div 
                      className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${feature.color} p-4 mb-8 mx-auto text-white flex items-center justify-center`}
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.5,
                      }}
                    >
                      {feature.icon}
                    </motion.div>

                    {/* Title */}
                    <h3 className="text-3xl font-bold text-white mb-6 text-center group-hover:text-purple-300 transition-colors">
                      <GlitchText text={feature.title} intensity={1} />
                    </h3>

                    {/* Description */}
                    <TypingText 
                      text={feature.description}
                      className="text-gray-300 text-center leading-relaxed text-lg"
                      speed={30}
                    />
                    
                    {/* Background Gradient Animation */}
                    <motion.div 
                      className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-32 px-4">
        <motion.div 
          className="max-w-5xl mx-auto text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <h2 className="text-8xl font-black mb-8">
              <GlitchText 
                text="READY TO CREATE?" 
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                intensity={3}
              />
            </h2>
          </motion.div>
          
          <TypingText 
            text="Join the revolution and start creating viral content today"
            className="text-3xl text-gray-300 mb-16 max-w-3xl mx-auto"
            speed={80}
          />

          <Link href="/auth/signup">
            <AnimatedButton variant="glow" className="text-2xl px-16 py-8">
              <Palette className="w-8 h-8 mr-3" />
              Start Creating Magic
              <Sparkles className="w-8 h-8 ml-3" />
            </AnimatedButton>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}