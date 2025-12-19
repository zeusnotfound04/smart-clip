"use client"

import { motion } from "framer-motion"
import { Calendar, Instagram, Zap, Video } from "lucide-react"

const features = [
  {
    icon: Video,
    title: "AI Clip Detection",
    description: "Automatically finds your best moments from hours of footage. No manual scrubbing required.",
  },
  {
    icon: Zap,
    title: "Viral Subtitles",
    description: "Auto-generated captions with viral fonts and colors. Ready for TikTok, Reels, and Shorts.",
  },
  {
    icon: Calendar,
    title: "Auto Scheduler",
    description: "Set it once, post forever. Schedule clips to go out while you stream or sleep.",
  },
  {
    icon: Instagram,
    title: "Direct Platform Upload",
    description: "Connect Instagram, TikTok, and YouTube. Clips post directly—no downloading or manual uploads.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Built for clippers, not generic creators
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to run a hands-off clipping workflow
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className="group p-8 rounded-xl bg-white border border-gray-200 hover:border-blue-600 hover:shadow-lg transition-all duration-500"
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <motion.div 
                  className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Icon className="w-6 h-6 text-blue-600" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Hands-off workflow highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="mt-20 p-10 rounded-2xl bg-blue-600 text-white text-center"
        >
          <h3 className="text-3xl font-bold mb-4">
            Hands-off workflow
          </h3>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Stream → AI clips → Auto-schedule → Post to Instagram/TikTok → Repeat
          </p>
          <p className="text-lg text-blue-200 mt-4">
            Zero manual work after setup
          </p>
        </motion.div>
      </div>
    </section>
  )
}
