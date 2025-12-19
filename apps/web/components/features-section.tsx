"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import {
  Calendar,
  Instagram,
  Zap,
  Video,
  Sparkles,
  Upload,
  TrendingUp,
  Scissors,
  Wand2,
  Subtitles,
  Split,
} from "lucide-react"
import { useRef, useState } from "react"

const features = [
  {
    icon: Video,
    title: "AI Clip Detection",
    description: "Automatically finds your best moments from hours of footage. No manual scrubbing required.",
    gradient: "from-violet-400 via-purple-500 to-indigo-500",
    glowColor: "violet",
  },
  {
    icon: Zap,
    title: "Viral Subtitles",
    description: "Auto-generated captions with viral fonts and colors. Ready for TikTok, Reels, and Shorts.",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    glowColor: "orange",
  },
  {
    icon: Calendar,
    title: "Auto Scheduler",
    description: "Set it once, post forever. Schedule clips to go out while you stream or sleep.",
    gradient: "from-cyan-400 via-sky-500 to-blue-600",
    glowColor: "cyan",
  },
  {
    icon: Instagram,
    title: "Direct Platform Upload",
    description: "Connect Instagram, TikTok, and YouTube. Clips post directly—no downloading or manual uploads.",
    gradient: "from-pink-400 via-rose-500 to-red-500",
    glowColor: "pink",
  },
]

const glowColors = {
  violet: "rgba(139, 92, 246, 0.4)",
  orange: "rgba(251, 146, 60, 0.4)",
  cyan: "rgba(34, 211, 238, 0.4)",
  pink: "rgba(236, 72, 153, 0.4)",
}

const clippingTools = [
  {
    icon: Scissors,
    name: "Smart Clipper",
    description: "Converts long format video into viral shorts",
    color: "from-blue-400 to-cyan-500",
  },
  {
    icon: Wand2,
    name: "AI Clip Generator",
    description: "Script → Audio → Gameplay → Viral short",
    color: "from-violet-400 to-purple-500",
  },
  {
    icon: Subtitles,
    name: "Auto Subtitle",
    description: "Generates subtitles from your video",
    color: "from-pink-400 to-rose-500",
  },
  {
    icon: Split,
    name: "Stream Splitter",
    description: "Video + gameplay attached below",
    color: "from-amber-400 to-orange-500",
  },
]

export default function FeaturesSection() {
  const [workflowStep, setWorkflowStep] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [100, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative py-32 px-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          style={{ y }}
          className="absolute top-20 -left-40 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [-100, 100]) }}
          className="absolute bottom-20 -right-40 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-600">Powered by AI</span>
          </motion.div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 text-balance">
            Built for clippers and{" "}
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              content creators
            </span>
          </h2>

          <div className="text-xl md:text-2xl lg:text-3xl font-medium max-w-3xl mx-auto text-balance">
            {["Everything", "you", "need", "to", "make", "your", "next", "viral", "video."].map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                viewport={{ once: true }}
                className={`inline-block mr-2 ${
                  word === "viral"
                    ? "bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold"
                    : "text-gray-700"
                }`}
              >
                {word}
              </motion.span>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mt-20">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
                viewport={{ once: true }}
                className="group relative"
              >
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full"
                >
                  <motion.div
                    className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${glowColors[feature.glowColor as keyof typeof glowColors]}, transparent 70%)`,
                    }}
                  />

                  <div className="relative h-full p-8 lg:p-10 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200/50 overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow duration-500">
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700`}
                    />

                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, 5, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: index * 0.2,
                      }}
                      className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.gradient} opacity-20 rounded-full blur-3xl`}
                    />

                    <div className="relative z-10">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className="relative inline-flex mb-6"
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500`}
                        />
                        <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                      </motion.div>

                      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 text-balance">
                        {feature.title}
                      </h3>

                      <p className="text-gray-600 text-lg leading-relaxed text-pretty">{feature.description}</p>

                      <motion.div
                        initial={{ x: 0, opacity: 0 }}
                        whileHover={{ x: 5, opacity: 1 }}
                        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent"
                      >
                        Learn more
                        <motion.span
                          animate={{ x: [0, 4, 0] }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        >
                          →
                        </motion.span>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          onViewportEnter={() => {
            const interval = setInterval(() => {
              setWorkflowStep((prev) => (prev + 1) % 3)
            }, 4000)
            return () => clearInterval(interval)
          }}
          className="mt-24 relative group"
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />

            <div className="relative p-12 lg:p-16 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white overflow-hidden shadow-2xl">
              {/* Simplified static gradient background */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.3),transparent_50%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_70%_60%,rgba(139,92,246,0.3),transparent_50%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_80%,rgba(59,130,246,0.2),transparent_50%)]" />
              </div>

              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />

              <div className="relative z-10">
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="text-4xl lg:text-5xl font-bold mb-4 text-balance"
                >
                  Simple workflow to go viral
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="text-lg lg:text-xl text-white/90 mb-12 text-balance"
                >
                  Three steps to transform your content
                </motion.p>

                <div className="grid md:grid-cols-3 gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="relative p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden">
                      <div className="relative w-20 h-20 mx-auto mb-4">
                        <motion.div
                          animate={
                            workflowStep === 0
                              ? {
                                  scale: [1, 1.1, 1],
                                  opacity: [0.5, 0.8, 0.5],
                                }
                              : {}
                          }
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                          className="absolute inset-0 border-4 border-dashed border-cyan-400 rounded-2xl"
                        />

                        {workflowStep === 0 && (
                          <motion.div
                            initial={{ y: -30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div className="w-10 h-12 bg-gradient-to-b from-cyan-300 to-blue-400 rounded-lg shadow-lg flex items-center justify-center">
                              <Video className="w-5 h-5 text-white" />
                            </div>
                          </motion.div>
                        )}

                        {workflowStep !== 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-cyan-400" />
                          </div>
                        )}
                      </div>

                      <div className="text-center">
                        <h4 className="text-xl font-bold mb-2">Upload Video</h4>
                        <p className="text-white/80 text-sm">Drop your content</p>
                      </div>

                      {workflowStep === 0 && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 4, ease: "easeInOut" }}
                          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 origin-left"
                        />
                      )}
                    </div>

                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block z-20">
                      <motion.div
                        animate={{ x: [0, 5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                        className="text-3xl text-white/80"
                      >
                        →
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="relative p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden min-h-[320px] flex flex-col">
                      <div className="text-center mb-4">
                        <h4 className="text-xl font-bold mb-2">Choose Tool</h4>
                        <p className="text-white/80 text-sm">Pick your clipping method</p>
                      </div>

                      {workflowStep === 1 ? (
                        <div className="grid grid-cols-2 gap-3 flex-1">
                          {clippingTools.map((tool, idx) => {
                            const ToolIcon = tool.icon
                            return (
                              <motion.div
                                key={tool.name}
                                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                transition={{
                                  delay: idx * 0.15,
                                  duration: 0.5,
                                  type: "spring",
                                  stiffness: 100,
                                }}
                                whileHover={{ scale: 1.05, y: -4 }}
                                className="relative group/tool cursor-pointer"
                              >
                                <div
                                  className={`absolute inset-0 bg-gradient-to-br ${tool.color} rounded-xl blur opacity-50 group-hover/tool:opacity-70 transition-opacity`}
                                />
                                <div
                                  className={`relative p-3 rounded-xl bg-gradient-to-br ${tool.color} border border-white/20 h-full flex flex-col items-center justify-center gap-2`}
                                >
                                  <ToolIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
                                  <p className="text-[10px] text-white font-semibold text-center leading-tight">
                                    {tool.name}
                                  </p>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <Wand2 className="w-12 h-12 text-violet-400" />
                        </div>
                      )}

                      {workflowStep === 1 && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 4, ease: "easeInOut" }}
                          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-purple-500 origin-left"
                        />
                      )}
                    </div>

                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block z-20">
                      <motion.div
                        animate={{ x: [0, 5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: 0.3,
                        }}
                        className="text-3xl text-white/80"
                      >
                        →
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="relative p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden">
                      <div className="relative w-20 h-20 mx-auto mb-4">
                        {workflowStep === 2 && (
                          <>
                            {[...Array(3)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{
                                  scale: [0.5, 2],
                                  opacity: [0.8, 0],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Number.POSITIVE_INFINITY,
                                  delay: i * 0.4,
                                }}
                                className="absolute inset-0 border-4 border-pink-400 rounded-full"
                              />
                            ))}

                            {[...Array(8)].map((_, i) => {
                              const angle = (i * 360) / 8
                              const x = Math.cos((angle * Math.PI) / 180) * 40
                              const y = Math.sin((angle * Math.PI) / 180) * 40
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                  animate={{
                                    x: x,
                                    y: y,
                                    opacity: [0, 1, 0],
                                    scale: [0, 1, 0.5],
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Number.POSITIVE_INFINITY,
                                    delay: i * 0.1,
                                  }}
                                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                >
                                  <Sparkles className="w-4 h-4 text-yellow-300" />
                                </motion.div>
                              )
                            })}
                          </>
                        )}

                        <motion.div
                          animate={
                            workflowStep === 2
                              ? {
                                  scale: [1, 1.3, 1],
                                  rotate: [0, 360],
                                }
                              : {}
                          }
                          transition={{
                            scale: { duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1 },
                            rotate: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
                          }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-xl">
                            <TrendingUp className="w-8 h-8 text-white" strokeWidth={2.5} />
                          </div>
                        </motion.div>
                      </div>

                      <div className="text-center">
                        <motion.h4
                          animate={
                            workflowStep === 2
                              ? {
                                  scale: [1, 1.1, 1],
                                }
                              : {}
                          }
                          transition={{
                            duration: 0.5,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatDelay: 1,
                          }}
                          className="text-xl font-bold mb-2 bg-gradient-to-r from-pink-300 to-rose-300 bg-clip-text text-transparent"
                        >
                          Go Viral
                        </motion.h4>
                        <p className="text-white/80 text-sm">Watch it blow up</p>
                      </div>

                      {workflowStep === 2 && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 4, ease: "easeInOut" }}
                          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 to-rose-500 origin-left"
                        />
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
