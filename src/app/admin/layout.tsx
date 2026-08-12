import React from "react"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { AdminRoute } from "@/components/auth/admin-route"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-background text-foreground font-body antialiased selection:bg-primary selection:text-primary-foreground">
        <SidebarProvider>
          <AdminSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border/20">
              <SidebarTrigger className="-ml-1" />
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-brand-green" strokeWidth={1.5} />
                <span className="hidden sm:inline">Admin Console</span>
              </Link>
              <div className="flex-1" />
              <ThemeToggle compact />
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to User Dashboard</span>
              </Link>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-6 overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </AdminRoute>
  )
}
