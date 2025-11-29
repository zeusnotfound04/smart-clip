"use client"

import { motion } from "framer-motion"

interface FloatingCardProps {
  delay: number
  title: string
  description: string
  position: "left" | "center" | "right"
}

export default function FloatingCard({ delay, title, description, position }: FloatingCardProps) {
  const positions = {
    left: "-left-20 md:left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "-right-20 md:right-0",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(167, 139, 250, 0.2)" }}
      className={`absolute top-1/2 -translate-y-1/2 ${positions[position]} w-40 h-40 bg-gradient-to-br from-card/50 to-card/20 border border-border rounded-2xl p-6 backdrop-blur-xl cursor-pointer group`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div>
          <div className="w-10 h-10 bg-accent/20 rounded-lg mb-3 group-hover:bg-accent/40 transition-colors"></div>
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </motion.div>
  )
}
