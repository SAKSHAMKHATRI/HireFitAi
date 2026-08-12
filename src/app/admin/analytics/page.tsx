"use client"

import { useMemo } from "react"
import { BarChart3, RefreshCw, ShieldAlert } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { useAdminData } from "@/hooks/use-admin-data"

const chartConfig = {
  users: { label: "New Users", color: "var(--color-brand-green)" },
  analyses: { label: "Analyses", color: "#38bdf8" },
  match: { label: "Avg Match", color: "#38bdf8" },
  ats: { label: "Avg ATS", color: "#a78bfa" },
} satisfies ChartConfig

const daysBack = 14

function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function dayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function AdminAnalyticsPage() {
  const { users, analyses, loading, error, reload } = useAdminData({ roles: false })

  const userGrowth = useMemo(() => {
    const buckets = new Map<string, { key: string; label: string; count: number }>()
    users.forEach((record) => {
      if (typeof record.createdAt !== "number") return
      const date = new Date(record.createdAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
      const existing = buckets.get(key)
      if (existing) {
        existing.count += 1
      } else {
        buckets.set(key, { key, label, count: 1 })
      }
    })
    return Array.from(buckets.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ label, count }) => ({ label, users: count }))
  }, [users])

  const activitySeries = useMemo(() => {
    type DayBucket = {
      timestamp: number
      label: string
      analyses: number
      match: number[]
      ats: number[]
    }
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const days: DayBucket[] = []
    for (let offset = daysBack - 1; offset >= 0; offset--) {
      const timestamp = now.getTime() - offset * 24 * 60 * 60 * 1000
      days.push({ timestamp, label: dayLabel(timestamp), analyses: 0, match: [], ats: [] })
    }
    const byDay = new Map<string, DayBucket>()
    days.forEach((day) => byDay.set(dayKey(day.timestamp), day))
    analyses.forEach((analysis) => {
      const bucket = byDay.get(dayKey(analysis.createdAt ?? 0))
      if (!bucket) return
      bucket.analyses += 1
      const match = analysis.matchScore ?? analysis.atsCompatibility
      const ats = analysis.atsScore
      if (typeof match === "number") bucket.match.push(match)
      if (typeof ats === "number") bucket.ats.push(ats)
    })
    const average = (values: number[]) =>
      values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    return days.map((day) => ({ ...day, match: average(day.match), ats: average(day.ats) }))
  }, [analyses])

  const topSkills = useMemo(() => {
    const counts = new Map<string, number>()
    analyses.forEach((analysis) => {
      ;(analysis.skills ?? []).forEach((skill) => {
        counts.set(skill, (counts.get(skill) ?? 0) + 1)
      })
    })
    const ranked = Array.from(counts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    const max = ranked[0]?.count ?? 1
    return ranked.map((item) => ({ ...item, pct: Math.round((item.count / max) * 100) }))
  }, [analyses])

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AdminPageHeader title="Analytics" description="Platform growth and activity derived from real Firebase data." />
        <Card className="glass-card border-red-500/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ShieldAlert className="h-8 w-8 text-red-400" strokeWidth={1.5} />
            <p className="max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AdminPageHeader
        title="Analytics"
        description="Platform growth and activity derived from real Firebase data."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-headline tracking-widest uppercase">User Growth</CardTitle>
            <CardDescription>New account registrations per month.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : userGrowth.length === 0 ? (
              <EmptyChart message="No signups recorded yet." />
            ) : (
              <div className="h-[240px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={userGrowth} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.12)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="users" fill="var(--color-users)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-headline tracking-widest uppercase">Module Activity</CardTitle>
            <CardDescription>Analyses recorded per day over the last {daysBack} days.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : activitySeries.every((day) => day.analyses === 0) ? (
              <EmptyChart message="No module activity in the last 14 days." />
            ) : (
              <div className="h-[240px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart data={activitySeries} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.12)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="analyses" fill="var(--color-analyses)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">Score Trends</CardTitle>
          <CardDescription>Average match and ATS scores per day over the last {daysBack} days.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : activitySeries.every((day) => day.match === null && day.ats === null) ? (
            <EmptyChart message="No scored analyses in the last 14 days." />
          ) : (
            <div className="h-[240px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart data={activitySeries} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(128,128,128,0.12)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Line dataKey="match" type="monotone" stroke="var(--color-match)" strokeWidth={2} dot={false} connectNulls />
                  <Line dataKey="ats" type="monotone" stroke="var(--color-ats)" strokeWidth={2} dot={false} connectNulls />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">Most Analyzed Skills</CardTitle>
          <CardDescription>Skills and topics mentioned most across all analysis records.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : topSkills.length === 0 ? (
            <EmptyChart message="No skill data recorded yet." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {topSkills.map((item, index) => (
                <div key={item.skill} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <span className="truncate font-medium">{item.skill}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{item.count}×</span>
                  </div>
                  <Progress value={item.pct} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs leading-5 text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
        Charts reflect data collected after this phase ships — existing local-only history is not included.
      </p>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground/50" strokeWidth={1} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
