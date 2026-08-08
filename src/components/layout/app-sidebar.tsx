
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  FileText,
  UserCheck,
  Zap,
  GraduationCap,
  History,
  FileCode,
  Download,
  Terminal,
  BrainCircuit,
  Target,
  Mic2,
  Map,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/layout/nav-user"
import Link from "next/link"
import { usePathname } from "next/navigation"

const data = {
  navMain: [
    {
      title: "Command Center",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Resume Analyzer",
      url: "/analyzer",
      icon: FileText,
    },
    {
      title: "AI Match",
      url: "/match",
      icon: Target,
    },
    {
      title: "H.I.R.E Evaluator",
      url: "/evaluator",
      icon: BrainCircuit,
    },
    {
      title: "Recruiter Mode",
      url: "/recruiter",
      icon: UserCheck,
    },
    {
      title: "Bullet Optimizer",
      url: "/optimizer",
      icon: Zap,
    },
    {
      title: "AI Interview",
      url: "/interview",
      icon: Mic2,
    },
    {
      title: "Career Roadmap",
      url: "/roadmap",
      icon: Map,
    },
    {
      title: "Career Coach",
      url: "/coach",
      icon: GraduationCap,
    },
    {
      title: "Cover Letter",
      url: "/cover-letter",
      icon: FileCode,
    },
  ],
  secondary: [
    {
      title: "Product Updates",
      url: "/version-history",
      icon: History,
    },
    {
      title: "Export Reports",
      url: "/export-reports",
      icon: Download,
    },
  ],
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
                  <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Terminal className="size-4" strokeWidth={1.5} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-headline font-semibold text-lg">HIREFIT AI</span>
                  <span className="truncate text-xs text-muted-foreground uppercase tracking-widest">Career Suite</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-headline tracking-widest text-[10px] uppercase">Intelligence Suite</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon className="size-4" strokeWidth={1.5} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="font-headline tracking-widest text-[10px] uppercase">Management</SidebarGroupLabel>
          <SidebarMenu>
            {data.secondary.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon className="size-4" strokeWidth={1.5} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
