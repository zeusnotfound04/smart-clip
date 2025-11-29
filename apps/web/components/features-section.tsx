"use client"

import { motion } from "framer-motion"

const features = [
  {
    title: "Auto Subtitles",
    description:
      "AI-generated captions that sync perfectly with your audio. Reach 80% of viewers who watch without sound.",
  },
  {
    title: "Split Streamer",
    description: "Combine face-cam and gameplay in vertical format optimized for TikTok and Reels.",
  },
  {
    title: "Smart Clipper",
    description: "AI finds and extracts the most engaging moments. Remove dull parts automatically.",
  },
  {
    title: "Script Generator",
    description: "Generate engaging narration scripts instantly. Perfect hooks and conclusions for any topic.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">Everything you need</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            A complete AI toolkit for creating viral short-form content
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="group relative p-8 md:p-10 rounded-2xl border border-border bg-card/30 backdrop-blur-sm hover:bg-card/50 hover:border-foreground/20 transition-all duration-500"
            >
              {/* Subtle number indicator */}
              <span className="absolute top-6 right-6 text-6xl font-bold text-foreground/5 group-hover:text-foreground/10 transition-colors duration-500">
                0{index + 1}
              </span>

              <div className="relative">
                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-foreground transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/70 transition-colors">
                  {feature.description}
                </p>

                {/* Animated underline on hover */}
                <motion.div
                  className="mt-6 h-px bg-gradient-to-r from-foreground/30 to-transparent"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                  style={{ transformOrigin: "left" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
