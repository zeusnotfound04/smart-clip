'use client';

import { motion } from 'framer-motion';
import { Sparkles, Video, Scissors, FileText, MessageCircle, Zap } from 'lucide-react';
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
            <Zap className="w-8 h-8 text-foreground" />
            SmartClips
          </div>
          <p className="text-muted-foreground">AI-powered video editing platform</p>
        </motion.div>

        <SignUpForm />


      </motion.div>
    </div>
  );
}
