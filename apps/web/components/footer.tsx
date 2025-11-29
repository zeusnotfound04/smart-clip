"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { Zap } from "lucide-react"
import { useRef } from "react"

export default function Footer() {
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"],
  })

  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1])

  const footerLinks = {
    Product: ["Features", "Pricing", "Roadmap", "Changelog"],
    Company: ["About", "Blog", "Careers", "Press"],
    Legal: ["Privacy", "Terms", "Cookies"],
  }

  return (
    <footer ref={containerRef} className="relative bg-background border-t border-border overflow-hidden">
      <div className="relative py-20 px-6">
        <motion.div style={{ scale, opacity }} className="max-w-7xl mx-auto">
          {/* Giant brand name */}
          <motion.h2
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="text-[15vw] md:text-[12vw] font-bold text-foreground/5 leading-none tracking-tighter text-center select-none"
          >
            SmartClip
          </motion.h2>
        </motion.div>
      </div>

      {/* Footer content overlaid on the big text */}
      <div className="relative -mt-32 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Brand column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                 <Zap className="size-6" />
                <span className="font-semibold text-foreground">SmartClip</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create viral short-form content with AI-powered video editing tools.
              </p>
            </motion.div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h4 className="font-medium text-foreground mb-4 text-sm">{category}</h4>
                <div className="flex flex-col gap-3">
                  {links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <p className="text-sm text-muted-foreground">2025 SmartClip. All rights reserved.</p>
            <div className="flex gap-6">
              {["Twitter", "LinkedIn", "YouTube"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  {social}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}
