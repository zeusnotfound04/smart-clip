"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
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
    <footer ref={containerRef} className="relative bg-gray-950 border-t border-gray-800 overflow-hidden">
      {/* Footer content */}
      <div className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Brand column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="mb-6">
                 <img src="/logo.png" alt="SmartClip Logo" className="h-20 w-auto rounded-lg object-contain" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Turn videos into viral clips automatically. Built for clippers.
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
                <h4 className="font-semibold text-white mb-4 text-sm">{category}</h4>
                <div className="flex flex-col gap-3">
                  {links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      className="text-sm text-gray-400 hover:text-blue-400 transition-colors duration-300"
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
            className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <p className="text-sm text-gray-400">© 2025 SmartClip. All rights reserved.</p>
            <div className="flex gap-6">
              {["Twitter", "LinkedIn", "YouTube"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-300"
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
