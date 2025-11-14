"use client";

import { useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { LandingContent } from "@/components/landing-content";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LandingContent />;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-poppins">Dashboard</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-4 mb-8">
            <h2 className="text-2xl font-bold font-poppins">
              Welcome to SmartClips, {user.name || user.email}
            </h2>
            <p className="text-muted-foreground">
              Transform your videos with AI-powered tools
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Auto Subtitles</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate accurate subtitles automatically using AI speech recognition
              </p>
              <a href="/auto-subtitles" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                Get Started
              </a>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow opacity-60">
              <h3 className="text-lg font-semibold mb-2">Split Streamer</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Combine webcam and gameplay into vertical mobile-friendly videos
              </p>
              <button disabled className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                Coming Soon
              </button>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow opacity-60">
              <h3 className="text-lg font-semibold mb-2">Smart Clipper</h3>
              <p className="text-sm text-muted-foreground mb-4">
                AI-powered highlight detection and automatic clip generation
              </p>
              <button disabled className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                Coming Soon
              </button>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow opacity-60">
              <h3 className="text-lg font-semibold mb-2">AI Script Generator</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate engaging scripts for your videos with AI assistance
              </p>
              <button disabled className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                Coming Soon
              </button>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow opacity-60">
              <h3 className="text-lg font-semibold mb-2">Fake Conversations</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create animated text conversation videos for storytelling
              </p>
              <button disabled className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
