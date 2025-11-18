'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Subtitles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface AppHeaderProps {
  title: string;
  description: string;
  backUrl?: string;
  icon?: React.ReactNode;
}

export function AppHeader({ 
  title, 
  description, 
  backUrl = '/choose-feature',
  icon = <Subtitles className="w-6 h-6 text-white" />
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center gap-4 border-b p-4 bg-background/95 backdrop-blur-sm">
      <SidebarTrigger />
      <Button
        variant="ghost"
        onClick={() => router.push(backUrl)}
        className="gap-2 hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Features
      </Button>
      <div className="flex-1">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">
              {description}
            </p>
          </div>
        </motion.div>
      </div>
    </header>
  );
}