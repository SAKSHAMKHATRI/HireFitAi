import React from 'react';
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AdminHeaderLink } from "@/components/layout/admin-header-link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground font-body antialiased selection:bg-primary selection:text-primary-foreground">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border/20">
              <SidebarTrigger className="-ml-1" />
              <Link href="/" className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Landing Page</span>
              </Link>
              <div className="flex-1" />
              <AdminHeaderLink />
            </header>
            <div className="flex flex-1 flex-col gap-4 p-6 overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ProtectedRoute>
  );
}
