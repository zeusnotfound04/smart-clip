import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <h1 className="text-4xl font-bold tracking-tight">Smart Clip</h1>
          <p className="text-lg text-muted-foreground">
            Sign in to get started
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">
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
