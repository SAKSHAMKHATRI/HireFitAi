import type { Metadata } from 'next';
import './globals.css';
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'HireFit AI | Intelligent Career Excellence',
  description: 'Intelligent Resume Evaluation, Recruiter Behavior Simulation, and AI Career Coaching.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
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
      </body>
    </html>
  );
}
