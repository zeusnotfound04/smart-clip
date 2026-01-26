"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import Silk from "@/components/slik-background";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset className="relative bg-background overflow-hidden">
          <div className="absolute inset-0 z-0 w-full h-full">
            <Silk speed={3} scale={1.5} color="#2B2B2B" noiseIntensity={1.2} rotation={0.3} />
          </div>
          <div className="relative z-10 h-full">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}