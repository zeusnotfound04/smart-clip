"use client"

import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import VideoCreationVisualizer from "@/components/video-creation-visualizer"
import { useEffect } from "react"

interface HeroSectionProps {
  scrollY: number
}

export default function HeroSection({ scrollY }: HeroSectionProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(count, 10000, {
      duration: 2,
      ease: "easeOut"
    })

    return controls.stop
  }, [count])

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-12 px-6 overflow-hidden">
      {/* Subtle animated background */}
      <motion.div style={{ y: scrollY * 0.3 }} className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
      </motion.div>

      <div className="max-w-5xl mx-auto relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            Trusted by <motion.span>{rounded}</motion.span>+ clippers
          </div>
        </motion.div>

        {/* Hero Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Turn videos into viral clips
            <br />
            <span className="text-blue-600">automatically</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Stop paying editors. Stop waiting for clips. SmartClip turns your streams into ready-to-post content while you sleep.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-4 justify-center flex-wrap mb-16"
        >
          <Link href="/auth/signup">
            <Button className="bg-blue-600 text-white hover:bg-blue-700 text-lg px-10 py-6 rounded-lg font-semibold shadow-sm">
              Start making viral content
            </Button>
          </Link>
        </motion.div>

        {/* Value Props */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto"
        >
          <div className="grid md:grid-cols-2 gap-6 text-center md:text-left">
            {[
              "No more paying editors",
              "No more waiting for clips",
              "No manual uploading",
              "No missed posting times"
            ].map((text, i) => (
              <div key={i} className="flex items-start justify-center md:justify-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How It Works Animation */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20"
        >
          <VideoCreationVisualizer />
        </motion.div>

        {/* Why Clippers Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 text-center"
        >
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-8">
            Why clippers trust SmartClips
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">15 min</div>
              <div className="text-gray-600">Average clip turnaround</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">98%</div>
              <div className="text-gray-600">Clippers post daily</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">$0</div>
              <div className="text-gray-600">Per editor payment</div>
            </div>
          </div>
        </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
