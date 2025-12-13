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
    badge: "New",
  },
  {
    title: "AI Script Generator",
    url: "/dashboard/ai-script-generator",
    icon: Wand2,
    badge: "AI",
  },
  // {
  //   title: "Fake Conversations",
  //   url: "/dashboard/fake-conversations",
  //   icon: MessageCircle,
  //   badge: "AI",
  // },
  {
    title: "Smart Clipper",
    url: "/dashboard/features/smart-clipper",
    icon: Scissors,
    badge: null,
  },
  // {
  //   title: "Video Enhancement",
  //   url: "/dashboard/features/video-enhancement",
  //   icon: Video,
  //   badge: null,
  // },
  // {
  //   title: "Projects",
  //   url: "/dashboard/projects",
  //   icon: Briefcase,
  //   badge: null,
  // },
  // {
  //   title: "Videos",
  //   url: "/dashboard/videos",
  //   icon: Play,
  //   badge: null,
  // },
  // {
  //   title: "Workspaces",
  //   url: "/dashboard/workspaces",
  //   icon: Layers,
  //   badge: null,
  // },
];

const bottomNavigation = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Help",
    url: "/dashboard/help",
    icon: HelpCircle,
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
      <SidebarHeader className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-center">
          <motion.div
            className="flex h-10 w-48 items-center justify-center rounded-lg bg-white overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image src="/logo.jpg" alt="SmartClip Logo" width={192} height={40} className="object-contain" />
          </motion.div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs font-medium px-2 pb-2">
            MAIN MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={state === "collapsed" ? item.title : undefined}
                      className={`
                        w-full justify-start text-left
                        ${isActive 
                          ? 'bg-white text-black hover:bg-gray-200' 
                          : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                        }
                        transition-all duration-200 ease-in-out
                        group relative
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <item.icon className="size-5" />
                        </motion.div>
                        <span className="flex-1 group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="ml-auto bg-green-500 text-black px-2 py-1 rounded-full text-xs font-medium group-data-[collapsible=icon]:hidden">
                            {item.badge}
                          </span>
                        )}
                        {isActive && state !== "collapsed" && (
                          <ChevronRight className="size-4 ml-auto opacity-60" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-gray-400 text-xs font-medium px-2 pb-2">
            SUPPORT
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavigation.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={state === "collapsed" ? item.title : undefined}
                      className={`
                        w-full justify-start text-left
                        ${isActive 
                          ? 'bg-white text-black hover:bg-gray-200' 
                          : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                        }
                        transition-all duration-200 ease-in-out
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <item.icon className="size-5" />
                        </motion.div>
                        <span className="flex-1 group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 bg-sidebar">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="size-10 bg-white">
              <AvatarFallback className="bg-white text-black font-semibold">
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 group-data-[collapsible=icon]:hidden">
              <div className="text-white font-medium text-sm">
                {user.name || user.email}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white hover:bg-gray-900 group-data-[collapsible=icon]:w-full"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}