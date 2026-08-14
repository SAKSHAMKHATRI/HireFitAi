"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  BarChart3,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Printer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import {
  loadAnalytics,
  computeReadinessBreakdown,
  computeKeywordCoverage,
  computeAchievementStrength,
  computeRecruiterShortlist,
  computeCareerProgress,
  computeSkillGap,
  getEventSummary,
  formatEventTimestamp,
  type AnalyticsEvent,
} from "@/lib/analytics"
import { withTimeout } from "@/lib/resume-upload"
import { auth } from "@/lib/firebase"
import { fetchMyJobMatches, fetchMyResumeAnalyses } from "@/lib/firebase-firestore"
import { selectMatchRecordForAnalysis } from "@/lib/match-selection"
import {
  buildMatchReportMarkdown,
  extractCandidateName,
  normalizeMatchResult,
  type NormalizedMatch,
} from "@/lib/match-report"

type SavedLetter = {
  letter: string
  qualityCheck: Record<string, boolean>
  jobDescription: string
  companyName: string
  hiringManagerName: string
  tone: string
}

type SavedProgress = {
  setup: { targetRole?: string; experienceLevel?: string; interviewType?: string; difficulty?: string }
  questions: { question: string }[]
  answers: string[]
  currentIndex: number
  savedAt: number
}

type CoachMessage = { role: "user" | "assistant"; content: string }

type MatchReportData = {
  match: NormalizedMatch
  candidateName?: string
  jobDescription?: string
  analysisDate?: number
  matchDate?: number
}

function buildReportMarkdown(
  events: AnalyticsEvent[],
  savedLetter: SavedLetter | null,
  savedProgress: SavedProgress | null,
  coachHistory: CoachMessage[]
): string {
  const lines: string[] = []
  lines.push("# HireFit AI — Career Report")
  lines.push(`Generated ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`)
  lines.push("")

  const readiness = computeReadinessBreakdown(events)
  if (readiness) {
    lines.push("## Application Readiness")
    lines.push(`Overall readiness: **${readiness.score}/100**`)
    lines.push(`- Resume (ATS): ${readiness.resume ?? "Not available"}`)
    lines.push(`- Match: ${readiness.match ?? "Not available"}`)
    lines.push(`- Interview: ${readiness.interview ?? "Not available"}`)
    lines.push(`- Roadmap readiness: ${readiness.roadmap ?? "Not available"}`)
    lines.push("")
  }

  const coverage = computeKeywordCoverage(events)
  if (coverage) {
    lines.push("## Keyword Coverage")
    lines.push(
      coverage.source === "match"
        ? `Coverage: **${coverage.coverage}%** (${coverage.matched} matched · ${coverage.missing} missing keywords)`
        : `Coverage: **${coverage.coverage}%** — skill coverage from your resume analysis (${coverage.matched} detected · ${coverage.missing} gaps)`
    )
    lines.push("")
  }

  const achievement = computeAchievementStrength(events)
  if (achievement) {
    lines.push("## Achievement Strength")
    lines.push(
      achievement.source === "optimizer"
        ? `Strength: **${achievement.strength}/100** — ${achievement.quantifiedCount} of ${achievement.optimizedCount} bullets carry measurable impact`
        : `Strength: **${achievement.strength}/100** — ${achievement.quantifiedCount} of ${achievement.optimizedCount} detected achievements are quantified`
    )
    lines.push("")
  }

  const shortlist = computeRecruiterShortlist(events)
  if (shortlist) {
    lines.push("## Recruiter Shortlist")
    lines.push(`${shortlist.label} — ${shortlist.detail}`)
    lines.push("")
  }

  const progress = computeCareerProgress(events)
  lines.push("## Career Progress")
  lines.push(`${progress.completedModules} of ${progress.totalModules} modules engaged (${progress.completionPct}%)`)
  lines.push("")

  const gap = computeSkillGap(events)
  if (gap) {
    lines.push("## Skill Gap Overview")
    if (gap.missingSkills.length > 0) lines.push(`Missing skills: ${gap.missingSkills.join(", ")}`)
    if (gap.prioritySkills.length > 0) {
      lines.push("Priority skills:")
      gap.prioritySkills.forEach((item) => lines.push(`- ${item.skill}: ${item.currentLevel}% → ${item.requiredLevel}%`))
    }
    if (gap.learningProgress !== null) lines.push(`Learning progress: ${gap.learningProgress}% toward roadmap targets`)
    lines.push("")
  }

  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp)
  if (sorted.length > 0) {
    lines.push("## Recent AI Activity")
    sorted.slice(0, 8).forEach((event) => {
      const summary = getEventSummary(event)
      lines.push(`- ${formatEventTimestamp(event.timestamp)} — ${summary.title} — ${summary.detail}`)
    })
    lines.push("")
  }

  if (savedLetter) {
    lines.push("## Saved Cover Letter")
    if (savedLetter.companyName.trim()) lines.push(`Target: ${savedLetter.companyName} · Tone: ${savedLetter.tone}`)
    else lines.push(`Tone: ${savedLetter.tone}`)
    lines.push("")
    lines.push(savedLetter.letter)
    lines.push("")
  }

  if (savedProgress && savedProgress.setup?.targetRole) {
    lines.push("## Interview in Progress")
    lines.push(`${savedProgress.setup.targetRole} · ${savedProgress.setup.interviewType ?? "Mixed"} · ${savedProgress.setup.experienceLevel ?? ""} · ${savedProgress.setup.difficulty ?? ""}`)
    const answered = (savedProgress.answers ?? []).filter((a) => a && a.trim().length > 0).length
    lines.push(`${answered} of ${savedProgress.questions?.length ?? 0} questions answered (saved ${new Date(savedProgress.savedAt).toLocaleDateString()})`)
    lines.push("")
  }

  const recentCoach = coachHistory.slice(-10)
  if (recentCoach.length > 0) {
    lines.push("## Coach Conversation")
    recentCoach.forEach((message) => {
      lines.push(`- **${message.role === "user" ? "You" : "Coach"}**: ${message.content.replace(/\n+/g, " ").slice(0, 240)}`)
    })
    lines.push("")
  }

  return lines.join("\n")
}

export default function ExportReportsPage() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [savedLetter, setSavedLetter] = useState<SavedLetter | null>(null)
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null)
  const [coachHistory, setCoachHistory] = useState<CoachMessage[]>([])
  const [exporting, setExporting] = useState<"docx" | "pdf" | "copy" | null>(null)
  const [matchReport, setMatchReport] = useState<MatchReportData | null>(null)
  const [matchLoading, setMatchLoading] = useState(true)
  const [matchExporting, setMatchExporting] = useState(false)

  useEffect(() => {
    setEvents(loadAnalytics())
    try {
      const rawLetter = window.localStorage.getItem("hirefit_cover_letter")
      if (rawLetter) setSavedLetter(JSON.parse(rawLetter) as SavedLetter)
      const rawProgress = window.localStorage.getItem("hirefit_interview_progress")
      if (rawProgress) setSavedProgress(JSON.parse(rawProgress) as SavedProgress)
      const rawHistory = window.localStorage.getItem("hirefit_coach_history")
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory) as CoachMessage[]
        if (Array.isArray(parsed)) setCoachHistory(parsed.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"))
      }
    } catch {
      // ignore storage failures
    }
  }, [])

  // Load the user's latest AI Match result (owner-scoped) so it can be
  // exported here too. Best-effort: the rest of the page works without it.
  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setMatchLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [analyses, matches] = await Promise.all([
          fetchMyResumeAnalyses(uid),
          fetchMyJobMatches(uid),
        ])
        if (cancelled) return
        const latestAnalysis =
          analyses.find((record) => record.result !== undefined) ?? null
        const linked = selectMatchRecordForAnalysis(matches, latestAnalysis)
        if (linked) {
          const match = normalizeMatchResult(linked.result)
          if (match) {
            setMatchReport({
              match,
              candidateName: extractCandidateName(latestAnalysis?.result),
              jobDescription:
                typeof linked.jobDescription === "string"
                  ? linked.jobDescription
                  : undefined,
              analysisDate: latestAnalysis?.createdAt ?? undefined,
              matchDate: linked.createdAt ?? undefined,
            })
          }
        }
      } catch {
        // Best-effort — the export page still works for other report types.
      } finally {
        if (!cancelled) setMatchLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const markdown = useMemo(
    () => buildReportMarkdown(events, savedLetter, savedProgress, coachHistory),
    [events, savedLetter, savedProgress, coachHistory]
  )

  const matchMarkdown = useMemo(
    () =>
      matchReport
        ? buildMatchReportMarkdown(matchReport.match, {
            candidateName: matchReport.candidateName,
            jobDescription: matchReport.jobDescription,
            analysisDate: matchReport.analysisDate,
            matchDate: matchReport.matchDate,
          })
        : "",
    [matchReport]
  )

  const hasContent =
    events.length > 0 ||
    Boolean(savedLetter) ||
    Boolean(savedProgress) ||
    coachHistory.length > 0 ||
    matchLoading ||
    matchReport !== null

  // Print-only styles so "Download PDF" prints just the report.
  useEffect(() => {
    if (!hasContent) return
    const style = document.createElement("style")
    style.id = "export-report-print-styles"
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #export-report, #export-report * { visibility: visible; }
        #export-report { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        .no-print { display: none !important; }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.getElementById("export-report-print-styles")?.remove()
    }
  }, [hasContent])

  const downloadDocx = async () => {
    if (!hasContent) return
    setExporting("docx")
    try {
      const response = await withTimeout(
        fetch("/api/reports/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown, filename: "hirefit-career-report" }),
        }),
        30000,
        "Report export timed out. Please try again."
      )
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "hirefit-career-report.docx"
      link.click()
      URL.revokeObjectURL(url)
      toast({ title: "Report exported", description: "Your career report was exported as a Word document." })
    } catch {
      toast({ title: "Export failed", description: "Could not create the DOCX file. Please try again.", variant: "destructive" })
    } finally {
      setExporting(null)
    }
  }

  const downloadPdf = () => {
    if (!hasContent) return
    setExporting("pdf")
    // Give the UI a beat to settle, then open the browser print dialog.
    window.setTimeout(() => {
      setExporting(null)
      window.print()
    }, 250)
  }

  const downloadMatchDocx = async () => {
    if (!matchReport || matchExporting) return
    setMatchExporting(true)
    try {
      const response = await withTimeout(
        fetch("/api/reports/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: matchMarkdown, filename: "hirefit-match-report" }),
        }),
        30000,
        "Report export timed out. Please try again."
      )
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "hirefit-match-report.docx"
      link.click()
      URL.revokeObjectURL(url)
      toast({ title: "Match report exported", description: "Your match report was downloaded as a Word document." })
    } catch {
      toast({
        title: "Export failed",
        description: "Could not create the DOCX file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setMatchExporting(false)
    }
  }

  const copyMatchReport = async () => {
    if (!matchReport || matchExporting) return
    setMatchExporting(true)
    try {
      await navigator.clipboard.writeText(matchMarkdown)
      toast({ title: "Match report copied", description: "Your match report was copied to the clipboard." })
    } catch {
      toast({
        title: "Could not copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      })
    } finally {
      setMatchExporting(false)
    }
  }

  const copyReport = async () => {
    if (!hasContent) return
    setExporting("copy")
    try {
      await navigator.clipboard.writeText(markdown)
      toast({ title: "Report copied", description: "Your career report was copied to the clipboard." })
    } catch {
      toast({ title: "Could not copy", description: "Your browser blocked clipboard access.", variant: "destructive" })
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Export Reports</h1>
        <p className="text-muted-foreground text-lg">Compile your real HireFit results into a professional career report.</p>
      </div>

      {!hasContent ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-foreground/[0.03]">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" strokeWidth={1} />
            </div>
            <h3 className="mt-5 font-headline text-xl font-medium">Nothing to export yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Run any HireFit module and your results will be compiled here automatically — no dummy data, ever.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/analyzer" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                Resume Analyzer
              </Link>
              <Link href="/match" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                AI Match
              </Link>
              <Link href="/interview" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                AI Interview
              </Link>
              <Link href="/coach" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                Career Coach
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex flex-wrap items-center gap-2">
              {events.length > 0 ? <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Analytics</Badge> : null}
              {savedLetter ? <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Cover letter</Badge> : null}
              {savedProgress ? <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Interview</Badge> : null}
              {coachHistory.length > 0 ? <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Coach chat</Badge> : null}
              {matchReport ? <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Match report</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyReport} disabled={exporting !== null} className="border-foreground/10 hover:bg-foreground/5">
                {exporting === "copy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCopy className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                Copy
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadPdf} disabled={exporting !== null} className="border-foreground/10 hover:bg-foreground/5">
                {exporting === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                Download PDF
              </Button>
              <Button type="button" size="sm" onClick={downloadDocx} disabled={exporting !== null} className="font-headline">
                {exporting === "docx" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                Download DOCX
              </Button>
            </div>
          </div>

          <Card className="glass-card no-print">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Report Preview</CardTitle>
                <CardDescription>Compiled only from your real HireFit module results.</CardDescription>
              </div>
              <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </CardHeader>
          </Card>

          {/* Full Match Report — latest AI Match result, owner-scoped */}
          {matchLoading ? (
            <Card className="glass-card">
              <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
                Loading your latest match report...
              </CardContent>
            </Card>
          ) : matchReport ? (
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">Full Match Report</CardTitle>
                  <CardDescription>
                    Your latest AI Match result — exportable as a Word document.
                    {matchReport.candidateName ? ` Candidate: ${matchReport.candidateName}.` : ""}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyMatchReport()}
                    disabled={matchExporting}
                    className="border-foreground/10 hover:bg-foreground/5"
                  >
                    {matchExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCopy className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                    Copy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void downloadMatchDocx()}
                    disabled={matchExporting}
                    className="font-headline"
                  >
                    {matchExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                    Download DOCX
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Match Score</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-primary">{matchReport.match.matchScore}%</p>
                </div>
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">ATS Compatibility</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-primary">{matchReport.match.atsCompatibility}%</p>
                </div>
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Matched Skills</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-green-500">{matchReport.match.matchedSkills.length}</p>
                </div>
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Missing Skills</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-yellow-400">{matchReport.match.missingSkills.length}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="glass-card" id="export-report">
            <CardContent>
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 sm:p-10">
                <div className="mx-auto max-w-[70ch] text-sm leading-7 text-muted-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="mb-2 font-headline text-2xl font-bold text-foreground">{children}</h1>,
                      h2: ({ children }) => <h2 className="mt-8 mb-2 font-headline text-lg font-semibold text-foreground">{children}</h2>,
                      p: ({ children }) => <p className="mb-3">{children}</p>,
                      ul: ({ children }) => <ul className="ml-5 mb-3 list-disc space-y-1.5">{children}</ul>,
                      ol: ({ children }) => <ol className="ml-5 mb-3 list-decimal space-y-1.5">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      hr: () => <hr className="my-6 border-foreground/10" />,
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground no-print">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Every figure is derived from your actual module results. Nothing is fabricated.
          </div>
        </>
      )}
    </div>
  )
}
