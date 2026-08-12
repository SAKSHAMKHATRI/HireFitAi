"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ShieldCheck,
  Target,
  Search,
  Activity,
  Layers,
  Cpu,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PerformanceTrends } from "@/components/dashboard/performance-trends"
import { SkillGapOverview } from "@/components/dashboard/skill-gap-overview"
import { CareerProgress } from "@/components/dashboard/career-progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  loadAnalytics,
  computeReadinessBreakdown,
  computeReadinessTrend,
  computeKeywordCoverage,
  computeKeywordCoverageTrend,
  computeAchievementStrength,
  computeAchievementStrengthTrend,
  computeRecruiterShortlist,
  type AnalyticsEvent,
} from "@/lib/analytics"

type HealthItem = {
  label: string
  value: number | null
  detail: string
}

export default function Dashboard() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([])

  useEffect(() => {
    setEvents(loadAnalytics())
  }, [])

  const readiness = useMemo(() => computeReadinessBreakdown(events), [events])
  const readinessTrend = useMemo(() => computeReadinessTrend(events), [events])
  const keywordCoverage = useMemo(() => computeKeywordCoverage(events), [events])
  const keywordCoverageTrend = useMemo(() => computeKeywordCoverageTrend(events), [events])
  const achievement = useMemo(() => computeAchievementStrength(events), [events])
  const achievementTrend = useMemo(() => computeAchievementStrengthTrend(events), [events])
  const shortlist = useMemo(() => computeRecruiterShortlist(events), [events])

  // Only pair a trend chip with the metric when both come from the same
  // source (e.g. never an analyzer value with a stale AI Match trend).
  const keywordTrend =
    keywordCoverageTrend && keywordCoverageTrend.source === keywordCoverage?.source
      ? keywordCoverageTrend
      : undefined
  const achievementTrendChip =
    achievementTrend && achievementTrend.source === achievement?.source
      ? achievementTrend
      : undefined

  const healthItems = useMemo<HealthItem[]>(() => {
    const resumeAnalyzed = events
      .filter((event) => event.type === "resumeAnalyzed")
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    const jobMatched = events
      .filter((event) => event.type === "jobMatched")
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    const hireEvaluated = events
      .filter((event) => event.type === "hireEvaluated")
      .sort((a, b) => b.timestamp - a.timestamp)[0]

    const atsCompatibility = resumeAnalyzed?.atsScore ?? jobMatched?.atsCompatibility ?? null
    const technicalAlignment = jobMatched?.matchScore ?? hireEvaluated?.matchScore ?? null
    const totalSkills = resumeAnalyzed
      ? resumeAnalyzed.technicalSkills.length + resumeAnalyzed.softSkills.length
      : 0
    const softSkillVariance =
      resumeAnalyzed && totalSkills > 0
        ? Math.round((resumeAnalyzed.softSkills.length / totalSkills) * 100)
        : null
    const sectionScores = resumeAnalyzed?.sectionScores

    return [
      { label: "ATS Compatibility", value: atsCompatibility, detail: "Latest resume analysis" },
      { label: "Technical Alignment", value: technicalAlignment, detail: "Latest job match" },
      { label: "Soft Skill Variance", value: softSkillVariance, detail: "Detected skill mix" },
      ...(sectionScores
        ? [
            { label: "Resume Structure", value: sectionScores.structure, detail: "Headings and ATS layout" },
            { label: "Readability", value: sectionScores.readability, detail: "Scannability and phrasing" },
            { label: "Achievement Quality", value: sectionScores.achievements, detail: "Measurable wins in resume" },
          ]
        : []),
    ]
  }, [events])

  const healthAvailable = healthItems.some((item) => item.value !== null)
  const readinessSources = readiness
    ? [readiness.resume, readiness.match, readiness.interview, readiness.roadmap].filter(
        (value): value is number => typeof value === "number"
      ).length
    : 0

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Command Center</h1>
        <p className="text-muted-foreground text-lg">Real-time analysis of your professional profile ecosystem, derived live from your HireFit module results.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Application Readiness"
          value={readiness ? `${readiness.score}/100` : "—"}
          description={
            readiness
              ? `Resume ${readiness.resume ?? "—"} · Match ${readiness.match ?? "—"} · Interview ${readiness.interview ?? "—"} · Roadmap ${readiness.roadmap ?? "—"}`
              : undefined
          }
          icon={ShieldCheck}
          trend={readinessTrend ?? undefined}
          empty={!readiness}
          actionHref="/analyzer"
          actionLabel="Complete Resume Analysis"
        />
        <MetricCard
          title="Recruiter Shortlist"
          value={shortlist?.label ?? "—"}
          description={shortlist?.detail}
          icon={Target}
          empty={!shortlist}
          actionHref="/evaluator"
          actionLabel="Run H.I.R.E Evaluator"
        />
        <MetricCard
          title="Keyword Coverage"
          value={keywordCoverage ? `${keywordCoverage.coverage}%` : "—"}
          description={
            keywordCoverage
              ? keywordCoverage.source === "match"
                ? `${keywordCoverage.matched} matched · ${keywordCoverage.missing} missing keywords`
                : `${keywordCoverage.matched} skills detected · ${keywordCoverage.missing} gaps — from resume analysis`
              : undefined
          }
          icon={Search}
          trend={keywordTrend}
          empty={!keywordCoverage}
          actionHref="/match"
          actionLabel="Run AI Match"
        />
        <MetricCard
          title="Achievement Strength"
          value={achievement ? `${achievement.strength}/100` : "—"}
          description={
            achievement
              ? achievement.source === "optimizer"
                ? `${achievement.quantifiedCount} of ${achievement.optimizedCount} bullets carry measurable impact`
                : `${achievement.quantifiedCount} of ${achievement.optimizedCount} detected achievements are quantified`
              : undefined
          }
          icon={Activity}
          trend={achievementTrendChip}
          empty={!achievement}
          actionHref="/optimizer"
          actionLabel="Optimize Bullets"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 glass-card">
          <CardHeader>
            <CardTitle className="font-headline">Resume Health Dashboard</CardTitle>
            <CardDescription>Your core performance metrics, computed from your latest module results.</CardDescription>
          </CardHeader>
          <CardContent>
            {!healthAvailable ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-12 text-center">
                <BarChart3 className="mb-4 h-10 w-10 text-muted-foreground" strokeWidth={1} />
                <h3 className="font-headline text-lg font-medium">No health metrics yet</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Run the Resume Analyzer and AI Match to unlock your ATS compatibility, technical alignment, and skill mix.
                </p>
                <Link href="/analyzer" className="mt-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10">
                  Run Resume Analyzer
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {healthItems.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground uppercase font-headline tracking-widest text-xs">{item.label}</span>
                        <span className="font-bold">{item.value !== null ? `${item.value}%` : "—"}</span>
                      </div>
                      <Progress value={item.value ?? 0} className="h-1.5" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        {item.value !== null ? item.detail : "Not available yet"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-center p-6 border rounded-xl border-foreground/5 bg-foreground/[0.02]">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1} />
                  {readiness ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Your overall application readiness is <span className="text-foreground font-bold">{readiness.score}/100</span>, derived from{" "}
                      <span className="underline decoration-muted-foreground/30">{readinessSources} HireFit source{readinessSources === 1 ? "" : "s"}</span>.
                    </p>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">
                      Complete a Resume Analysis to start tracking your professional health over time.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 glass-card">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/evaluator" className="flex items-center gap-3 p-3 rounded-lg border border-foreground/5 hover:bg-foreground/[0.05] transition-all text-sm text-left group">
              <Cpu className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Run H.I.R.E. Scan</p>
                <p className="text-xs text-muted-foreground">Detailed match analysis</p>
              </div>
            </Link>
            <Link href="/optimizer" className="flex items-center gap-3 p-3 rounded-lg border border-foreground/5 hover:bg-foreground/[0.05] transition-all text-sm text-left group">
              <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Optimize Bullets</p>
                <p className="text-xs text-muted-foreground">Refine your achievements</p>
              </div>
            </Link>
            <Link href="/recruiter" className="flex items-center gap-3 p-3 rounded-lg border border-foreground/5 hover:bg-foreground/[0.05] transition-all text-sm text-left group">
              <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Recruiter Mode</p>
                <p className="text-xs text-muted-foreground">Shortlist probability</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentActivity events={events} />
        <div className="lg:col-span-2">
          <PerformanceTrends events={events} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkillGapOverview events={events} />
        </div>
        <CareerProgress events={events} />
      </div>
    </div>
  )
}
