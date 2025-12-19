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
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between">
        <Link href="/">
          <motion.div 
            className="cursor-pointer"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <img src="/logo.jpg" alt="SmartClip Logo" className="h-20 w-auto rounded-lg object-contain" />
          </motion.div>
        </Link>

        <div className="hidden md:flex gap-8">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          {user ? (
            // Authenticated user buttons
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={signOut}
                className="text-gray-700 border-gray-300 hover:bg-gray-100"
              >
                Sign Out
              </Button>
            </>
          ) : (
            // Guest user buttons
            <>
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-6 font-semibold">
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
