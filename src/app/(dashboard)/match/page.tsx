"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  Download,
  FileCheck2,
  Gauge,
  History,
  Loader2,
  RotateCcw,
  Target,
  X,
} from "lucide-react"

import { matchResumeToJob } from "@/ai/flows/match-resume-to-job-flow"
import { JdLibraryPanel } from "@/components/match/jd-library-panel"
import { ListCard, NumberedCard } from "@/components/match/match-cards"
import { MetricCard } from "@/components/dashboard/metric-card"
import { ResumePdfUploader } from "@/components/resume/resume-pdf-uploader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useResumePdfUpload } from "@/hooks/use-resume-pdf-upload"
import { recordActivity, formatEventTimestamp } from "@/lib/analytics"
import { toast } from "@/hooks/use-toast"
import { auth } from "@/lib/firebase"
import {
  fetchMyJobMatches,
  fetchMyResumeAnalyses,
  type AnalysisRecord,
} from "@/lib/firebase-firestore"
import { selectMatchRecordsForAnalysis } from "@/lib/match-selection"
import {
  buildMatchReportMarkdown,
  extractCandidateName,
  normalizeMatchResult,
  type NormalizedMatch,
} from "@/lib/match-report"
import { fileToDataUri, friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"

const matchTimeoutMs = 60000
const maxJobDescriptionLength = 16000

type MatchStatus = "idle" | "uploading" | "analyzing" | "complete" | "error"

export default function MatchPage() {
  const [jobDescription, setJobDescription] = useState("")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<MatchStatus>("idle")
  const [result, setResult] = useState<NormalizedMatch | null>(null)
  const [matchDate, setMatchDate] = useState<number | null>(null)
  /** Id of the match record currently displayed (fresh run or restored). */
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  /** The active resume analysis the current match belongs to. */
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null)
  /** Previous match reports for the active analysis, newest first. */
  const [matchHistory, setMatchHistory] = useState<AnalysisRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const upload = useResumePdfUpload(() => {
    setProgress(0)
    setError("")
    setStatus("idle")
    setResult(null)
    setMatchDate(null)
    setActiveHistoryId(null)
  })

  /**
   * Loads the active (latest) resume analysis and its match history, then
   * opens with the newest match displayed. Reuses the same analysis↔match
   * selection rules as the Resume Analyzer. Never calls Gemini.
   */
  const refreshHistory = useCallback(async () => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setHistoryLoading(false)
      return
    }
    try {
      const [analyses, matches] = await Promise.all([
        fetchMyResumeAnalyses(uid),
        fetchMyJobMatches(uid),
      ])
      const latest = analyses.find((record) => record.result !== undefined) ?? null
      setAnalysis(latest)
      const history = selectMatchRecordsForAnalysis(matches, latest)
      setMatchHistory(history as AnalysisRecord[])
      // Open with the newest historical match — restoring never re-runs AI
      // and never creates a new record.
      const newest = history[0]
      if (newest) {
        const restored = normalizeMatchResult(newest.result)
        if (restored) {
          setResult(restored)
          setMatchDate(newest.createdAt ?? null)
          setActiveHistoryId(newest.id)
          setStatus("complete")
          if (typeof newest.jobDescription === "string" && newest.jobDescription.trim()) {
            setJobDescription(newest.jobDescription)
          }
        }
      }
    } catch {
      // History is best-effort — the module works without it.
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshHistory()
  }, [refreshHistory])

  /** Restores a historical match report without calling AI or saving anything. */
  const restoreMatch = (record: AnalysisRecord) => {
    if (status === "uploading" || status === "analyzing") return
    const restored = normalizeMatchResult(record.result)
    if (!restored) return
    setError("")
    setResult(restored)
    setMatchDate(record.createdAt ?? null)
    setActiveHistoryId(record.id)
    setStatus("complete")
    if (typeof record.jobDescription === "string" && record.jobDescription.trim()) {
      setJobDescription(record.jobDescription)
    }
  }

  const clearJobDescription = () => {
    setJobDescription("")
    setError("")
    setResult(null)
    setMatchDate(null)
    setActiveHistoryId(null)
    setStatus(upload.file ? "idle" : status)
    setProgress(0)
  }

  const resetMatch = () => {
    setProgress(0)
    setError("")
    setStatus("idle")
    setResult(null)
    setMatchDate(null)
    setActiveHistoryId(null)
  }

  /** Exports the displayed match report as DOCX via the existing export route. */
  const exportMatchReport = async () => {
    if (!result || exporting) return
    setExporting(true)
    try {
      const markdown = buildMatchReportMarkdown(result, {
        candidateName: extractCandidateName(analysis?.result),
        jobDescription: jobDescription.trim() || undefined,
        analysisDate: analysis?.createdAt ?? undefined,
        matchDate: matchDate ?? undefined,
      })
      const response = await withTimeout(
        fetch("/api/reports/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown, filename: "hirefit-match-report" }),
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
      setExporting(false)
    }
  }

  const analyzeMatch = async () => {
    if (!upload.file) {
      setError("Please upload a PDF resume before running the match analysis.")
      return
    }

    const trimmedDescription = jobDescription.trim()
    if (!trimmedDescription) {
      setError("Please paste the complete Job Description before analyzing.")
      return
    }

    if (trimmedDescription.length > maxJobDescriptionLength) {
      setError("Job Description is too large. Please keep it under 16,000 characters.")
      return
    }

    setError("")
    setResult(null)
    setMatchDate(null)
    setActiveHistoryId(null)
    setStatus("uploading")
    setProgress(18)

    try {
      const resumeDataUri = await fileToDataUri(upload.file)
      setStatus("analyzing")
      setProgress(42)

      const progressTimer = window.setInterval(() => {
        setProgress((current) => Math.min(current + 3, 92))
      }, 700)

      try {
        const output = await withTimeout(
          matchResumeToJob({ resumeDataUri, jobDescription: trimmedDescription }),
          matchTimeoutMs,
          "Resume matching timed out. Please try again with a shorter Job Description."
        )
        window.clearInterval(progressTimer)
        const normalized = normalizeMatchResult(output)
        if (!normalized) throw new Error("Gemini returned an unreadable match report. Please try again.")
        const now = Date.now()
        setResult(normalized)
        setMatchDate(now)
        setProgress(100)
        setStatus("complete")
        // Persist the full report so it survives a refresh everywhere (the
        // Resume Analyzer restores it from Firestore), linked to the active
        // resume analysis so it appears in this analysis's match history.
        await recordActivity(
          {
            type: "jobMatched",
            timestamp: now,
            matchScore: normalized.matchScore,
            atsCompatibility: normalized.atsCompatibility,
            matchedSkills: normalized.matchedSkills,
            missingSkills: normalized.missingSkills,
            matchedKeywords: normalized.matchedKeywords,
            missingKeywords: normalized.missingKeywords,
          },
          {
            fileName: upload.file?.name,
            result: output,
            analysisId: analysis?.id ?? undefined,
            jobDescription: trimmedDescription,
          }
        )
        // Refresh history so the new report appears under Previous Match
        // Reports (Firestore pending writes are visible to the next read).
        await refreshHistory()
      } catch (matchError) {
        window.clearInterval(progressTimer)
        throw matchError
      }
    } catch (matchError) {
      setProgress(0)
      setStatus("error")
      setError(friendlyErrorMessage(matchError, "Resume match analysis failed. Please try again."))
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">AI Match</h1>
        <p className="text-muted-foreground text-lg">Compare your resume against a job description and generate a Gemini-powered ATS compatibility report.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <ResumePdfUploader
            upload={upload}
            progress={progress}
            status={status}
            error={error}
            helperText="PDF only. Maximum file size 8 MB. This resume will be compared with the job description."
            loadingMessage="Comparing Resume with Job Description..."
            readyMessage="Resume Ready"
            completeMessage="Match Complete"
            validationLabel="Match analysis"
            onReset={resetMatch}
          />
        </div>

        <div className="space-y-6 xl:col-span-7">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Resume Preview</CardTitle>
                <CardDescription>Confirm the uploaded PDF before running the match report.</CardDescription>
              </div>
              {status === "complete" ? <Badge variant="outline" className="border-primary/30 text-primary">Gemini Match</Badge> : null}
            </CardHeader>
            <CardContent>
              <div className="min-h-[420px] overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03]">
                {upload.previewUrl ? (
                  <object data={upload.previewUrl} type="application/pdf" className="h-[420px] w-full">
                    <div className="flex h-[420px] flex-col items-center justify-center p-8 text-center">
                      <FileCheck2 className="mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1} />
                      <p className="text-sm text-muted-foreground">PDF preview is not available in this browser.</p>
                    </div>
                  </object>
                ) : (
                  <div className="flex h-[420px] flex-col items-center justify-center p-8 text-center opacity-60">
                    <FileCheck2 className="mb-5 h-16 w-16 text-muted-foreground" strokeWidth={0.7} />
                    <h3 className="font-headline text-xl font-medium">No resume uploaded</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Upload a PDF resume to preview it before matching.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Job Description</CardTitle>
                <CardDescription>Paste the full role description for accurate ATS matching.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearJobDescription} disabled={!jobDescription} className="border-foreground/10 hover:bg-foreground/5">
                <X className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Clear
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={jobDescription}
                onChange={(event) => {
                  setJobDescription(event.target.value)
                  setError("")
                }}
                placeholder="Paste the complete Job Description here..."
                className="min-h-[280px] resize-y bg-background/50 border-foreground/10 text-sm leading-relaxed"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-xs ${jobDescription.length > maxJobDescriptionLength ? "text-red-400" : "text-muted-foreground"}`}>
                  {jobDescription.length.toLocaleString()} / {maxJobDescriptionLength.toLocaleString()} characters
                </p>
                <Button type="button" onClick={analyzeMatch} disabled={status === "uploading" || status === "analyzing"} className="h-11 font-headline">
                  {status === "uploading" || status === "analyzing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Comparing Resume with Job Description...
                    </>
                  ) : (
                    <>
                      <Target className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Analyze Match
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Job Description Library — shared with the Resume Analyzer */}
      <JdLibraryPanel
        currentJobDescription={jobDescription}
        onLoad={(loadedJd) => {
          setJobDescription(loadedJd)
          setError("")
        }}
        disabled={status === "uploading" || status === "analyzing"}
      />

      {status === "analyzing" ? (
        <Card className="glass-card border-primary/20">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="font-headline text-sm uppercase tracking-widest">Comparing Resume with Job Description...</p>
            </div>
            <Progress value={progress} className="h-1.5" />
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-headline text-xl font-semibold">Current Match</h2>
            {activeHistoryId ? (
              <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">Restored from history</Badge>
            ) : (
              <Badge variant="outline" className="border-primary/30 text-primary">Latest run</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <MetricCard title="Match Score" value={`${result.matchScore}%`} description="Overall role compatibility" icon={Target} trend={{ value: "Live", positive: true }} />
            <MetricCard title="ATS Compatibility" value={`${result.atsCompatibility}%`} description="Keyword and structure alignment" icon={Gauge} trend={{ value: "Gemini", positive: true }} />
          </div>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Recruiter Summary</CardTitle>
                <CardDescription>Compatibility report grounded only in the resume and job description.</CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void exportMatchReport()}
                  disabled={exporting}
                  className="border-foreground/10 hover:bg-foreground/5"
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  )}
                  Export Report
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetMatch} className="border-foreground/10 hover:bg-foreground/5">
                  <RotateCcw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Reset Results
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {result.recruiterSummary ? (
                <p className="text-sm leading-7 text-muted-foreground">{result.recruiterSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No recruiter summary could be generated.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ListCard title="Matching Skills" description="Skills present in both resume and JD." items={result.matchedSkills} />
            <ListCard title="Missing Skills" description="JD skills not explicitly found in the resume." items={result.missingSkills} tone="yellow" />
            <ListCard title="Matching Keywords" description="High-value keywords already aligned." items={result.matchedKeywords} />
            <ListCard title="Missing Keywords" description="Important JD keywords not found in the resume." items={result.missingKeywords} tone="yellow" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <NumberedCard title="Strengths" description="Evidence-backed match strengths." items={result.strengths} />
            <NumberedCard title="Weaknesses" description="Gaps that may reduce match quality." items={result.weaknesses} tone="yellow" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <NumberedCard title="Priority Improvements" description="Highest-impact changes to make first." items={result.priorityActions} />
            <NumberedCard title="Improvement Suggestions" description="Resume edits grounded in provided inputs." items={result.improvementSuggestions} />
            <NumberedCard title="Recommended Projects" description="Future projects to demonstrate missing requirements." items={result.recommendedProjects} tone="yellow" />
          </div>
        </div>
      ) : null}

      {/* Previous Match Reports — per-analysis history for the active analysis */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
            <History className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Previous Match Reports
          </CardTitle>
          <CardDescription>
            Past AI Match results for your current resume analysis. Restoring one never re-runs Gemini and never creates a new record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
              Loading previous match reports...
            </div>
          ) : !analysis ? (
            <div className="rounded-xl border border-dashed border-foreground/10 p-6 text-center">
              <History className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" strokeWidth={1} />
              <p className="text-sm font-medium">No resume analysis selected</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Run a resume analysis in the Resume Analyzer first — match reports are grouped by the resume analysis they were computed against.
              </p>
            </div>
          ) : matchHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/10 p-6 text-center">
              <History className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" strokeWidth={1} />
              <p className="text-sm font-medium">No previous match reports</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Run AI Match once and the report is saved here automatically, ready to restore or export.
              </p>
            </div>
          ) : (
            <ul className="grid gap-2">
              {matchHistory.map((record) => {
                const current = record.id === activeHistoryId
                const restored = normalizeMatchResult(record.result)
                const jdLabel =
                  typeof record.jobDescription === "string" && record.jobDescription.trim()
                    ? record.jobDescription.trim().slice(0, 60)
                    : "Match report"
                return (
                  <li
                    key={record.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                      current
                        ? "border-primary/30 bg-primary/5"
                        : "border-foreground/5 bg-foreground/[0.02]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{jdLabel}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatEventTimestamp(record.createdAt ?? 0)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {record.matchScore !== undefined ? (
                        <Badge variant="outline" className="border-primary/30 text-primary">Match {record.matchScore}%</Badge>
                      ) : null}
                      {record.atsCompatibility !== undefined ? (
                        <Badge variant="outline" className="border-foreground/20 text-muted-foreground">ATS {record.atsCompatibility}%</Badge>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-foreground/10"
                        disabled={current || !restored || status === "uploading" || status === "analyzing"}
                        onClick={() => restoreMatch(record)}
                      >
                        {current ? <FileCheck2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> : <History className="mr-1.5 h-4 w-4" strokeWidth={1.5} />}
                        {current ? "Viewing" : restored ? "View" : "Unavailable"}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {status === "error" && error ? (
        <Card className="glass-card border-red-500/20">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
