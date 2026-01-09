"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"

const steps = [
  {
    number: "01",
    title: "Upload Your Content",
    description: "Drop your long-form video, stream recording, or raw footage",
    visual: "upload",
  },
  {
    number: "02",
    title: "AI Analyzes Everything",
    description: "Our AI detects highlights, hooks, and viral moments automatically",
    visual: "analyze",
  },
  {
    number: "03",
    title: "Customize & Perfect",
    description: "Add captions, split screens, and polish with one-click edits",
    visual: "customize",
  },
  {
    number: "04",
    title: "Export Everywhere",
    description: "Download optimized clips for TikTok, Reels, Shorts, and more",
    visual: "export",
  },
]

export default function DemoSection() {
  const [activeStep, setActiveStep] = useState(0)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 })

  useEffect(() => {
    if (!isInView) return
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isInView])

  return (
    <section  ref={sectionRef} className="relative py-32 px-6 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">How it works</h2>
          <p className="text-lg text-muted-foreground">From raw footage to viral content in minutes</p>
        </motion.div>

        {/* Main content - Split layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                onClick={() => setActiveStep(index)}
                className={`relative cursor-pointer group p-6 rounded-2xl border transition-all duration-500 ${
                  activeStep === index
                    ? "bg-foreground/5 border-foreground/20"
                    : "bg-transparent border-transparent hover:bg-foreground/[0.02] hover:border-border"
                }`}
              >
                {/* Progress line */}
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-border rounded-full overflow-hidden">
                  {activeStep === index && (
                    <motion.div
                      className="w-full bg-foreground"
                      initial={{ height: "0%" }}
                      animate={{ height: "100%" }}
                      transition={{ duration: 4, ease: "linear" }}
                    />
                  )}
                </div>

                <div className="flex gap-5">
                  {/* Step number */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 ${
                      activeStep === index
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border group-hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-sm font-mono font-semibold">{step.number}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                        activeStep === index ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right side - Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative aspect-square max-w-[500px] mx-auto">
              {/* Animated visual for each step */}
              <StepVisualizer activeStep={activeStep} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function StepVisualizer({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative w-full h-full rounded-3xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Step visualizations */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        {activeStep === 0 && <UploadVisual />}
        {activeStep === 1 && <AnalyzeVisual />}
        {activeStep === 2 && <CustomizeVisual />}
        {activeStep === 3 && <ExportVisual />}
      </div>
    </div>
  )
}

// Upload visualization
function UploadVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col items-center justify-center"
    >
      {/* Upload zone */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-48 h-48 rounded-2xl border-2 border-dashed border-foreground/30 flex flex-col items-center justify-center"
      >
        {/* Animated arrow */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <svg className="w-12 h-12 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4"
            />
          </svg>
        </motion.div>
        <span className="text-sm text-muted-foreground mt-3">Drop your video</span>
      </motion.div>

      {/* File indicators flying in */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: -100, y: 50, opacity: 0, rotate: -20 }}
          animate={{ x: [-100, 0], y: [50, 0], opacity: [0, 1, 1, 0], rotate: [-20, 0] }}
          transition={{ delay: 0.5 + i * 0.3, duration: 1.5, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
          className="absolute w-16 h-20 rounded-lg bg-foreground/10 border border-foreground/20 flex items-center justify-center"
          style={{ left: `${20 + i * 15}%`, top: `${60 + i * 5}%` }}
        >
          <svg className="w-6 h-6 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </motion.div>
      ))}
    </motion.div>
  )
}

// Analyze visualization
function AnalyzeVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col items-center justify-center relative"
    >
      {/* Central processing core */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="absolute w-64 h-64 rounded-full border border-foreground/10"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="absolute w-48 h-48 rounded-full border border-foreground/10"
      />

      {/* AI Core */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        className="relative w-24 h-24 rounded-full bg-foreground/5 border border-foreground/20 flex items-center justify-center z-10"
      >
        <span className="text-foreground font-semibold text-lg">AI</span>

        {/* Pulse rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-accent/30"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 2, delay: i * 0.6, repeat: Number.POSITIVE_INFINITY }}
          />
        ))}
      </motion.div>

      {/* Scanning lines */}
      <motion.div
        initial={{ top: "10%" }}
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-accent/50 to-transparent"
      />

      {/* Data points being detected */}
      {[
        { x: "20%", y: "30%", label: "Hook" },
        { x: "75%", y: "25%", label: "Peak" },
        { x: "30%", y: "70%", label: "Viral" },
        { x: "70%", y: "65%", label: "CTA" },
      ].map((point, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.3, duration: 0.4 }}
          className="absolute"
          style={{ left: point.x, top: point.y }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, delay: i * 0.2, repeat: Number.POSITIVE_INFINITY }}
            className="w-3 h-3 rounded-full bg-accent/50 border border-accent"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
            {point.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  )
}

// Customize visualization
function CustomizeVisual() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ["Captions", "Layout", "Effects"]

  useEffect(() => {
    const interval = setInterval(() => setActiveTab((p) => (p + 1) % tabs.length), 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex gap-4">
      {/* Mini phone preview */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-32 aspect-[9/16] rounded-2xl border border-foreground/20 bg-background overflow-hidden">
          {/* Content based on active tab */}
          <div className="absolute inset-2 rounded-xl bg-muted/30 overflow-hidden">
            {activeTab === 0 && (
              <div className="absolute bottom-4 left-2 right-2 space-y-1">
                {["SmartClip makes", "editing so easy"].map((text, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="bg-foreground text-background text-[8px] px-2 py-1 rounded text-center font-medium"
                  >
                    {text}
                  </motion.div>
                ))}
              </div>
            )}
            {activeTab === 1 && (
              <div className="flex flex-col h-full">
                <motion.div
                  initial={{ height: "100%" }}
                  animate={{ height: "50%" }}
                  className="bg-muted/50 border-b border-foreground/10 flex items-center justify-center"
                >
                  <div className="w-8 h-8 rounded-full bg-foreground/20" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 bg-muted/30"
                />
              </div>
            )}
            {activeTab === 2 && (
              <motion.div
                animate={{ background: ["rgba(59,130,246,0.1)", "rgba(59,130,246,0.2)", "rgba(59,130,246,0.1)"] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="absolute inset-0"
              />
            )}
          </div>
        </div>
      </div>

      {/* Controls panel */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab, i) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                activeTab === i ? "bg-foreground text-background" : "bg-foreground/5 text-muted-foreground"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Sliders */}
        {["Size", "Position", "Style"].map((label, i) => (
          <div key={label} className="space-y-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-foreground/50 rounded-full"
                initial={{ width: "30%" }}
                animate={{ width: `${40 + i * 20}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
              />
            </div>
          </div>
        ))}

        {/* One-click buttons */}
        <div className="flex gap-2 mt-2">
          {["Auto", "Pro", "Viral"].map((preset, i) => (
            <motion.div
              key={preset}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="px-3 py-1 text-xs bg-foreground/5 rounded-full text-muted-foreground border border-foreground/10"
            >
              {preset}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Export visualization
function ExportVisual() {
  const platforms = [
    { name: "TikTok", color: "#000000" },
    { name: "Reels", color: "#E4405F" },
    { name: "Shorts", color: "#FF0000" },
    { name: "X", color: "#000000" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col items-center justify-center"
    >
      {/* Center clip */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="relative w-20 aspect-[9/16] rounded-xl border border-foreground/30 bg-foreground/5 mb-8"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-6 h-6 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </motion.div>

      {/* Platform destinations */}
      <div className="flex gap-4 flex-wrap justify-center">
        {platforms.map((platform, i) => (
          <motion.div
            key={platform.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="relative"
          >
            {/* Connection line */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              className="absolute left-1/2 -top-8 w-[1px] h-8 bg-gradient-to-b from-foreground/30 to-transparent origin-bottom"
            />

            <motion.div
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-14 h-14 rounded-xl bg-foreground/5 border border-foreground/20 flex items-center justify-center"
            >
              <span className="text-xs font-medium text-foreground/70">{platform.name}</span>
            </motion.div>

            {/* Check animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.15, type: "spring" }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Progress indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 text-center"
      >
        <div className="text-sm text-foreground font-medium">Export Complete</div>
        <div className="text-xs text-muted-foreground">4 clips ready to publish</div>
      </motion.div>
    </motion.div>
  )
}
