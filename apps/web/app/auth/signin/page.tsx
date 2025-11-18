'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Video, Scissors } from 'lucide-react';
import Link from 'next/link';
import { SignInForm } from '@/components/auth/signin-form';
import { fadeInUp, scaleIn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">


      <motion.div 
        className="w-full max-w-md relative z-10"
        variants={scaleIn}
        initial="initial"
        animate="animate"
      >
        {/* Logo/Brand */}
        <motion.div 
          className="text-center mb-8"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 text-2xl font-bold mb-2">
            <Zap className="w-8 h-8 text-foreground" />
            SmartClips
          </div>
          <p className="text-muted-foreground">Welcome back to the future of video editing</p>
        </motion.div>

        <Suspense fallback={<div className="flex justify-center"><Spinner className="size-8" /></div>}>
          <SignInForm />
        </Suspense>

        <motion.div 
          className="mt-8 text-center"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.8 }}
        >
          <p className="text-sm text-muted-foreground mb-4">
            Join creators using AI to transform their content
          </p>
          <div className="flex justify-center items-center gap-6 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Zap className="w-3 h-3 text-muted-foreground" />
              AI-Powered
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Video className="w-3 h-3 text-muted-foreground" />
              Auto Subtitles
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Scissors className="w-3 h-3 text-muted-foreground" />
              Smart Clips
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
