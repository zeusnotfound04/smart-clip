"use client";

import { ReactNode } from "react";

// This file is kept for compatibility but no longer needed
// The real AuthProvider is in /lib/auth-context.tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
