"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { HiHome, HiCog, HiLogout } from "react-icons/hi";
import { HiSparkles, HiChatBubbleLeftRight, HiFilm } from "react-icons/hi2";
import { motion } from "framer-motion";
import { User } from "@/lib/api-client";

interface AppSidebarProps {
  user: User;
}

const navigation = [
  { name: "Home", href: "/", icon: HiHome },
  { name: "AI Script Generator", href: "/ai-script-generator", icon: HiSparkles },
  { name: "Video Generation", href: "/video-generation", icon: HiFilm },
  { name: "Fake Conversations", href: "/fake-conversations", icon: HiChatBubbleLeftRight },
  { name: "Settings", href: "/settings", icon: HiCog },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user.email[0].toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader>
        <motion.div 
          className="flex items-center justify-between px-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SmartClip" className="w-6 h-6" />
            <h2 className="text-lg font-semibold font-poppins">Smart Clip</h2>
          </div>
          <ThemeToggle />
        </motion.div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <motion.div 
              className="flex flex-col items-center gap-3 px-2 py-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Avatar className="size-16">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="text-center w-full overflow-hidden">
                <p className="font-medium text-sm truncate px-2 font-poppins">{user.name}</p>
              </div>
            </motion.div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="size-5" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOut()}>
                <HiLogout className="size-5" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </motion.div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
