"use client"

import Link from "next/link"
import {
  Activity,
  BrainCircuit,
  FileText,
  Map,
  MessageSquare,
  Mic2,
  PenLine,
  Target,
  UserCheck,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getRecentActivity,
  getEventSummary,
  formatRelativeTime,
  type AnalyticsEvent,
} from "@/lib/analytics"

const eventIcons: Record<AnalyticsEvent["type"], LucideIcon> = {
  resumeAnalyzed: FileText,
  jobMatched: Target,
  hireEvaluated: BrainCircuit,
  recruiterSimulated: UserCheck,
  bulletsOptimized: Zap,
  interviewCompleted: Mic2,
  roadmapGenerated: Map,
  coachConversation: MessageSquare,
  coverLetterGenerated: PenLine,
}

export function RecentActivity({ events }: { events: AnalyticsEvent[] }) {
  const activity = getRecentActivity(events, 8)

  return (
    <Card className="glass-card h-full">
      <CardHeader>
        <CardTitle className="text-sm font-headline tracking-widest uppercase">Recent AI Activity</CardTitle>
        <CardDescription>Every completed HireFit module run, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-foreground/[0.03]">
              <Activity className="h-7 w-7 text-muted-foreground/50" strokeWidth={1} />
            </div>
            <h3 className="mt-4 font-headline text-base font-medium">No AI activity yet</h3>
            <p className="mt-1.5 max-w-[26ch] text-sm leading-6 text-muted-foreground">
              Run any HireFit module — completed analyses will appear here automatically.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/analyzer" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                Resume Analyzer
              </Link>
              <Link href="/interview" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                AI Interview
              </Link>
              <Link href="/roadmap" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                Career Roadmap
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative space-y-4">
            {activity.map((event, index) => {
              const summary = getEventSummary(event)
              const Icon = eventIcons[event.type]
              const isLast = index === activity.length - 1
              return (
                <div key={`${event.type}-${event.timestamp}-${index}`} className="relative flex gap-3">
                  {!isLast ? (
                    <span className="absolute left-[15px] top-10 h-[calc(100%+4px)] w-px bg-gradient-to-b from-primary/25 to-transparent" aria-hidden="true" />
                  ) : null}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.04]">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-headline font-semibold text-foreground">{summary.title}</p>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs leading-5 text-muted-foreground">{summary.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
