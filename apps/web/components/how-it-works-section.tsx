"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, Sparkles, Scissors, Download, Zap, ArrowRight, Video, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const steps = [
  {
    id: 1,
    icon: Upload,
    title: "Upload Your Video",
    description: "Simply drag and drop your video file or paste a YouTube link. We support all popular formats - MP4, MOV, AVI, and more. No technical setup needed!",
    detail: "Works with videos up to 2 hours long",
  },
  {
    id: 2,
    icon: Sparkles,
    title: "AI Analyzes Your Content",
    description: "Our smart AI watches your entire video and automatically identifies the most engaging moments, funny clips, and shareable highlights - just like a professional editor would.",
    detail: "Detects emotions, key moments & viral potential",
  },
  {
    id: 3,
    icon: Scissors,
    title: "Get Perfect Clips",
    description: "Receive multiple ready-to-share clips, each perfectly trimmed with auto-generated captions, trending music, and eye-catching effects. No editing skills required!",
    detail: "Clips optimized for TikTok, Reels & Shorts",
  },
  {
    id: 4,
    icon: Download,
    title: "Download & Go Viral",
    description: "Download your clips in the perfect format and resolution for any platform. Each clip is ready to upload and start getting views immediately!",
    detail: "One-click export in multiple formats",
  },
]

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <section id="how-it-works" className="relative py-24 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-cyan-400 text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            Simple Process
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            From Long Video to Viral Clips
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI does the heavy lifting so you can focus on creating amazing content. Here's how it works:
          </p>
        </motion.div>

        {/* Visual Process Flow */}
        <div className="relative max-w-6xl mx-auto mb-16">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20" />
          
          {/* Steps */}
          <div className="grid lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = activeStep === index
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                  onMouseEnter={() => setActiveStep(index)}
                  className="relative"
                >
                  {/* Card */}
                  <div className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-300 h-full flex flex-col
                    ${isActive 
                      ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-500 shadow-xl shadow-blue-500/20' 
                      : 'bg-card border-border hover:border-blue-500/50 hover:shadow-lg'
                    }
                  `}>
                    {/* Step Number Badge */}
                    <motion.div
                      className={`
                        absolute -top-4 left-6 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-10
                        ${isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-2 border-border'
                        }
                      `}
                      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {step.id}
                    </motion.div>

                    {/* Icon Circle */}
                    <motion.div
                      className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto
                        ${isActive 
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg' 
                          : 'bg-blue-500/10'
                        }
                      `}
                      animate={isActive ? { 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      } : {}}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-blue-600 dark:text-cyan-400'}`} />
                    </motion.div>

                    {/* Content */}
                    <div className="text-center flex-grow">
                      <h3 className={`text-lg font-bold mb-3 ${isActive ? 'text-blue-600 dark:text-cyan-400' : ''}`}>
                        {step.title}
                      </h3>
                      <p className={`text-sm leading-relaxed mb-4 ${isActive ? 'text-gray-700 dark:text-gray-300' : 'text-muted-foreground'}`}>
                        {step.description}
                      </p>
                      
                      {/* Detail Badge */}
                      <div className={`
                        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                        ${isActive 
                          ? 'bg-blue-500/10 text-blue-700 dark:text-cyan-400' 
                          : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        <Video className="w-3 h-3" />
                        {step.detail}
                      </div>
                    </div>

                    {/* Arrow Indicator (not last) */}
                    {index < steps.length - 1 && (
                      <motion.div 
                        className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-20"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className={`w-6 h-6 ${isActive ? 'text-blue-500' : 'text-gray-300 dark:text-gray-700'}`} />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-2xl p-8 max-w-3xl mx-auto mb-8">
            <Wand2 className="w-12 h-12 text-blue-600 dark:text-cyan-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">No Editing Experience Needed</h3>
            <p className="text-muted-foreground mb-6">
              Our AI handles everything - from finding the best moments to adding captions and effects. 
              You just upload and let the magic happen!
            </p>
            <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
              Try It Free Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Average processing time: 2-5 minutes • 90% accuracy in finding viral moments
          </p>
        </motion.div>
      </div>
    </section>
  )
}
