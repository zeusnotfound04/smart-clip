"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export default function Navigation() {
  const navItems = ["Features", "How it Works", "Pricing"]
  const { user, signOut } = useAuth()

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="flex items-center gap-3 cursor-pointer"
          >
             <Image src="/logo.jpg" alt="SmartClip Logo" width={32} height={24} className="rounded object-contain" />
            <span className="font-semibold text-lg text-foreground tracking-tight">SmartClip</span>
          </motion.div>
        </Link>

        <div className="hidden md:flex gap-10">
          {navItems.map((item) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              whileHover={{ opacity: 1 }}
              className="text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm font-medium"
            >
              {item}
            </motion.a>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          {user ? (
            // Authenticated user buttons
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="text-foreground hover:bg-muted/50">
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={signOut}
                className="text-foreground hover:bg-muted/50"
              >
                Sign Out
              </Button>
            </>
          ) : (
            // Guest user buttons
            <>
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-foreground hover:bg-muted/50">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
