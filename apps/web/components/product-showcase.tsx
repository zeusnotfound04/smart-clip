"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

const features = [
  {
    title: "Auto Subtitles",
    description: "AI-generated captions sync perfectly with your audio",
    icon: "▶",
    color: "from-blue-400 to-blue-600",
  },
  {
    title: "Split Streamer",
    description: "Combine face-cam and gameplay in vertical format",
    icon: "⊞",
    color: "from-cyan-400 to-blue-500",
  },
  {
    title: "Smart Clipper",
    description: "Extract the best moments automatically",
    icon: "✂",
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Script Generator",
    description: "Create engaging narration scripts instantly",
    icon: "📝",
    color: "from-indigo-400 to-blue-500",
  },
]

export default function ProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mt-12 mb-16">
      <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
        {/* Animated showcase area */}
        <motion.div
          className="relative h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur-xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: index === activeIndex ? 1 : 0,
                scale: index === activeIndex ? 1 : 0.8,
              }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center px-8">
                {/* Animated circle background */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-4xl shadow-2xl`}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>

              {/* Animated gradient border effect */}
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 40px rgba(59, 130, 246, 0.3)",
                    "0 0 80px rgba(59, 130, 246, 0.5)",
                    "0 0 40px rgba(59, 130, 246, 0.3)",
                  ],
                }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
              />
            </motion.div>
          ))}

          {/* Animated corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accent/50 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-accent/50 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-accent/50 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accent/50 rounded-br-lg" />
        </motion.div>

        {/* Feature cards */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <motion.button
              key={feature.title}
              onClick={() => setActiveIndex(index)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                index === activeIndex
                  ? "bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-accent/50 shadow-lg shadow-accent/20"
                  : "bg-card/30 border border-border hover:border-accent/30"
              }`}
              whileHover={{ x: 8 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: index === activeIndex ? 1.2 : 1 }}
                  className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-xl flex-shrink-0`}
                >
                  {feature.icon}
                </motion.div>
                <div>
                  <h4 className="font-semibold text-foreground">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <motion.div className="flex gap-2 justify-center mt-8">
        {features.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => setActiveIndex(index)}
            animate={{
              width: index === activeIndex ? 32 : 8,
              backgroundColor: index === activeIndex ? "rgb(59, 130, 246)" : "rgb(100, 116, 139)",
            }}
            className="h-2 rounded-full transition-all"
          />
        ))}
      </motion.div>
    </div>
  )
}
