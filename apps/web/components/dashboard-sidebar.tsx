"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Scissors,
  Video,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Play,
  Layers,
  Briefcase,
  ChevronRight,
  MessageCircle,
  Wand2,
  Columns2,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    badge: null,
  },
  {
    title: "Auto Subtitles",
    url: "/dashboard/auto-subtitles",
    icon: FileText,
    badge: null,
  },
  {
    title: "AI Script Generator",
    url: "/dashboard/ai-script-generator",
    icon: Wand2,
    badge: null,
  },
  {
    title: "Podcast Clipper",
    url: "/dashboard/podcast-clipper",
    icon: Mic,
    badge: null,
  },
  // {
  //   title: "Fake Conversations",
  //   url: "/dashboard/fake-conversations",
  //   icon: MessageCircle,
  //   badge: "AI",
  // },
  {
    title: "Smart Clipper",
    url: "/dashboard/smart-clipper",
    icon: Scissors,
    badge: null,
  },
  {
    title: "Split Streamer",
    url: "/dashboard/split-streamer",
    icon: Columns2,
    badge: null,
  },

];

const bottomNavigation = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();

  const handleLogout = () => {
    signOut();
  };

  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="icon"
      className="border-r border-border bg-sidebar"
    >
      <SidebarHeader className="border-b border-gray-800 p-6">
        <div className="flex items-center justify-center">
          <motion.div
            className="flex h-12 w-full items-center justify-center rounded-xl overflow-hidden relative group"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute inset-0 bg-white/5 rounded-xl"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            <Image src="/dash-logo.png" alt="SmartClip Logo" width={50} height={15} className="object-contain relative z-10" />
          </motion.div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-3 py-4">
        <SidebarGroup>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SidebarGroupLabel className="text-gray-400 text-xs font-bold uppercase tracking-wider px-4 pb-3 pt-2">
              Main Menu
            </SidebarGroupLabel>
          </motion.div>
          <SidebarGroupContent className="space-y-1.5">
            <SidebarMenu>
              {navigationItems.map((item, index) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05, type: "spring", stiffness: 200 }}
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={state === "collapsed" ? item.title : undefined}
                        className={`
                          w-full justify-start text-left rounded-xl relative overflow-hidden
                          ${isActive 
                            ? 'bg-white text-black hover:bg-gray-200 shadow-md' 
                            : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                          }
                          transition-all duration-300 ease-out
                          group
                        `}
                      >
                        <Link href={item.url} className="flex items-center gap-3.5 w-full py-1">
                          <motion.div
                            className={`p-2 rounded-lg ${isActive ? 'bg-gray-100' : 'bg-transparent'} transition-colors`}
                            whileHover={{ scale: 1.15, rotate: 10 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <item.icon className="size-4" />
                          </motion.div>
                          <motion.span 
                            className="flex-1 group-data-[collapsible=icon]:hidden font-medium text-sm"
                            whileHover={{ x: 3 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {item.title}
                          </motion.span>
                          {item.badge && (
                            <motion.span 
                              className="ml-auto bg-green-500 text-black px-2.5 py-0.5 rounded-full text-xs font-bold group-data-[collapsible=icon]:hidden shadow-sm"
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", delay: 0.2 + index * 0.05 }}
                              whileHover={{ scale: 1.1 }}
                            >
                              {item.badge}
                            </motion.span>
                          )}
                          {isActive && state !== "collapsed" && (
                            <motion.div
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 200 }}
                            >
                              <ChevronRight className="size-4 ml-auto opacity-70" />
                            </motion.div>
                          )}
                          {!isActive && (
                            <motion.div
                              className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-xl"
                              transition={{ duration: 0.2 }}
                            />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Decorative Animated Divider */}
        <motion.div 
          className="mx-4 my-6 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />

        <SidebarGroup className="mt-auto">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <SidebarGroupLabel className="text-gray-400 text-xs font-bold uppercase tracking-wider px-4 pb-3 pt-2">
              Support
            </SidebarGroupLabel>
          </motion.div>
          <SidebarGroupContent className="space-y-1.5">
            <SidebarMenu>
              {bottomNavigation.map((item, index) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05, type: "spring", stiffness: 200 }}
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={state === "collapsed" ? item.title : undefined}
                        className={`
                          w-full justify-start text-left rounded-xl relative overflow-hidden
                          ${isActive 
                            ? 'bg-white text-black hover:bg-gray-200 shadow-md' 
                            : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                          }
                          transition-all duration-300 ease-out
                          group
                        `}
                      >
                        <Link href={item.url} className="flex items-center gap-3.5 w-full py-1">
                          <motion.div
                            className={`p-2 rounded-lg ${isActive ? 'bg-gray-100' : 'bg-transparent'} transition-colors`}
                            whileHover={{ scale: 1.15, rotate: 10 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <item.icon className="size-4" />
                          </motion.div>
                          <motion.span 
                            className="flex-1 group-data-[collapsible=icon]:hidden font-medium text-sm"
                            whileHover={{ x: 3 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {item.title}
                          </motion.span>
                          {!isActive && (
                            <motion.div
                              className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-xl"
                              transition={{ duration: 0.2 }}
                            />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 bg-sidebar space-y-3">
        {/* Premium Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
          className="group-data-[collapsible=icon]:hidden"
        >
          <Link href="/credits" className="block">
            <motion.div 
              className="relative rounded-2xl p-5 cursor-pointer overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {/* Gradient border effect */}
              <motion.div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
                style={{
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))",
                  padding: "1px"
                }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Animated shimmer */}
              <motion.div
                className="absolute inset-0 opacity-0"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent)"
                }}
                animate={{
                  x: ["-100%", "200%"],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 5,
                  ease: "linear"
                }}
              />

              {/* Content */}
              <div className="relative z-10 space-y-2">
                {/* Header with icon */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                      }}
                      whileHover={{ rotate: 5, scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <svg 
                        className="w-4 h-4 text-white" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d="M13 10V3L4 14h7v7l9-11h-7z" 
                        />
                      </svg>
                    </motion.div>
                    <motion.h3 
                      className="text-white font-semibold text-sm tracking-tight"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      Premium
                    </motion.h3>
                  </div>
                  
                  {/* Arrow indicator */}
                  <motion.div
                    className="text-gray-400 group-hover:text-white"
                    animate={{ x: [0, 3, 0] }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </div>

                {/* Description */}
                <motion.p 
                  className="text-gray-400 text-[11px] leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Unlock unlimited clips & advanced AI features
                </motion.p>

                {/* Feature pills */}
                <div className="flex gap-1.5 pt-1">
                  {[ "Webawave Pro"].map((feature, index) => (
                    <motion.span
                      key={feature}
                      className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] text-gray-300 font-medium border border-white/10"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        delay: 1.1 + index * 0.1,
                        type: "spring",
                        stiffness: 500
                      }}
                      whileHover={{ 
                        scale: 1.05,
                        backgroundColor: "rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      {feature}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Glow effect */}
              <motion.div
                className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-0 group-hover:opacity-20 blur-3xl"
                style={{
                  background: "radial-gradient(circle, #3b82f6, transparent)"
                }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>
          </Link>
        </motion.div>

        {/* Enhanced Billing Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, type: "spring" }}
        >
          <Button
            asChild
            variant="outline"
            className="w-full justify-start text-left border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white group-data-[collapsible=icon]:justify-center rounded-xl transition-all duration-300 hover:border-gray-600"
          >
            <Link href="/credits" className="flex items-center gap-3">
              <motion.div
                className="p-1.5 rounded-lg bg-transparent group-hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.15, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </motion.div>
              <motion.span 
                className="group-data-[collapsible=icon]:hidden text-sm font-medium"
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                Billing & Credits
              </motion.span>
            </Link>
          </Button>
        </motion.div>

        {/* Enhanced User Profile */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, type: "spring" }}
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Avatar className="size-10 bg-white ring-2 ring-transparent hover:ring-white/20 transition-all">
                <AvatarFallback className="bg-white text-black font-bold text-sm">
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <div className="flex-1 group-data-[collapsible=icon]:hidden min-w-0">
              <motion.div 
                className="text-white font-semibold text-sm truncate"
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {user.name || user.email}
              </motion.div>
            </div>
            <motion.div
              whileHover={{ scale: 1.15, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white hover:bg-gray-900 group-data-[collapsible=icon]:w-full rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="size-4" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}