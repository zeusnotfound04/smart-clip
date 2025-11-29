"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export default function CTASection() {
  return (
    <section className="relative py-32 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">Ready to go viral?</h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
          Join thousands of creators already using SmartClip to transform their content.
        </p>

        <Button className="bg-foreground text-background hover:bg-foreground/90 text-base px-10 py-6 rounded-full font-medium">
          Start Creating Free
        </Button>
      </motion.div>
    </section>
  )
}
