"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CTASection() {
  return (
    <section className="relative py-24 px-6 bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Stop paying editors.
          <br />
          Start clipping automatically.
        </h2>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Join 10,000+ clippers who automated their workflow with SmartClip
        </p>

        <Link href="/auth/signup">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 text-lg px-10 py-6 rounded-lg font-semibold shadow-sm">
              Start Clipping Automatically
            </Button>
          </motion.div>
        </Link>
        
        <p className="text-sm text-gray-400 mt-6">
          Free to start • No credit card required
        </p>
      </motion.div>
    </section>
  )
}
