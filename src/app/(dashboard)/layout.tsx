
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border/20">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-headline uppercase tracking-widest hidden sm:block">Status: Optimized</span>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
