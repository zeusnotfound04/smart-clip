'use client';

import { motion } from 'framer-motion';
import { Sparkles, Video, Scissors, FileText, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { SignUpForm } from '@/components/auth/signup-form';
import { fadeInUp, scaleIn } from '@/lib/utils';

export default function SignUpPage() {
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
            <Sparkles className="w-8 h-8 text-foreground" />
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
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 border border-border hover:bg-card/80 transition-all duration-300">
            <Video className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">Auto Subtitles</div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 border border-border hover:bg-card/80 transition-all duration-300">
            <Scissors className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">Smart Clipper</div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 border border-border hover:bg-card/80 transition-all duration-300">
            <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">AI Scripts</div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 border border-border hover:bg-card/80 transition-all duration-300">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">Fake Chats</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
