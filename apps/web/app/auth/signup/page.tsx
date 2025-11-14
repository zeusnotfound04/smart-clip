'use client';

import { motion } from 'framer-motion';
import { Sparkles, Video, Scissors, FileText, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { SignUpForm } from '@/components/auth/signup-form';
import { fadeInUp, scaleIn } from '@/lib/utils';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div 
        className="absolute inset-0 opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 2 }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-linear-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-linear-to-r from-yellow-300 to-red-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-linear-to-r from-blue-300 to-green-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000" />
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
          <p className="text-muted-foreground">AI-powered video editing platform</p>
        </motion.div>

        <SignUpForm />

        <motion.div 
          className="mt-8 grid grid-cols-2 gap-4 text-center"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.8 }}
        >
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/80 transition-all duration-300">
            <Video className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <div className="text-sm font-medium">Auto Subtitles</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/80 transition-all duration-300">
            <Scissors className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-sm font-medium">Smart Clipper</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/80 transition-all duration-300">
            <FileText className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <div className="text-sm font-medium">AI Scripts</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/80 transition-all duration-300">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-cyan-600" />
            <div className="text-sm font-medium">Fake Chats</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
