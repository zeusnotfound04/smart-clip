"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

const features = [
  {
    id: "subtitles",
    label: "Auto Subtitles",
    description: "Viral captions in 90+ languages",
  },
  {
    id: "split",
    label: "Split Screen",
    description: "Multi-camera layouts for streamers",
  },
  {
    id: "clip",
    label: "Smart Clipper",
    description: "AI finds viral moments",
  },
  {
    id: "script",
    label: "Script AI",
    description: "Generate engaging scripts",
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
              className="absolute -inset-8 rounded-[3rem] bg-blue-500/10 blur-3xl"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            />

            {/* Phone frame */}
            <motion.div
              className="relative w-[260px] md:w-[300px] aspect-[9/16] bg-gray-900 rounded-[2.5rem] border border-gray-700 overflow-hidden shadow-2xl shadow-blue-600/20"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-20 border-b border-gray-700" />

              {/* Screen content */}
              <div className="absolute inset-2 rounded-[2rem] overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
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
                className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              />
            </motion.div>

            {/* Floating particles around phone */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-blue-500/40"
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
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 border border-gray-700"
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
              className="relative h-1 rounded-full bg-gray-700 overflow-hidden cursor-pointer"
              animate={{ width: index === activeFeature ? 48 : 12 }}
              transition={{ duration: 0.4 }}
            >
              {index === activeFeature && (
                <motion.div
                  className="absolute inset-0 bg-blue-600 rounded-full"
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
      className={`group relative px-5 py-3 rounded-2xl border transition-all duration-500 text-${align} ${
        isActive ? "bg-blue-600/20 border-blue-500" : "bg-gray-800/50 border-gray-700 hover:border-blue-500"
      }`}
    >
      {/* Connection line */}
      <motion.div
        className={`absolute top-1/2 ${align === "left" ? "-left-8" : "-right-8"} w-8 h-[1px]`}
        animate={{
          background: isActive
            ? "linear-gradient(90deg, rgba(37, 99, 235, 0.4), rgba(37, 99, 235, 0))"
            : "linear-gradient(90deg, rgba(156, 163, 175, 0.2), rgba(156, 163, 175, 0))",
        }}
        style={{ transform: align === "right" ? "scaleX(-1)" : "none" }}
      />

      <div className={`flex flex-col ${align === "left" ? "items-start" : "items-end"}`}>
        <span
          className={`text-sm font-medium transition-colors duration-300 ${
            isActive ? "text-blue-400" : "text-gray-300 group-hover:text-white"
          }`}
        >
          {feature.label}
        </span>
        <motion.span
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: isActive ? 1 : 0, height: isActive ? "auto" : 0 }}
          className="text-xs text-gray-400 mt-1 overflow-hidden"
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
      <div className="flex-1 relative bg-gradient-to-b from-gray-100 to-gray-50">
        {/* Simulated video content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-20 h-20 rounded-full bg-blue-100 border-2 border-blue-200"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
        </div>

        {/* Sound wave visualization */}
        <div className="absolute bottom-16 left-4 right-4 flex items-end justify-center gap-1">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-blue-500/70 rounded-full"
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
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold text-center mx-auto w-fit shadow-sm"
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
          <span className="text-[10px] text-gray-500">90+ Languages</span>
          <div className="flex -space-x-1">
            {["EN", "ES", "FR"].map((lang, i) => (
              <motion.div
                key={lang}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2.7 + i * 0.1 }}
                className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[8px] text-blue-600 font-medium"
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
              layout === i ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {l}
          </motion.div>
        ))}
      </div>

      {/* Split screen preview */}
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200">
        <AnimatePresence mode="wait">
          {layout === 0 && (
            <motion.div
              key="layout-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 bg-gray-100 flex items-center justify-center border-b border-gray-200">
                <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-200" />
              </div>
              <div className="flex-1 bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-100" />
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
              <div className="h-2/3 bg-gray-100 flex items-center justify-center border-b border-gray-200">
                <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-200" />
              </div>
              <div className="h-1/3 bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-blue-100" />
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
              <div className="absolute inset-0 bg-gray-100">
                {/* Game content simulation */}
                <div className="absolute inset-4 border border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-1">
                    {[...Array(9)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 bg-blue-200 rounded"
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
                className="absolute bottom-3 right-3 w-16 h-20 rounded-lg bg-white/90 border-2 border-blue-200 flex items-center justify-center shadow-lg"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200" />
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
        <span className="text-[10px] text-gray-600 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
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
        <span className="text-[10px] text-gray-600">2hr Stream</span>
        <span className="text-[10px] text-blue-600 font-medium">8 clips found</span>
      </div>

      {/* Video timeline */}
      <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden mb-4">
        {/* Timeline segments */}
        <div className="absolute inset-0 flex">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-gray-200"
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
            className="absolute top-1/2 -translate-y-1/2 w-3 h-8 bg-blue-500 rounded-sm border border-blue-600 shadow-sm"
            style={{ left: `${pos}%` }}
          />
        ))}

        {/* Scanning line */}
        <motion.div
          className="absolute top-0 bottom-0 w-[2px] bg-blue-600"
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
            className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-200"
          >
            <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{clip.label}</div>
              <div className="text-[10px] text-gray-500">Viral Score</div>
            </div>
            <div className="text-sm font-bold text-blue-600">{clip.score}</div>
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
          className="w-4 h-4 rounded-full border-2 border-dashed border-blue-500"
        />
        <span className="text-[10px] text-gray-600">AI analyzing...</span>
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
          className="w-6 h-6 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center"
        >
          <span className="text-[10px] text-blue-600 font-bold">AI</span>
        </motion.div>
        <span className="text-xs text-gray-900 font-medium">Script Generator</span>
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
            <div className="w-1 h-full bg-blue-300 rounded-full flex-shrink-0" />
            <div>
              <div className="text-[10px] text-blue-600 font-medium mb-0.5">Step {i + 1}</div>
              <motion.div
                className="text-xs text-gray-700"
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
        className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
            className="w-2 h-4 bg-blue-600"
          />
          <span className="text-[10px] text-gray-500">Type your topic...</span>
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
            className="px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-600"
          >
            {prompt}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
