"use client"

import { motion } from "framer-motion"

interface AnimatedBackgroundProps {
  scrollY: number
}

export default function AnimatedBackground({ scrollY }: AnimatedBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .1) 25%, rgba(255, 255, 255, .1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .1) 75%, rgba(255, 255, 255, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .1) 25%, rgba(255, 255, 255, .1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .1) 75%, rgba(255, 255, 255, .1) 76%, transparent 77%, transparent)",
          backgroundSize: "80px 80px",
        }}
      />

      <motion.div
        animate={{
          y: scrollY * 0.15,
        }}
        transition={{ type: "tween", ease: "linear" }}
        className="absolute -top-1/2 left-1/4 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl"
      />

      <motion.div
        animate={{
          y: scrollY * 0.1,
        }}
        transition={{ type: "tween", ease: "linear" }}
        className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-3xl"
      />

      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 6 + i * 0.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
          className="absolute w-px h-px bg-foreground/50 rounded-full"
          style={{
            left: `${15 + i * 18}%`,
            top: `${20 + i * 15}%`,
          }}
        />
      ))}

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
