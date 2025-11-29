"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import VideoCreationVisualizer from "@/components/video-creation-visualizer"

interface HeroSectionProps {
  scrollY: number
}

export default function HeroSection({ scrollY }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-12 px-6 overflow-hidden">
      <motion.div style={{ y: scrollY * 0.3 }} className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl" />
      </motion.div>

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 inline-block"
          >
            <div className="px-4 py-2 rounded-full border border-border text-muted-foreground text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              AI-Powered Video Creation Platform
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 leading-[0.95] tracking-tight text-balance"
          >
            Create Viral Short-Form Content
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed"
          >
            Transform hours of footage into multiple viral clips in minutes. Auto-captions, smart editing, and
            AI-powered highlights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex gap-4 justify-center flex-wrap"
          >
            <Button className="bg-foreground text-background hover:bg-foreground/90 text-base px-8 py-6 rounded-full font-medium">
              Start Creating Free
            </Button>
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted/50 text-base px-8 py-6 rounded-full bg-transparent"
            >
              Watch Demo
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20"
        >
          <VideoCreationVisualizer />
        </motion.div>
      </div>
    </section>
  )
}
