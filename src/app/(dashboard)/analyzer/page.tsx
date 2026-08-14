"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Boxes,
  Briefcase,
  Download,
  FileCheck2,
  FileText,
  Gauge,
  GraduationCap,
  History,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Target,
  Trophy,
  User,
  X,
} from "lucide-react"
import { analyzeResume } from "@/ai/flows/analyze-resume-flow"
import { matchResumeToJob } from "@/ai/flows/match-resume-to-job-flow"
import { ListCard, NumberedCard } from "@/components/match/match-cards"
import { JdLibraryPanel } from "@/components/match/jd-library-panel"
import { MetricCard } from "@/components/dashboard/metric-card"
import { ResumePdfUploader } from "@/components/resume/resume-pdf-uploader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useResumePdfUpload } from "@/hooks/use-resume-pdf-upload"
import { recordActivity, formatEventTimestamp } from "@/lib/analytics"
import { auth } from "@/lib/firebase"
import { buildMatchReportMarkdown } from "@/lib/match-report"
import { fetchMyJobMatches, fetchMyResumeAnalyses, type AnalysisRecord } from "@/lib/firebase-firestore"
import { selectMatchRecordForAnalysis } from "@/lib/match-selection"
import { fileToDataUri, friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

const analysisTimeoutMs = 45000
const matchTimeoutMs = 60000
const maxJobDescriptionLength = 16000

type AnalyzerStatus = "idle" | "uploading" | "analyzing" | "complete" | "error"
type MatchStatus = "idle" | "matching" | "complete" | "error"

type NormalizedMatch = {
  matchScore: number
  atsCompatibility: number
  matchedSkills: string[]
  missingSkills: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
  strengths: string[]
  weaknesses: string[]
  recruiterSummary: string
  improvementSuggestions: string[]
  recommendedProjects: string[]
  priorityActions: string[]
}

/* ------------------------------------------------------------------ */
/* Normalized analysis view model                                      */
/* ------------------------------------------------------------------ */

type SectionScores = {
  technicalSkills: number
  experience: number
  projects: number
  education: number
  achievements: number
  structure: number
  readability: number
}

type ExperienceItem = { title: string; company: string; period: string; summary: string }
type EducationItem = { institution: string; degree: string; field: string; years: string }
type ProjectItem = { name: string; description: string }
type CertificationItem = { name: string; issuer: string; year: string }

type NormalizedAnalysis = {
  atsScore: number
  keywordCoverage: number
  candidateInfo: { name: string; email: string; phone: string; location: string; links: string[] }
  sectionScores: SectionScores | null
  experience: ExperienceItem[]
  education: EducationItem[]
  projects: ProjectItem[]
  certifications: CertificationItem[]
  achievements: string[]
  missingSections: string[]
  resumeSummary: string
  technicalSkills: string[]
  softSkills: string[]
  missingSkills: string[]
  strengths: string[]
  weaknesses: string[]
  improvementSuggestions: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback
}

function toStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : []
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : []
}

/**
 * Coerces either a fresh AI output or a Firestore-restored result into the
 * UI view model. Returns null when the payload is not a resume analysis at
 * all (protects against stale or malformed history records).
 */
function normalizeAnalysis(raw: unknown): NormalizedAnalysis | null {
  if (!isRecord(raw) || typeof raw.atsScore !== "number") return null

  const candidate = isRecord(raw.candidateInfo) ? raw.candidateInfo : null
  const scores = isRecord(raw.sectionScores) ? raw.sectionScores : null

  return {
    atsScore: toNumber(raw.atsScore),
    keywordCoverage: toNumber(raw.keywordCoverage),
    candidateInfo: {
      name: str(candidate?.name),
      email: str(candidate?.email),
      phone: str(candidate?.phone),
      location: str(candidate?.location),
      links: toStrings(candidate?.links),
    },
    sectionScores: scores
      ? {
          technicalSkills: toNumber(scores.technicalSkills),
          experience: toNumber(scores.experience),
          projects: toNumber(scores.projects),
          education: toNumber(scores.education),
          achievements: toNumber(scores.achievements),
          structure: toNumber(scores.structure),
          readability: toNumber(scores.readability),
        }
      : null,
    experience: asRecordArray(raw.experience)
      .map((item) => ({ title: str(item.title), company: str(item.company), period: str(item.period), summary: str(item.summary) }))
      .filter((item) => item.title || item.company || item.period || item.summary),
    education: asRecordArray(raw.education)
      .map((item) => ({ institution: str(item.institution), degree: str(item.degree), field: str(item.field), years: str(item.years) }))
      .filter((item) => item.institution || item.degree || item.field || item.years),
    projects: asRecordArray(raw.projects)
      .map((item) => ({ name: str(item.name), description: str(item.description) }))
      .filter((item) => item.name || item.description),
    certifications: asRecordArray(raw.certifications)
      .map((item) => ({ name: str(item.name), issuer: str(item.issuer), year: str(item.year) }))
      .filter((item) => item.name || item.issuer || item.year),
    achievements: toStrings(raw.achievements),
    missingSections: toStrings(raw.missingSections),
    resumeSummary: str(raw.resumeSummary),
    technicalSkills: toStrings(raw.technicalSkills),
    softSkills: toStrings(raw.softSkills),
    missingSkills: toStrings(raw.missingSkills),
    strengths: toStrings(raw.strengths),
    weaknesses: toStrings(raw.weaknesses),
    improvementSuggestions: toStrings(raw.improvementSuggestions),
  }
}

/**
 * Coerces either a fresh AI Match output or a Firestore-restored match result
 * into the UI view model. Returns null when the payload is not a match report.
 */
function normalizeMatch(raw: unknown): NormalizedMatch | null {
  if (!isRecord(raw) || typeof raw.matchScore !== "number") return null
  return {
    matchScore: toNumber(raw.matchScore),
    atsCompatibility: toNumber(raw.atsCompatibility),
    matchedSkills: toStrings(raw.matchedSkills),
    missingSkills: toStrings(raw.missingSkills),
    matchedKeywords: toStrings(raw.matchedKeywords),
    missingKeywords: toStrings(raw.missingKeywords),
    strengths: toStrings(raw.strengths),
    weaknesses: toStrings(raw.weaknesses),
    recruiterSummary: str(raw.recruiterSummary),
    improvementSuggestions: toStrings(raw.improvementSuggestions),
    recommendedProjects: toStrings(raw.recommendedProjects),
    priorityActions: toStrings(raw.priorityActions),
  }
}

/**
 * Builds the payload persisted for history. Contact email/phone are stripped:
 * they are not needed to restore the analysis and should not be stored.
 */
function toPersistedResult(raw: unknown): unknown {
  if (!isRecord(raw)) return raw
  const { candidateInfo, ...rest } = raw
  return {
    ...rest,
    ...(isRecord(candidateInfo)
      ? { candidateInfo: { ...candidateInfo, email: "", phone: "" } }
      : {}),
  }
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function atsRating(score: number) {
  if (score >= 80) return { label: "Strong", className: "border-green-500/30 bg-green-500/10 text-green-500" }
  if (score >= 60) return { label: "Good", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" }
  if (score >= 40) return { label: "Fair", className: "border-orange-500/30 bg-orange-500/10 text-orange-400" }
  return { label: "Needs work", className: "border-red-500/30 bg-red-500/10 text-red-400" }
}

function ringColor(score: number) {
  if (score >= 80) return "text-green-500"
  if (score >= 60) return "text-yellow-400"
  if (score >= 40) return "text-orange-400"
  return "text-red-500"
}

function ScoreRing({ value, size = 168, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`ATS score ${value} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700 ease-out", ringColor(value))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline text-4xl font-bold tabular-nums">{value}</span>
        <span className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

function SectionScoreBar({ label, description, value }: { label: string; description: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/70">{description}</p>
        </div>
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-primary">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  )
}

function ContactRow({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
      <span className="min-w-0 truncate">{value}</span>
    </div>
  )
}

const sectionScoreRows: { key: keyof SectionScores; label: string; description: string }[] = [
  { key: "technicalSkills", label: "Technical Skills", description: "Breadth and depth" },
  { key: "experience", label: "Experience", description: "Roles, impact, and detail" },
  { key: "projects", label: "Projects", description: "Quality of project write-ups" },
  { key: "education", label: "Education", description: "Clarity and completeness" },
  { key: "achievements", label: "Achievements", description: "Measurable, quantified wins" },
  { key: "structure", label: "Structure", description: "Headings and ATS layout" },
  { key: "readability", label: "Readability", description: "Scannability and phrasing" },
]

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AnalyzerPage() {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<AnalyzerStatus>("idle")
  const [analysis, setAnalysis] = useState<NormalizedAnalysis | null>(null)
  const [analysisDate, setAnalysisDate] = useState<number | null>(null)
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [history, setHistory] = useState<AnalysisRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [matchHistory, setMatchHistory] = useState<AnalysisRecord[]>([])

  // AI Match state (tied to the currently analyzed resume).
  const [jobDescription, setJobDescription] = useState("")
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle")
  const [matchResult, setMatchResult] = useState<NormalizedMatch | null>(null)
  const [matchError, setMatchError] = useState("")
  const [matchDate, setMatchDate] = useState<number | null>(null)
  const [exportingMatch, setExportingMatch] = useState(false)

  const processingRef = useRef(false)
  const matchProcessingRef = useRef(false)
  const mountedRef = useRef(true)
  /** Data URI of the successfully analyzed resume, reused by AI Match. */
  const resumeDataUriRef = useRef<string | null>(null)
  /** Firestore id of the currently displayed resume analysis record. */
  const analysisRecordIdRef = useRef<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Restore the user's latest saved analysis (Phase 8 — history). Refresh-safe:
  // results persist in Firestore under the authenticated user's own records.
  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setHistoryLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [records, matchRecords] = await Promise.all([
          fetchMyResumeAnalyses(uid),
          fetchMyJobMatches(uid),
        ])
        if (cancelled) return
        setHistory(records)
        setMatchHistory(matchRecords)
        // Never clobber an analysis the user has already started while the
        // history fetch is still in flight.
        if (processingRef.current) return
        const latest = records.find((record) => record.result !== undefined && normalizeAnalysis(record.result) !== null)
        if (latest) {
          const restored = normalizeAnalysis(latest.result)
          if (restored) {
            setAnalysis(restored)
            setAnalysisDate(latest.createdAt ?? null)
            setActiveHistoryId(latest.id)
            setProgress(100)
            setStatus("complete")
          }
        }
        // Restore the AI Match that belongs to the analysis being shown. New
        // match records carry an explicit analysisId link; legacy records
        // fall back to a conservative timestamp rule — a match computed
        // against an earlier or different resume is never shown next to an
        // analysis it does not belong to.
        const linkedMatch = selectMatchRecordForAnalysis(matchRecords, latest)
        if (linkedMatch) {
          const restoredMatch = normalizeMatch(linkedMatch.result)
          if (restoredMatch) {
            setMatchResult(restoredMatch)
            setMatchDate(linkedMatch.createdAt ?? null)
            setMatchStatus("complete")
            if (typeof linkedMatch.jobDescription === "string" && linkedMatch.jobDescription.trim()) {
              setJobDescription(linkedMatch.jobDescription)
            }
          }
        }
      } catch {
        // History is best-effort: the module works without it.
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const upload = useResumePdfUpload((selectedFile) => {
    void runAnalysis(selectedFile)
  })

  const runAnalysis = async (selectedFile: File) => {
    if (processingRef.current) return
    processingRef.current = true
    setStatus("uploading")
    setProgress(15)
    setError("")
    setAnalysis(null)
    setAnalysisDate(null)
    setActiveHistoryId(null)
    // A new analysis invalidates any previous match (it was computed against
    // an earlier resume) and the previous PDF is no longer current.
    resumeDataUriRef.current = null
    analysisRecordIdRef.current = null
    setMatchStatus("idle")
    setMatchResult(null)
    setMatchDate(null)
    setMatchError("")

    let progressTimer: number | null = null
    try {
      const resumeDataUri = await fileToDataUri(selectedFile)
      if (mountedRef.current) {
        setProgress(38)
        setStatus("analyzing")
      }

      progressTimer = window.setInterval(() => {
        if (mountedRef.current) setProgress((current) => Math.min(current + 4, 92))
      }, 650)

      try {
        const output = await withTimeout(
          analyzeResume({ resumeDataUri }),
          analysisTimeoutMs,
          "Resume analysis timed out. Please try again with a smaller PDF."
        )
        if (progressTimer !== null) window.clearInterval(progressTimer)
        if (!mountedRef.current) return

        const normalized = normalizeAnalysis(output)
        if (!normalized) throw new Error("Gemini returned an unreadable analysis. Please try again.")
        // AI Match is only offered once the resume was actually analyzed.
        resumeDataUriRef.current = resumeDataUri
        const now = Date.now()
        setAnalysis(normalized)
        setAnalysisDate(now)
        setProgress(100)
        setStatus("complete")
        // Persist the analysis and capture its record id so an AI Match can
        // be explicitly linked back to this analysis. Best-effort: if the
        // write fails the module still works and matches fall back to the
        // legacy timestamp heuristic.
        let analysisRecordId: string | null = null
        try {
          analysisRecordId =
            (await recordActivity(
              {
                type: "resumeAnalyzed",
                timestamp: now,
                atsScore: normalized.atsScore,
                keywordCoverage: normalized.keywordCoverage,
                sectionScores: normalized.sectionScores ?? undefined,
                achievements: normalized.achievements,
                candidateName: normalized.candidateInfo.name || undefined,
                technicalSkills: normalized.technicalSkills,
                softSkills: normalized.softSkills,
                missingSkills: normalized.missingSkills,
              },
              { fileName: selectedFile.name, result: toPersistedResult(output) }
            )) ?? null
        } catch {
          analysisRecordId = null
        }
        analysisRecordIdRef.current = analysisRecordId
        if (analysisRecordId) setActiveHistoryId(analysisRecordId)
      } catch (analysisError) {
        if (progressTimer !== null) window.clearInterval(progressTimer)
        throw analysisError
      }
    } catch (uploadError) {
      if (mountedRef.current) {
        setProgress(0)
        setStatus("error")
        setError(friendlyErrorMessage(uploadError))
      }
    } finally {
      processingRef.current = false
    }
  }

  const processing = status === "uploading" || status === "analyzing"
  const showMatchResult =
    matchResult !== null &&
    matchDate !== null &&
    analysisDate !== null &&
    matchDate >= analysisDate
  // An analysis with no match result (and no match currently running) is
  // honestly labelled "Not analyzed" — never fabricated historical data.
  const matchNotRun =
    analysis !== null && matchResult === null && matchStatus !== "matching"
  const matchCanRun = Boolean(resumeDataUriRef.current)
  const rating = analysis ? atsRating(analysis.atsScore) : null
  const hasContact = analysis
    ? Boolean(analysis.candidateInfo.name || analysis.candidateInfo.email || analysis.candidateInfo.phone || analysis.candidateInfo.location || analysis.candidateInfo.links.length > 0)
    : false
  const detectedSections = analysis
    ? [analysis.experience, analysis.education, analysis.projects, analysis.certifications, analysis.achievements].filter((section) => section.length > 0).length
    : 0
  const lowExtraction = analysis ? analysis.atsScore <= 10 && analysis.technicalSkills.length === 0 : false

  const loadHistoryItem = (record: AnalysisRecord) => {
    if (processing) return
    const restored = normalizeAnalysis(record.result)
    if (!restored) return
    setError("")
    setAnalysis(restored)
    setAnalysisDate(record.createdAt ?? null)
    setActiveHistoryId(record.id)
    setProgress(100)
    setStatus("complete")

    // Restore the AI Match linked to this specific analysis (if one was ever
    // run against this resume). Legacy records without a link resolve to
    // null, which correctly clears any stale match state instead of showing
    // a match computed against a different resume.
    const linked = selectMatchRecordForAnalysis(matchHistory, record)
    if (linked) {
      const restoredMatch = normalizeMatch(linked.result)
      if (restoredMatch) {
        setMatchResult(restoredMatch)
        setMatchDate(linked.createdAt ?? null)
        setMatchStatus("complete")
        setMatchError("")
        if (typeof linked.jobDescription === "string") {
          setJobDescription(linked.jobDescription)
        }
        return
      }
    }
    setMatchResult(null)
    setMatchDate(null)
    setMatchStatus("idle")
    setMatchError("")
  }

  const runMatch = async () => {
    if (matchProcessingRef.current) return
    const resumeDataUri = resumeDataUriRef.current
    if (!resumeDataUri) {
      setMatchError("Upload and analyze a resume PDF before running AI Match.")
      return
    }
    const trimmedDescription = jobDescription.trim()
    if (!trimmedDescription) {
      setMatchError("Paste the complete Job Description before running AI Match.")
      return
    }
    if (trimmedDescription.length > maxJobDescriptionLength) {
      setMatchError("Job Description is too large. Please keep it under 16,000 characters.")
      return
    }
    matchProcessingRef.current = true
    setMatchStatus("matching")
    setMatchError("")
    setMatchResult(null)
    setMatchDate(null)
    try {
      const output = await withTimeout(
        matchResumeToJob({ resumeDataUri, jobDescription: trimmedDescription }),
        matchTimeoutMs,
        "AI Match timed out. Please try again with a shorter Job Description."
      )
      if (!mountedRef.current) return
      const normalized = normalizeMatch(output)
      if (!normalized) throw new Error("Gemini returned an unreadable match report. Please try again.")
      const now = Date.now()
      setMatchResult(normalized)
      setMatchDate(now)
      setMatchStatus("complete")
      recordActivity(
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
          // Link this match to the resume analysis it was computed against so
          // the correct match is restored next to the correct analysis.
          analysisId: analysisRecordIdRef.current ?? undefined,
          jobDescription: trimmedDescription,
        }
      )
    } catch (matchFailure) {
      if (mountedRef.current) {
        setMatchStatus("error")
        setMatchError(friendlyErrorMessage(matchFailure, "AI Match failed. Please try again."))
      }
    } finally {
      matchProcessingRef.current = false
    }
  }

  const resetMatch = () => {
    if (matchStatus === "matching") return
    setMatchResult(null)
    setMatchDate(null)
    setMatchStatus("idle")
    setMatchError("")
  }

  // Exports the currently displayed match result (owner-scoped, already
  // loaded from Firestore) as a DOCX via the existing /api/reports/export.
  // Only present data is included — nothing is fabricated.
  const exportMatchReport = async () => {
    if (!matchResult || exportingMatch) return
    setExportingMatch(true)
    try {
      const markdown = buildMatchReportMarkdown(matchResult, {
        candidateName: analysis?.candidateInfo.name || undefined,
        jobDescription: jobDescription.trim() || undefined,
        analysisDate: analysisDate ?? undefined,
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
      setExportingMatch(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Resume Analyzer</h1>
        <p className="text-muted-foreground text-lg">Upload a PDF resume and receive structured AI analysis powered by Gemini.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <ResumePdfUploader
            upload={upload}
            progress={progress}
            status={status}
            error={error}
            disabled={processing}
            helperText="PDF only. Maximum file size 8 MB. Gemini will extract the resume text and analyze it."
            loadingMessage="Analyzing your resume..."
            validationLabel="Gemini analysis"
            onReset={() => {
              if (processing) return
              setProgress(0)
              setError("")
              setStatus("idle")
              setAnalysis(null)
              setAnalysisDate(null)
              setActiveHistoryId(null)
              resumeDataUriRef.current = null
              analysisRecordIdRef.current = null
              setMatchStatus("idle")
              setMatchResult(null)
              setMatchDate(null)
              setMatchError("")
            }}
          />
        </div>

        <div className="space-y-6 xl:col-span-7">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Resume Preview</CardTitle>
                <CardDescription>Local PDF preview while Gemini extracts and analyzes the resume text.</CardDescription>
              </div>
              {status === "complete" ? <Badge variant="outline" className="border-primary/30 text-primary">Gemini Analysis</Badge> : null}
            </CardHeader>
            <CardContent>
              <div className="min-h-[520px] overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03]">
                {upload.previewUrl ? (
                  <object data={upload.previewUrl} type="application/pdf" className="h-[520px] w-full">
                    <div className="flex h-[520px] flex-col items-center justify-center p-8 text-center">
                      <FileCheck2 className="mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1} />
                      <p className="text-sm text-muted-foreground">PDF preview is not available in this browser.</p>
                    </div>
                  </object>
                ) : (
                  <div className="flex h-[520px] flex-col items-center justify-center p-8 text-center opacity-60">
                    <FileCheck2 className="mb-5 h-16 w-16 text-muted-foreground" strokeWidth={0.7} />
                    <h3 className="font-headline text-xl font-medium">No resume uploaded</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Upload a PDF to preview the document and unlock the AI analysis panel.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {analysis ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          {lowExtraction ? (
            <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              <p>
                Gemini could not extract much content from this PDF — it may be an image-only scan, a corrupted file, or not a resume.
                Scores reflect the little that could be read.
              </p>
            </div>
          ) : null}

          {/* Score overview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center gap-5 pt-8">
                <ScoreRing value={analysis.atsScore} />
                {rating ? (
                  <Badge variant="outline" className={rating.className}>{rating.label}</Badge>
                ) : null}
                {analysisDate ? (
                  <p className="text-center text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Analyzed</span> {formatEventTimestamp(analysisDate)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2">
              <MetricCard
                title="Keyword Coverage"
                value={`${analysis.keywordCoverage}%`}
                description="Role-relevant keywords and ATS terms detected"
                icon={ScanSearch}
                trend={{ value: "Parsed", positive: true }}
              />
              <MetricCard
                title="Sections Detected"
                value={`${detectedSections}/5`}
                description="Experience · Projects · Education · Certifications · Achievements"
                icon={Boxes}
                trend={{ value: "Extracted", positive: true }}
              />
            </div>
          </div>

          {/* Resume health */}
          {analysis.sectionScores ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Resume Health</CardTitle>
                <CardDescription>Per-section quality scores, grounded only in the uploaded resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-x-10 gap-y-6 md:grid-cols-2">
                {sectionScoreRows.map((row) => (
                  <SectionScoreBar
                    key={row.key}
                    label={row.label}
                    description={row.description}
                    value={analysis.sectionScores ? analysis.sectionScores[row.key] : 0}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* AI Match — compare the analyzed resume against a job description */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">AI Match</CardTitle>
                  <CardDescription>Compare this analyzed resume against a job description with Gemini.</CardDescription>
                </div>
                {showMatchResult ? (
                  <Badge variant="outline" className="border-primary/30 text-primary">Matched</Badge>
                ) : matchNotRun ? (
                  <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">Not analyzed</Badge>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {matchCanRun ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-muted-foreground">Paste the full role description for accurate ATS matching.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setJobDescription("")}
                        disabled={!jobDescription || matchStatus === "matching"}
                        className="border-foreground/10 hover:bg-foreground/5"
                      >
                        <X className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Clear
                      </Button>
                    </div>
                    <Textarea
                      value={jobDescription}
                      onChange={(event) => {
                        setJobDescription(event.target.value)
                        setMatchError("")
                      }}
                      aria-label="Job Description"
                      placeholder="Paste the complete Job Description here..."
                      className="min-h-[200px] resize-y border-foreground/10 bg-background/50 text-sm leading-relaxed"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className={`text-xs ${jobDescription.length > maxJobDescriptionLength ? "text-red-400" : "text-muted-foreground"}`}>
                        {jobDescription.length.toLocaleString()} / {maxJobDescriptionLength.toLocaleString()} characters
                      </p>
                      <Button
                        type="button"
                        onClick={() => void runMatch()}
                        disabled={matchStatus === "matching" || processing}
                        className="h-11 font-headline disabled:cursor-not-allowed"
                      >
                        {matchStatus === "matching" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running AI Match...
                          </>
                        ) : (
                          <>
                            <Target className="mr-2 h-4 w-4" strokeWidth={1.5} />
                            Run AI Match
                          </>
                        )}
                      </Button>
                    </div>
                    {matchStatus === "error" && matchError ? (
                      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {matchError}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-10 text-center">
                    <Target className="mb-3 h-8 w-8 text-muted-foreground/60" strokeWidth={1} />
                    <h3 className="font-headline text-base font-medium">AI Match needs your resume PDF</h3>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                      Re-upload and analyze your resume to run AI Match against a job description.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* JD Library — reuse saved job descriptions without re-typing */}
            <JdLibraryPanel
              currentJobDescription={jobDescription}
              onLoad={(loadedJd) => {
                setJobDescription(loadedJd)
                setMatchError("")
              }}
              disabled={processing}
            />

            {showMatchResult && matchResult ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <MetricCard
                    title="Match Score"
                    value={`${matchResult.matchScore}%`}
                    description="Overall role compatibility"
                    icon={Target}
                    trend={{ value: "Live", positive: true }}
                  />
                  <MetricCard
                    title="ATS Compatibility"
                    value={`${matchResult.atsCompatibility}%`}
                    description="Keyword and structure alignment"
                    icon={Gauge}
                    trend={{ value: "Gemini", positive: true }}
                  />
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
                        disabled={exportingMatch}
                        className="border-foreground/10 hover:bg-foreground/5"
                      >
                        {exportingMatch ? (
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
                    {matchResult.recruiterSummary ? (
                      <p className="text-sm leading-7 text-muted-foreground">{matchResult.recruiterSummary}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recruiter summary could be generated.</p>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <ListCard title="Matching Skills" description="Skills present in both resume and JD." items={matchResult.matchedSkills} />
                  <ListCard title="Missing Skills" description="JD skills not explicitly found in the resume." items={matchResult.missingSkills} tone="yellow" />
                  <ListCard title="Matching Keywords" description="High-value keywords already aligned." items={matchResult.matchedKeywords} />
                  <ListCard title="Missing Keywords" description="Important JD keywords not found in the resume." items={matchResult.missingKeywords} tone="yellow" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <NumberedCard title="Strengths" description="Evidence-backed match strengths." items={matchResult.strengths} />
                  <NumberedCard title="Weaknesses" description="Gaps that may reduce match quality." items={matchResult.weaknesses} tone="yellow" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <NumberedCard title="Priority Improvements" description="Highest-impact changes to make first." items={matchResult.priorityActions} />
                  <NumberedCard title="Improvement Suggestions" description="Resume edits grounded in provided inputs." items={matchResult.improvementSuggestions} />
                  <NumberedCard title="Recommended Projects" description="Future projects to demonstrate missing requirements." items={matchResult.recommendedProjects} tone="yellow" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Candidate snapshot */}
          {hasContact ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Candidate Snapshot</CardTitle>
                <CardDescription>Identity and contact details extracted from the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.candidateInfo.name ? (
                  <div className="flex items-center gap-2.5 text-sm">
                    <User className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                    <span className="truncate font-medium">{analysis.candidateInfo.name}</span>
                  </div>
                ) : null}
                {analysis.candidateInfo.email ? (
                  <ContactRow icon={Mail} value={analysis.candidateInfo.email} />
                ) : null}
                {analysis.candidateInfo.phone ? (
                  <ContactRow icon={Phone} value={analysis.candidateInfo.phone} />
                ) : null}
                {analysis.candidateInfo.location ? (
                  <ContactRow icon={MapPin} value={analysis.candidateInfo.location} />
                ) : null}
                {analysis.candidateInfo.links.map((link) => (
                  <a
                    key={link}
                    href={link.startsWith("http") ? link : `https://${link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Link2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                    <span className="min-w-0 truncate underline decoration-muted-foreground/30 underline-offset-2">{link}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Experience */}
          {analysis.experience.length > 0 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
                  <Briefcase className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  Experience
                </CardTitle>
                <CardDescription>Roles extracted from the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {analysis.experience.map((item, index) => (
                  <div key={`${item.title}-${item.company}-${index}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{item.title || "Role"}{item.company ? <span className="text-muted-foreground"> · {item.company}</span> : null}</p>
                      {item.period ? <p className="text-xs text-muted-foreground">{item.period}</p> : null}
                    </div>
                    {item.summary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Education */}
          {analysis.education.length > 0 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
                  <GraduationCap className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  Education
                </CardTitle>
                <CardDescription>Institutions and degrees found in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {analysis.education.map((item, index) => (
                  <div key={`${item.institution}-${index}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{item.institution || "Institution"}</p>
                      {item.years ? <p className="text-xs text-muted-foreground">{item.years}</p> : null}
                    </div>
                    {item.degree || item.field ? (
                      <p className="mt-1 text-sm text-muted-foreground">{[item.degree, item.field].filter(Boolean).join(" · ")}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Projects */}
          {analysis.projects.length > 0 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
                  <Boxes className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  Projects
                </CardTitle>
                <CardDescription>Projects actually described in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {analysis.projects.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                    {item.name ? <p className="font-medium">{item.name}</p> : null}
                    {item.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Certifications */}
          {analysis.certifications.length > 0 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
                  <Award className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  Certifications
                </CardTitle>
                <CardDescription>Certifications listed in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.certifications.map((item, index) => (
                  <Badge key={`${item.name}-${index}`} variant="outline" className="border-primary/30 text-primary">
                    {[item.name, item.issuer, item.year].filter(Boolean).join(" · ")}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Achievements */}
          {analysis.achievements.length > 0 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
                  <Trophy className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  Achievements
                </CardTitle>
                <CardDescription>Quantified accomplishments explicitly stated in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {analysis.achievements.map((achievement, index) => (
                  <div key={achievement} className="flex gap-4 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <p className="text-sm leading-6 text-muted-foreground">{achievement}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Resume Summary</CardTitle>
              <CardDescription>Generated only from the uploaded resume content.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.resumeSummary ? (
                <p className="text-sm leading-7 text-muted-foreground">{analysis.resumeSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No readable summary could be extracted from this PDF.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Technical Skills</CardTitle>
                <CardDescription>Technical skills explicitly detected in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.technicalSkills.length > 0 ? (
                  analysis.technicalSkills.map((skill) => (
                    <Badge key={skill} className="bg-primary/10 text-primary hover:bg-primary/20">{skill}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No technical skills could be detected.</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Soft Skills</CardTitle>
                <CardDescription>Soft skills supported by the resume content.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.softSkills.length > 0 ? (
                  analysis.softSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="border-primary/30 text-primary">{skill}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No soft skills could be detected.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Missing Skills</CardTitle>
                <CardDescription>Underrepresented skills or resume gaps to consider.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.missingSkills.length > 0 ? (
                  analysis.missingSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="border-yellow-500/30 text-yellow-400">{skill}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No notable skill gaps detected.</p>
                )}
              </CardContent>
            </Card>

            {analysis.missingSections.length > 0 ? (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
                    <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    Missing / Weak Sections
                  </CardTitle>
                  <CardDescription>Sections that are absent or too weak to evaluate.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {analysis.missingSections.map((section) => (
                    <Badge key={section} variant="outline" className="border-orange-500/30 text-orange-400">{section}</Badge>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Strengths</CardTitle>
                <CardDescription>Signals Gemini found in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {analysis.strengths.length > 0 ? (
                  analysis.strengths.map((strength, index) => (
                    <div key={strength} className="flex gap-4 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                      <p className="text-sm leading-6 text-muted-foreground">{strength}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No strengths could be identified from the extractable content.</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Weaknesses</CardTitle>
                <CardDescription>Gaps and clarity issues found in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {analysis.weaknesses.length > 0 ? (
                  analysis.weaknesses.map((weakness, index) => (
                    <div key={weakness} className="flex gap-4 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xs font-bold text-yellow-400">{index + 1}</span>
                      <p className="text-sm leading-6 text-muted-foreground">{weakness}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No weaknesses identified.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Improvement Suggestions</CardTitle>
              <CardDescription>Actionable changes grounded in the uploaded resume.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {analysis.improvementSuggestions.length > 0 ? (
                analysis.improvementSuggestions.map((suggestion, index) => (
                  <div key={suggestion} className="flex gap-4 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <p className="text-sm leading-6 text-muted-foreground">{suggestion}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No suggestions could be generated.</p>
              )}
            </CardContent>
          </Card>

          {/* Analysis history */}
          {history.length > 1 ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
                  <History className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  Previous Analyses
                </CardTitle>
                <CardDescription>Your past resume analyses, saved to your account.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {history.map((record) => {
                  const current = record.id === activeHistoryId
                  const restorable = record.result !== undefined && normalizeAnalysis(record.result) !== null
                  return (
                    <div
                      key={record.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors",
                        current ? "border-primary/30 bg-primary/5" : "border-foreground/5 bg-foreground/[0.03]"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{record.fileName || "Resume analysis"}</p>
                          <p className="text-xs text-muted-foreground">{formatEventTimestamp(record.createdAt ?? 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {record.atsScore !== undefined ? (
                          <Badge variant="outline" className="border-primary/30 text-primary">ATS {record.atsScore}%</Badge>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-foreground/10"
                          disabled={current || processing || !restorable}
                          onClick={() => loadHistoryItem(record)}
                        >
                          {current ? <FileCheck2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> : <Sparkles className="mr-1.5 h-4 w-4" strokeWidth={1.5} />}
                          {current ? "Viewing" : restorable ? "View" : "Not restorable"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : historyLoading ? (
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
            Loading your previous analyses...
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
