"use client"

import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileCode,
  Loader2,
  Mail,
  PenLine,
  Printer,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react"

import {
  generateTailoredCoverLetter,
  type CoverLetterQualityCheck,
  type GenerateTailoredCoverLetterOutput,
} from "@/ai/flows/generate-tailored-cover-letter"
import { ResumePdfUploader } from "@/components/resume/resume-pdf-uploader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { recordActivity } from "@/lib/analytics"
import { loadSettings } from "@/lib/settings"
import { useResumePdfUpload } from "@/hooks/use-resume-pdf-upload"
import { fileToDataUri, friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"

const generationTimeoutMs = 120000
const maxJobDescriptionLength = 15000
const storageKey = "hirefit_cover_letter"

const tones = ["Professional", "Confident", "Friendly", "Formal"]

type UploadStatus = "idle" | "uploading" | "analyzing" | "complete" | "error"

type SavedLetter = {
  letter: string
  qualityCheck: CoverLetterQualityCheck
  jobDescription: string
  companyName: string
  hiringManagerName: string
  tone: string
}

const qualityItems: { key: keyof CoverLetterQualityCheck; label: string }[] = [
  { key: "greeting", label: "Greeting / salutation" },
  { key: "introduction", label: "Introduction & role" },
  { key: "fitRationale", label: "Why the candidate fits" },
  { key: "relevantSkills", label: "Relevant skills from resume" },
  { key: "closing", label: "Closing paragraph" },
  { key: "signOff", label: "Professional sign-off" },
]

function loadSavedLetter(): SavedLetter | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedLetter
    if (!parsed || typeof parsed.letter !== "string" || !parsed.letter.trim()) return null
    if (!parsed.qualityCheck || typeof parsed.qualityCheck !== "object") return null
    return parsed
  } catch {
    return null
  }
}

function saveLetter(saved: SavedLetter) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(saved))
  } catch {
    // ignore storage failures
  }
}

function qualityTone(checked: boolean) {
  return checked
    ? "border-green-500/30 bg-green-500/10 text-green-400"
    : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
}

export default function CoverLetterPage() {
  const upload = useResumePdfUpload()
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [hiringManagerName, setHiringManagerName] = useState("")
  const [tone, setTone] = useState("Professional")
  const [isGenerating, setIsGenerating] = useState(false)
  const [output, setOutput] = useState<GenerateTailoredCoverLetterOutput | null>(null)

  // Restore a previously generated letter + inputs after mount (hydration-safe).
  // When no saved letter exists, start from the tone configured in Settings.
  useEffect(() => {
    const saved = loadSavedLetter()
    if (saved) {
      setOutput({ coverLetter: saved.letter, qualityCheck: saved.qualityCheck })
      setJobDescription(saved.jobDescription)
      setCompanyName(saved.companyName)
      setHiringManagerName(saved.hiringManagerName)
      setTone(saved.tone)
    } else {
      setTone(loadSettings().coverLetterTone)
    }
  }, [])

  const allQualityPassed = useMemo(
    () => (output ? Object.values(output.qualityCheck).every(Boolean) : false),
    [output]
  )

  const validateInputs = (): string | null => {
    if (!upload.file) return "Please upload your resume PDF before generating a cover letter."
    if (!jobDescription.trim()) return "Please paste the job description before generating a cover letter."
    return null
  }

  const generate = async () => {
    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      toast({ title: "Missing details", description: validationError, variant: "destructive" })
      return
    }
    setError("")
    setIsGenerating(true)
    setStatus("analyzing")
    setProgress(10)
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 4, 92))
    }, 800)

    try {
      const resumeDataUri = await fileToDataUri(upload.file!)
      setProgress(25)
      const result = await withTimeout(
        generateTailoredCoverLetter({
          resumeDataUri,
          jobDescription,
          companyName: companyName.trim() || undefined,
          hiringManagerName: hiringManagerName.trim() || undefined,
          tone,
        }),
        generationTimeoutMs,
        "Cover letter generation timed out. Please try again."
      )
      window.clearInterval(progressTimer)
      setOutput(result)
      setProgress(100)
      setStatus("complete")
      saveLetter({
        letter: result.coverLetter,
        qualityCheck: result.qualityCheck,
        jobDescription,
        companyName,
        hiringManagerName,
        tone,
      })
      recordActivity({
        type: "coverLetterGenerated",
        timestamp: Date.now(),
        tone,
        companyName,
      })
      toast({ title: "Cover letter ready", description: "Your tailored cover letter was generated." })
    } catch (generationError) {
      window.clearInterval(progressTimer)
      setProgress(0)
      // The resume uploaded fine; only generation failed, so keep the uploader in its ready state.
      setStatus(upload.file ? "complete" : "error")
      setError(friendlyErrorMessage(generationError, "Failed to generate your cover letter. Please try again."))
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLetter = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output.coverLetter)
      toast({ title: "Copied", description: "Your cover letter was copied to the clipboard." })
    } catch {
      toast({ title: "Could not copy", description: "Your browser blocked clipboard access.", variant: "destructive" })
    }
  }

  const downloadPdf = () => {
    if (!output) return
    window.print()
  }

  const downloadDocx = async () => {
    if (!output) return
    try {
      // The DOCX is generated server-side (the `docx` library cannot be bundled
      // for the browser under Turbopack), then streamed back as a file download.
      const response = await withTimeout(
        fetch("/api/cover-letter/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: output.coverLetter }),
        }),
        30000,
        "DOCX export timed out. Please try again."
      )
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "hirefit-cover-letter.docx"
      link.click()
      URL.revokeObjectURL(url)
      toast({ title: "DOCX downloaded", description: "Your cover letter was exported as a Word document." })
    } catch {
      toast({ title: "Download failed", description: "Could not create the DOCX file. Please try again.", variant: "destructive" })
    }
  }

  // Print-only styles so "Download PDF" prints just the letter.
  useEffect(() => {
    if (!output) return
    const style = document.createElement("style")
    style.id = "cover-letter-print-styles"
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #cover-letter-print, #cover-letter-print * { visibility: visible; }
        #cover-letter-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        .no-print { display: none !important; }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.getElementById("cover-letter-print-styles")?.remove()
    }
  }, [output])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">AI Cover Letter</h1>
        <p className="text-muted-foreground text-lg">Generate a professional, tailored cover letter grounded strictly in your resume and the job description.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Inputs column */}
        <div className="space-y-6 xl:col-span-5">
          <ResumePdfUploader
            upload={upload}
            progress={progress}
            status={status}
            error={upload.uploadError}
            helperText="PDF only. Maximum file size 8 MB. Gemini will extract the resume text and ground the letter in it."
            loadingMessage="Generating cover letter..."
            readyMessage="Resume Ready"
            completeMessage="Resume Ready"
            validationLabel="Resume parsed"
            onReset={() => {
              setProgress(0)
              setError("")
              setStatus("idle")
            }}
          />

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Job Description</CardTitle>
                <CardDescription>Paste the full job description. Gemini aligns the letter to it.</CardDescription>
              </div>
              <FileCode className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-muted-foreground">
                  {jobDescription.length.toLocaleString()} / {maxJobDescriptionLength.toLocaleString()}
                </span>
                {jobDescription.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setJobDescription("")}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                    Clear
                  </button>
                ) : null}
              </div>
              <Textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value.slice(0, maxJobDescriptionLength))}
                placeholder="Paste the job description here… (required)"
                className="min-h-[220px] resize-y bg-background/50 border-white/10 text-sm leading-relaxed"
              />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Optional Details</CardTitle>
              <CardDescription>Personalize the letter. Leave blank if unknown — Gemini will never invent these.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Company Name</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="e.g. Acme Corp (optional)"
                    className="h-11 border-white/10 bg-background/50 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Hiring Manager Name</label>
                <div className="relative">
                  <PenLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    value={hiringManagerName}
                    onChange={(event) => setHiringManagerName(event.target.value)}
                    placeholder="e.g. Sarah Chen (optional)"
                    className="h-11 border-white/10 bg-background/50 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-11 border-white/10 bg-background/50 font-headline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="button" onClick={generate} disabled={isGenerating} className="h-12 w-full font-headline">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Generate Cover Letter
                  </>
                )}
              </Button>

              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Output column */}
        <div className="space-y-6 xl:col-span-7">
          {isGenerating ? (
            <Card className="glass-card border-primary/20">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="font-headline text-sm uppercase tracking-widest">Writing your cover letter…</p>
                </div>
                <Progress value={progress} className="h-1.5" />
              </CardContent>
            </Card>
          ) : output ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500" id="cover-letter-print">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{tone} tone</Badge>
                  <Badge variant="outline" className={qualityTone(allQualityPassed)}>
                    {allQualityPassed ? "Quality check passed" : "Quality check: review needed"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <Button type="button" variant="outline" size="sm" onClick={copyLetter} className="border-white/10 hover:bg-white/5">
                    <ClipboardCopy className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={generate} disabled={isGenerating} className="border-white/10 hover:bg-white/5">
                    <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Regenerate
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={downloadPdf} className="border-white/10 hover:bg-white/5">
                    <Printer className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    PDF
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={downloadDocx} className="border-white/10 hover:bg-white/5">
                    <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    DOCX
                  </Button>
                </div>
              </div>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-headline tracking-widest uppercase">Your Cover Letter</CardTitle>
                    <CardDescription>
                      {companyName ? `Addressed to ${companyName}` : "General application"} · generated by Gemini
                    </CardDescription>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </CardHeader>
                <CardContent>
                  <div className="min-h-[420px] rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                    <div className="mx-auto max-w-[65ch] space-y-4 text-sm leading-7 text-muted-foreground">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p>{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({ children }) => <em>{children}</em>,
                          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1.5">{children}</ul>,
                          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1.5">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          br: () => <br />,
                        }}
                      >
                        {output.coverLetter}
                      </ReactMarkdown>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card no-print">
                <CardHeader>
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">Quality Check</CardTitle>
                  <CardDescription>Gemini verified each required section is present in the letter.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {qualityItems.map((item) => {
                    const checked = Boolean(output.qualityCheck[item.key])
                    return (
                      <div key={item.key} className={`flex items-center gap-3 rounded-xl border p-3 ${qualityTone(checked)}`}>
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        )}
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/5 p-12 text-center opacity-60">
              <FileCode className="mb-6 h-16 w-16 text-muted-foreground" strokeWidth={0.7} />
              <h3 className="font-headline text-xl font-medium">Your cover letter will appear here</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Upload your resume, paste the job description, and choose a tone. Gemini will draft a tailored letter grounded only in your real details.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        The letter never fabricates experience, companies, certifications, skills, dates, metrics, or achievements.
      </div>
    </div>
  )
}
