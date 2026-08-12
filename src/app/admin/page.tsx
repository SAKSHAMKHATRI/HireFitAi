"use client"

import { useMemo } from "react"
import {
  Activity,
  ArrowDownUp,
  CalendarClock,
  FileSearch,
  Gauge,
  RefreshCw,
  Target,
  Users,
} from "lucide-react"
import Link from "next/link"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { StatCard } from "@/components/admin/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminData } from "@/hooks/use-admin-data"
import { useAuth } from "@/components/auth/auth-provider"
import { formatRelativeTime, formatEventTimestamp } from "@/lib/analytics"

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function startOfToday(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

export default function AdminOverviewPage() {
  const { user } = useAuth()
  const { users, analyses, loading, error, reload } = useAdminData({ roles: false })

  const stats = useMemo(() => {
    const todayStart = startOfToday()
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const analysesToday = analyses.filter((analysis) => analysis.createdAt >= todayStart).length
    const activeUsers = users.filter(
      (record) =>
        (record.lastActiveAt ?? 0) >= weekAgo || (record.createdAt ?? 0) >= weekAgo
    ).length

    const matchScores = analyses
      .map((analysis) => analysis.matchScore ?? analysis.atsCompatibility ?? null)
      .filter((value): value is number => typeof value === "number")
    const atsScores = analyses
      .map((analysis) => analysis.atsScore ?? null)
      .filter((value): value is number => typeof value === "number")

    return {
      totalUsers: users.length,
      totalAnalyses: analyses.length,
      analysesToday,
      activeUsers,
      avgMatch: average(matchScores),
      avgAts: average(atsScores),
    }
  }, [users, analyses])

  const recentSignups = useMemo(
    () =>
      [...users]
        .filter((record) => typeof record.createdAt === "number")
        .sort((a, b) => (b.createdAt as number) - (a.createdAt as number))
        .slice(0, 6),
    [users]
  )

  const recentAnalyses = useMemo(() => analyses.slice(0, 6), [analyses])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AdminPageHeader
        title="Admin Overview"
        description="Live platform statistics derived from real Firebase data."
      />

      {error ? (
        <Card className="glass-card border-red-500/30">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10">
              <Activity className="h-6 w-6 text-red-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-headline text-lg font-medium">Could not load admin data</h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Users" value={stats.totalUsers} description="Registered accounts" icon={Users} loading={loading} />
          <StatCard title="Total Analyses" value={stats.totalAnalyses} description="Module runs recorded" icon={FileSearch} loading={loading} />
          <StatCard title="Analyses Today" value={stats.analysesToday} description="Since midnight (device time)" icon={CalendarClock} loading={loading} />
          <StatCard title="Active Users" value={stats.activeUsers} description="Active in the last 7 days" icon={Activity} loading={loading} />
          <StatCard
            title="Avg Match Score"
            value={stats.avgMatch !== null ? `${stats.avgMatch}%` : "—"}
            description="Across matches and evaluations"
            icon={Target}
            loading={loading}
          />
          <StatCard
            title="Avg ATS Score"
            value={stats.avgAts !== null ? `${stats.avgAts}%` : "—"}
            description="Across resume analyses"
            icon={Gauge}
            loading={loading}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Recent Signups</CardTitle>
              <CardDescription>Newest accounts first.</CardDescription>
            </div>
            <Link href="/admin/users" className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10">
              View all
              <ArrowDownUp className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : recentSignups.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No accounts have registered yet.</p>
            ) : (
              <ul className="grid gap-2">
                {recentSignups.map((record) => (
                  <li key={record.uid} className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(String(record.name ?? "?").trim()[0] ?? "?").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{String(record.name ?? "Unknown")}</p>
                      <p className="truncate text-xs text-muted-foreground">{String(record.email ?? "")}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {typeof record.createdAt === "number" ? formatRelativeTime(record.createdAt) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Recent Analyses</CardTitle>
              <CardDescription>Latest module activity.</CardDescription>
            </div>
            <Link href="/admin/analyses" className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10">
              View all
              <ArrowDownUp className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : recentAnalyses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No analyses recorded yet. They appear here as users run HireFit modules.
              </p>
            ) : (
              <ul className="grid gap-2">
                {recentAnalyses.map((analysis) => (
                  <li key={analysis.id} className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10">
                      <FileSearch className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{String(analysis.userName ?? "Unknown user")}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {analysis.fileName || analysis.type} · {formatEventTimestamp(analysis.createdAt ?? 0)}
                      </p>
                    </div>
                    {analysis.atsScore !== undefined ? (
                      <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">ATS {analysis.atsScore}%</Badge>
                    ) : null}
                    {analysis.matchScore !== undefined ? (
                      <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">Match {analysis.matchScore}%</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{user?.email}</span> · Admin data is read directly from Firestore; users without a role document are treated as regular users.
      </p>
    </div>
  )
}
