"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingContent() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">
          Smart Clip
        </h1>
        <p className="text-lg text-muted-foreground">
          AI-powered video creation platform
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
