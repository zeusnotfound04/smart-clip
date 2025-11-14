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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div 
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 3 }}
      >
        <div className="absolute top-1/3 left-1/5 w-72 h-72 bg-linear-to-r from-blue-300 to-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-float" />
        <div className="absolute bottom-1/3 right-1/5 w-72 h-72 bg-linear-to-r from-pink-300 to-orange-300 rounded-full mix-blend-multiply filter blur-xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-linear-to-r from-cyan-300 to-teal-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
      </motion.div>

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
          <div className="inline-flex items-center gap-2 text-2xl font-bold gradient-text mb-2">
            <Sparkles className="w-8 h-8 text-indigo-600" />
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
              <Zap className="w-3 h-3 text-yellow-500" />
              AI-Powered
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Video className="w-3 h-3 text-blue-500" />
              Auto Subtitles
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Scissors className="w-3 h-3 text-green-500" />
              Smart Clips
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
