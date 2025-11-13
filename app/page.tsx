import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { LandingContent } from "@/components/landing-content";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return <LandingContent />;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-poppins">Dashboard</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold font-poppins">
              Welcome, {session.user?.name || session.user?.email}
            </h2>
            <p className="text-muted-foreground">
              Your clipboard manager is ready to use.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
