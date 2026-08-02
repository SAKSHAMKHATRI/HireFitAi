"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Bell,
  BrainCircuit,
  CheckCheck,
  Clock3,
  FileText,
  GraduationCap,
  Map,
  MessageSquare,
  Mic2,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
  UserCheck,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  loadAnalytics,
  getEventSummary,
  formatRelativeTime,
  type AnalyticsEvent,
} from "@/lib/analytics"
import {
  loadSettings,
  loadReadNotifications,
  markNotificationsRead,
} from "@/lib/settings"

type NotificationItem = {
  id: string
  kind: "activity" | "reminder" | "welcome"
  eventType?: AnalyticsEvent["type"]
  title: string
  detail: string
  timestamp: number
  href?: string
}

const activityIcons: Record<AnalyticsEvent["type"], LucideIcon> = {
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

function loadInterviewProgress(): { setup: { targetRole?: string; interviewType?: string }; savedAt: number } | null {
  try {
    const raw = window.localStorage.getItem("hirefit_interview_progress")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { setup?: { targetRole?: string; interviewType?: string }; savedAt?: number }
    if (!parsed?.setup?.targetRole) return null
    return { setup: parsed.setup, savedAt: parsed.savedAt ?? Date.now() }
  } catch {
    return null
  }
}

function loadSavedLetter(): { companyName: string; tone: string } | null {
  try {
    const raw = window.localStorage.getItem("hirefit_cover_letter")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { letter?: string; companyName?: string; tone?: string }
    if (!parsed?.letter) return null
    return { companyName: parsed.companyName ?? "", tone: parsed.tone ?? "Professional" }
  } catch {
    return null
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [readIds, setReadIds] = useState<string[]>([])

  useEffect(() => {
    const events = loadAnalytics()
    const settings = loadSettings()
    const alreadyRead = loadReadNotifications()

    const items: NotificationItem[] = []

    // Welcome — only before any real activity exists.
    if (events.length === 0 && alreadyRead.length === 0) {
      items.push({
        id: "welcome",
        kind: "welcome",
        title: "Welcome to HireFit AI",
        detail: "Run your first resume analysis to start tracking your career metrics.",
        timestamp: Date.now(),
        href: "/analyzer",
      })
    }

    // Module-activity notifications from the analytics store.
    if (settings.notifyModuleActivity) {
      const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp)
      sorted.slice(0, 20).forEach((event) => {
        const summary = getEventSummary(event)
        items.push({
          id: `${event.type}-${event.timestamp}`,
          kind: "activity",
          eventType: event.type,
          title: summary.title,
          detail: summary.detail,
          timestamp: event.timestamp,
          href: `/dashboard`,
        })
      })
    }

    // Actionable reminders derived from persisted module data.
    if (settings.notifyReminders) {
      const interview = loadInterviewProgress()
      if (interview) {
        items.push({
          id: "reminder-interview",
          kind: "reminder",
          title: "Interview in progress",
          detail: `Resume your ${interview.setup.interviewType ?? "Mixed"} interview for ${interview.setup.targetRole}.`,
          timestamp: interview.savedAt,
          href: "/interview",
        })
      }
      const letter = loadSavedLetter()
      if (letter) {
        items.push({
          id: "reminder-cover-letter",
          kind: "reminder",
          title: "Cover letter saved",
          detail: letter.companyName.trim()
            ? `${letter.companyName} · ${letter.tone} tone — review or regenerate.`
            : `General application · ${letter.tone} tone — review or regenerate.`,
          timestamp: Date.now(),
          href: "/cover-letter",
        })
      }
      const coachRaw = window.localStorage.getItem("hirefit_coach_history")
      if (coachRaw) {
        try {
          const parsed = JSON.parse(coachRaw) as { role?: string }[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            items.push({
              id: "reminder-coach",
              kind: "reminder",
              title: "Coach conversation",
              detail: `${parsed.length} messages saved — continue your conversation with the Career Coach.`,
              timestamp: Date.now(),
              href: "/coach",
            })
          }
        } catch {
          // ignore storage failures
        }
      }
    }

    items.sort((a, b) => b.timestamp - a.timestamp)
    setNotifications(items)
    setReadIds(alreadyRead)
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((item) => !readIds.includes(item.id)).length,
    [notifications, readIds]
  )

  const markAllRead = () => {
    const ids = notifications.map((item) => item.id)
    markNotificationsRead(ids)
    setReadIds((current) => Array.from(new Set([...current, ...ids])))
  }

  const kindTone = (kind: NotificationItem["kind"]) => {
    switch (kind) {
      case "welcome":
        return "border-green-500/30 bg-green-500/5"
      case "reminder":
        return "border-yellow-500/30 bg-yellow-500/5"
      default:
        return "border-white/5 bg-white/[0.03]"
    }
  }

  const kindIcon = (item: NotificationItem): LucideIcon => {
    if (item.kind === "welcome") return Sparkles
    if (item.kind === "reminder") return RotateCcw
    return (item.eventType ? activityIcons[item.eventType] : undefined) ?? Bell
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Notifications</h1>
        <p className="text-muted-foreground text-lg">Updates about your resume scans, interviews, and career insights — derived from your real activity.</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
              <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </div>
            <div>
              <CardTitle className="font-headline">Inbox</CardTitle>
              <CardDescription>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}</CardDescription>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0} className="border-white/10 hover:bg-white/5">
            <CheckCheck className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Mark all as read
          </Button>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.03]">
                <Bell className="h-7 w-7 text-muted-foreground/50" strokeWidth={1} />
              </div>
              <h3 className="mt-4 font-headline text-base font-medium">No notifications</h3>
              <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
                Complete a resume analysis, interview, or career module and the updates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((item) => {
                const Icon = kindIcon(item)
                const isUnread = !readIds.includes(item.id)
                const body = (
                  <div className={`flex items-start gap-3.5 rounded-xl border p-4 transition-colors ${kindTone(item.kind)} ${item.href ? "hover:bg-white/[0.06]" : ""}`}>
                    <span className="relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      {isUnread ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary" aria-label="Unread" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-headline font-semibold text-foreground">{item.title}</p>
                        <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          <Clock3 className="h-3 w-3" strokeWidth={1.5} />
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{item.detail}</p>
                    </div>
                    {item.href ? (
                      <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-semibold text-primary sm:inline-flex">
                        Open
                      </span>
                    ) : null}
                  </div>
                )
                return item.href ? (
                  <Link key={item.id} href={item.href} className="block">
                    {body}
                  </Link>
                ) : (
                  <div key={item.id}>{body}</div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">Preferences</CardTitle>
          <CardDescription>Control which notifications you receive from the Settings page.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-white/10 text-muted-foreground">Module activity</Badge>
          <Badge variant="outline" className="border-white/10 text-muted-foreground">Reminders</Badge>
          <Link href="/settings" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10">
            <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
            Manage in Settings
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
