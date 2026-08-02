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
    lines.push(`Coverage: **${coverage.coverage}%** (${coverage.matched} matched · ${coverage.missing} missing keywords)`)
    lines.push("")
  }

  const achievement = computeAchievementStrength(events)
  if (achievement) {
    lines.push("## Achievement Strength")
    lines.push(`Strength: **${achievement.strength}/100** — ${achievement.quantifiedCount} of ${achievement.optimizedCount} bullets carry measurable impact`)
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

  const markdown = useMemo(
    () => buildReportMarkdown(events, savedLetter, savedProgress, coachHistory),
    [events, savedLetter, savedProgress, coachHistory]
  )

  const hasContent = events.length > 0 || Boolean(savedLetter) || Boolean(savedProgress) || coachHistory.length > 0

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
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.03]">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" strokeWidth={1} />
            </div>
            <h3 className="mt-5 font-headline text-xl font-medium">Nothing to export yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Run any HireFit module and your results will be compiled here automatically — no dummy data, ever.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/analyzer" className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                Resume Analyzer
              </Link>
              <Link href="/match" className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                AI Match
              </Link>
              <Link href="/interview" className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                AI Interview
              </Link>
              <Link href="/coach" className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyReport} disabled={exporting !== null} className="border-white/10 hover:bg-white/5">
                {exporting === "copy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCopy className="mr-2 h-4 w-4" strokeWidth={1.5} />}
                Copy
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadPdf} disabled={exporting !== null} className="border-white/10 hover:bg-white/5">
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

          <Card className="glass-card" id="export-report">
            <CardContent>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
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
                      hr: () => <hr className="my-6 border-white/10" />,
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
