"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

const features = [
  {
    id: "subtitles",
    label: "Auto Subtitles",
    description: "AI-powered captions in 90+ languages",
  },
  {
    id: "split",
    label: "Split Screen",
    description: "Multi-camera layouts for streamers",
  },
  {
    id: "clip",
    label: "Smart Clipper",
    description: "Find viral moments automatically",
  },
  {
    id: "script",
    label: "Script AI",
    description: "Generate engaging video scripts",
  },
]

export default function VideoCreationVisualizer() {
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <motion.div className="relative mx-auto max-w-5xl">
        {/* Main container with phone */}
        <div className="flex items-center justify-center gap-8 lg:gap-16">
          {/* Left features */}
          <div className="hidden md:flex flex-col gap-4">
            {features.slice(0, 2).map((feature, index) => (
              <FeaturePill
                key={feature.id}
                feature={feature}
                isActive={index === activeFeature}
                onClick={() => setActiveFeature(index)}
                align="right"
              />
            ))}
          </div>

          {/* Phone mockup */}
          <div className="relative">
            {/* Glow effect */}
            <motion.div
              className="absolute -inset-8 rounded-[3rem] bg-accent/10 blur-3xl"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            />

            {/* Phone frame */}
            <motion.div
              className="relative w-[260px] md:w-[300px] aspect-[9/16] bg-background rounded-[2.5rem] border border-foreground/20 overflow-hidden shadow-2xl shadow-black/50"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-background rounded-full z-20 border-b border-foreground/10" />

              {/* Screen content */}
              <div className="absolute inset-2 rounded-[2rem] overflow-hidden bg-gradient-to-b from-muted/30 to-background">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                  >
                    {activeFeature === 0 && <SubtitlesPreview />}
                    {activeFeature === 1 && <SplitScreenPreview />}
                    {activeFeature === 2 && <ClipperPreview />}
                    {activeFeature === 3 && <ScriptPreview />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Screen reflection */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              />
            </motion.div>

            {/* Floating particles around phone */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-accent/50"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 80}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>

          {/* Right features */}
          <div className="hidden md:flex flex-col gap-4">
            {features.slice(2).map((feature, index) => (
              <FeaturePill
                key={feature.id}
                feature={feature}
                isActive={index + 2 === activeFeature}
                onClick={() => setActiveFeature(index + 2)}
                align="left"
              />
            ))}
          </div>
        </div>

        {/* Mobile feature pills */}
        <div className="flex md:hidden gap-2 justify-center mt-8 flex-wrap px-4">
          {features.map((feature, index) => (
            <motion.button
              key={feature.id}
              onClick={() => setActiveFeature(index)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
                index === activeFeature
                  ? "bg-foreground text-background"
                  : "bg-foreground/5 text-muted-foreground border border-border"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {feature.label}
            </motion.button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 justify-center mt-8">
          {features.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setActiveFeature(index)}
              className="relative h-1 rounded-full bg-foreground/10 overflow-hidden cursor-pointer"
              animate={{ width: index === activeFeature ? 48 : 12 }}
              transition={{ duration: 0.4 }}
            >
              {index === activeFeature && (
                <motion.div
                  className="absolute inset-0 bg-foreground rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 4, ease: "linear" }}
                  style={{ transformOrigin: "left" }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function FeaturePill({
  feature,
  isActive,
  onClick,
  align,
}: {
  feature: (typeof features)[0]
  isActive: boolean
  onClick: () => void
  align: "left" | "right"
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: align === "left" ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className={`group relative px-5 py-3 rounded-2xl border backdrop-blur-sm transition-all duration-500 text-${align} ${
        isActive ? "bg-foreground/10 border-foreground/30" : "bg-card/30 border-border hover:border-foreground/20"
      }`}
    >
      {/* Connection line */}
      <motion.div
        className={`absolute top-1/2 ${align === "left" ? "-left-8" : "-right-8"} w-8 h-[1px]`}
        animate={{
          background: isActive
            ? "linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0))"
            : "linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0))",
        }}
        style={{ transform: align === "right" ? "scaleX(-1)" : "none" }}
      />

      <div className={`flex flex-col ${align === "left" ? "items-start" : "items-end"}`}>
        <span
          className={`text-sm font-medium transition-colors duration-300 ${
            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {feature.label}
        </span>
        <motion.span
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: isActive ? 1 : 0, height: isActive ? "auto" : 0 }}
          className="text-xs text-muted-foreground mt-1 overflow-hidden"
        >
          {feature.description}
        </motion.span>
      </div>
    </motion.button>
  )
}

// Auto Subtitles Preview - Shows captions being generated
function SubtitlesPreview() {
  const captions = [
    { text: "Create viral content", delay: 0 },
    { text: "with AI-powered", delay: 0.8 },
    { text: "auto captions", delay: 1.6 },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Video placeholder with person */}
      <div className="flex-1 relative bg-gradient-to-b from-muted/50 to-muted/20">
        {/* Simulated video content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-20 h-20 rounded-full bg-foreground/10 border border-foreground/20"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
        </div>

        {/* Sound wave visualization */}
        <div className="absolute bottom-16 left-4 right-4 flex items-end justify-center gap-1">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-accent/60 rounded-full"
              animate={{
                height: [8, 20 + Math.random() * 20, 8],
              }}
              transition={{
                duration: 0.5,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      </div>

      {/* Captions area */}
      <div className="p-4 space-y-2">
        {captions.map((caption, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: caption.delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <motion.div
              className="bg-foreground text-background px-3 py-2 rounded-lg text-sm font-semibold text-center mx-auto w-fit"
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{ delay: caption.delay, duration: 0.3 }}
            >
              {caption.text}
            </motion.div>
          </motion.div>
        ))}

        {/* Language indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="flex items-center justify-center gap-2 mt-3"
        >
          <span className="text-[10px] text-muted-foreground">90+ Languages</span>
          <div className="flex -space-x-1">
            {["EN", "ES", "FR"].map((lang, i) => (
              <motion.div
                key={lang}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.7 + i * 0.1 }}
                className="w-5 h-5 rounded-full bg-foreground/10 border border-foreground/20 flex items-center justify-center text-[8px] text-foreground/60"
              >
                {lang}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Split Screen Preview - Shows multi-layout for streamers
function SplitScreenPreview() {
  const [layout, setLayout] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setLayout((p) => (p + 1) % 3), 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-full p-3">
      {/* Layout indicator */}
      <div className="flex gap-2 mb-3 justify-center">
        {["1:1", "2:1", "Game"].map((l, i) => (
          <motion.div
            key={l}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
              layout === i ? "bg-foreground text-background" : "bg-foreground/10 text-muted-foreground"
            }`}
          >
            {l}
          </motion.div>
        ))}
      </div>

      {/* Split screen preview */}
      <div className="flex-1 rounded-xl overflow-hidden border border-foreground/10">
        <AnimatePresence mode="wait">
          {layout === 0 && (
            <motion.div
              key="layout-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 bg-muted/40 flex items-center justify-center border-b border-foreground/10">
                <div className="w-12 h-12 rounded-full bg-foreground/20 border border-foreground/30" />
              </div>
              <div className="flex-1 bg-muted/20 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-foreground/15 border border-foreground/20" />
              </div>
            </motion.div>
          )}
          {layout === 1 && (
            <motion.div
              key="layout-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="h-2/3 bg-muted/40 flex items-center justify-center border-b border-foreground/10">
                <div className="w-14 h-14 rounded-full bg-foreground/20 border border-foreground/30" />
              </div>
              <div className="h-1/3 bg-muted/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-foreground/15 border border-foreground/20" />
              </div>
            </motion.div>
          )}
          {layout === 2 && (
            <motion.div
              key="layout-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full relative"
            >
              <div className="absolute inset-0 bg-muted/30">
                {/* Game content simulation */}
                <div className="absolute inset-4 border border-foreground/10 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-1">
                    {[...Array(9)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 bg-accent/20 rounded"
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 1, delay: i * 0.1, repeat: Number.POSITIVE_INFINITY }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* Facecam overlay */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute bottom-3 right-3 w-16 h-20 rounded-lg bg-muted/60 border border-foreground/20 flex items-center justify-center"
              >
                <div className="w-8 h-8 rounded-full bg-foreground/20" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Streamer badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 text-center"
      >
        <span className="text-[10px] text-muted-foreground px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10">
          Perfect for Streamers
        </span>
      </motion.div>
    </div>
  )
}

// Smart Clipper Preview - Shows AI finding viral moments
function ClipperPreview() {
  return (
    <div className="flex flex-col h-full p-3">
      {/* Timeline header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground">2hr Stream</span>
        <span className="text-[10px] text-accent">8 clips found</span>
      </div>

      {/* Video timeline */}
      <div className="relative h-12 bg-foreground/5 rounded-lg overflow-hidden mb-4">
        {/* Timeline segments */}
        <div className="absolute inset-0 flex">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-foreground/5"
              style={{ opacity: 0.3 + Math.random() * 0.7 }}
            />
          ))}
        </div>

        {/* Highlight markers */}
        {[15, 35, 55, 75].map((pos, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.2, type: "spring" }}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-8 bg-accent/50 rounded-sm border border-accent"
            style={{ left: `${pos}%` }}
          />
        ))}

        {/* Scanning line */}
        <motion.div
          className="absolute top-0 bottom-0 w-[2px] bg-foreground"
          initial={{ left: "0%" }}
          animate={{ left: "100%" }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
      </div>

      {/* Detected clips */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {[
          { label: "Peak Moment", score: 98 },
          { label: "Funny Clip", score: 94 },
          { label: "Key Point", score: 91 },
        ].map((clip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.2 }}
            className="flex items-center gap-3 p-2 rounded-lg bg-foreground/5 border border-foreground/10"
          >
            <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center">
              <svg className="w-4 h-4 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{clip.label}</div>
              <div className="text-[10px] text-muted-foreground">Viral Score</div>
            </div>
            <div className="text-sm font-bold text-accent">{clip.score}</div>
          </motion.div>
        ))}
      </div>

      {/* AI badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-3 flex items-center justify-center gap-2"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-4 h-4 rounded-full border border-dashed border-accent/50"
        />
        <span className="text-[10px] text-muted-foreground">AI analyzing...</span>
      </motion.div>
    </div>
  )
}

// Script AI Preview - Shows script generation
function ScriptPreview() {
  const lines = [
    "Hook your audience in 3 seconds...",
    "Share the problem they face...",
    "Present your unique solution...",
    "End with a strong CTA...",
  ]

  return (
    <div className="flex flex-col h-full p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center"
        >
          <span className="text-[10px] text-accent font-bold">AI</span>
        </motion.div>
        <span className="text-xs text-foreground font-medium">Script Generator</span>
      </div>

      {/* Generated script */}
      <div className="flex-1 space-y-3">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.5, duration: 0.4 }}
            className="flex gap-2"
          >
            <div className="w-1 h-full bg-accent/30 rounded-full flex-shrink-0" />
            <div>
              <div className="text-[10px] text-accent/70 mb-0.5">Step {i + 1}</div>
              <motion.div
                className="text-xs text-foreground/80"
                initial={{ width: 0 }}
                animate={{ width: "auto" }}
                transition={{ delay: i * 0.5 + 0.2, duration: 0.5 }}
                style={{ overflow: "hidden", whiteSpace: "nowrap" }}
              >
                {line}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Typing cursor effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="mt-4 p-3 rounded-lg bg-foreground/5 border border-foreground/10"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
            className="w-2 h-4 bg-accent"
          />
          <span className="text-[10px] text-muted-foreground">Type your topic...</span>
        </div>
      </motion.div>

      {/* Quick prompts */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {["Tutorial", "Story", "Tips"].map((prompt, i) => (
          <motion.div
            key={prompt}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3 + i * 0.1 }}
            className="px-2 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-[10px] text-muted-foreground"
          >
            {prompt}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
