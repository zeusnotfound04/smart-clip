"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { Upload, Sparkles, Wand2, Download, PlayCircle, Zap, Stars, Rocket } from "lucide-react"

const steps = [
  {
    id: 1,
    icon: Upload,
    title: "Upload Your Video",
    description: "Drop any video format - we handle the rest. YouTube links, local files, streams - all supported!",
    color: "from-blue-500 to-cyan-500",
    delay: 0,
  },
  {
    id: 2,
    icon: Sparkles,
    title: "AI Magic Happens",
    description: "Our AI analyzes every frame, detects highlights, viral moments, and perfect cuts automatically.",
    color: "from-purple-500 to-pink-500",
    delay: 0.2,
  },
  {
    id: 3,
    icon: Wand2,
    title: "Customize Everything",
    description: "Add subtitles, effects, transitions. Use drag-and-drop editor or let AI do it for you.",
    color: "from-orange-500 to-red-500",
    delay: 0.4,
  },
  {
    id: 4,
    icon: Download,
    title: "Export & Share",
    description: "Download in any format optimized for TikTok, Reels, Shorts. One-click posting coming soon!",
    color: "from-green-500 to-emerald-500",
    delay: 0.6,
  },
]

export default function HowItWorksSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 })
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [isInView])

  return (
    <section id="how-it-works" ref={sectionRef} className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Crazy Background Animations */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 -left-40 w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [360, 180, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 -right-40 w-96 h-96 bg-gradient-to-r from-pink-500/30 to-orange-500/30 rounded-full blur-3xl"
        />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 100 - 50, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with crazy animation */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-6"
          >
            <Zap className="w-16 h-16 text-yellow-400" />
          </motion.div>
          
          <motion.h2 
            className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{ backgroundSize: "200% auto" }}
          >
            How It Works
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Transform your content into viral clips in 4 simple steps
          </motion.p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = activeStep === index
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: step.delay, duration: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -10 }}
                className="relative group cursor-pointer"
                onMouseEnter={() => setActiveStep(index)}
              >
                {/* Card */}
                <div className={`
                  relative p-8 rounded-3xl border-2 transition-all duration-500
                  ${isActive 
                    ? 'bg-gradient-to-br ' + step.color + ' border-transparent shadow-2xl shadow-white/20' 
                    : 'bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:border-gray-600'
                  }
                `}>
                  {/* Step number with animation */}
                  <motion.div
                    className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-gray-900 shadow-lg"
                    animate={isActive ? {
                      rotate: [0, 360],
                      scale: [1, 1.2, 1],
                    } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    {step.id}
                  </motion.div>

                  {/* Icon with crazy animation */}
                  <motion.div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                      isActive ? 'bg-white/20' : 'bg-gray-700'
                    }`}
                    animate={isActive ? {
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{ duration: 0.5, repeat: isActive ? Infinity : 0, repeatDelay: 1 }}
                  >
                    <Icon className={`w-8 h-8 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  </motion.div>

                  {/* Content */}
                  <h3 className={`text-2xl font-bold mb-3 ${isActive ? 'text-white' : 'text-gray-200'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isActive ? 'text-white/90' : 'text-gray-400'}`}>
                    {step.description}
                  </p>

                  {/* Animated glow effect */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-3xl"
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(255,255,255,0.3)',
                          '0 0 40px rgba(255,255,255,0.5)',
                          '0 0 20px rgba(255,255,255,0.3)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Arrow connector (desktop only) */}
                {index < steps.length - 1 && (
                  <motion.div
                    className="hidden lg:block absolute top-1/2 -right-4 z-20"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="w-8 h-0.5 bg-gradient-to-r from-gray-600 to-transparent" />
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full text-white font-semibold text-lg shadow-2xl"
          >
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Rocket className="w-6 h-6" />
            </motion.span>
            Start Creating Now
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              →
            </motion.span>
            
            {/* Animated ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/50"
              animate={{ scale: [1, 1.2], opacity: [1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
