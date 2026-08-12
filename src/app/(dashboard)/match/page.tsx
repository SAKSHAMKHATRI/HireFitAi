"use client"

import { useState } from "react"
import {
  AlertCircle,
  FileCheck2,
  Gauge,
  Loader2,
  RotateCcw,
  Target,
  X,
} from "lucide-react"

import { matchResumeToJob, type MatchResumeToJobOutput } from "@/ai/flows/match-resume-to-job-flow"
import { ListCard, NumberedCard } from "@/components/match/match-cards"
import { MetricCard } from "@/components/dashboard/metric-card"
import { ResumePdfUploader } from "@/components/resume/resume-pdf-uploader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useResumePdfUpload } from "@/hooks/use-resume-pdf-upload"
import { recordActivity } from "@/lib/analytics"
import { fileToDataUri, friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"

const matchTimeoutMs = 60000
const maxJobDescriptionLength = 16000

type MatchStatus = "idle" | "uploading" | "analyzing" | "complete" | "error"

export default function MatchPage() {
  const [jobDescription, setJobDescription] = useState("")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<MatchStatus>("idle")
  const [result, setResult] = useState<MatchResumeToJobOutput | null>(null)
  const upload = useResumePdfUpload(() => {
    setProgress(0)
    setError("")
    setStatus("idle")
    setResult(null)
  })

  const clearJobDescription = () => {
    setJobDescription("")
    setError("")
    setResult(null)
    setStatus(upload.file ? "idle" : status)
    setProgress(0)
  }

  const resetMatch = () => {
    setProgress(0)
    setError("")
    setStatus("idle")
    setResult(null)
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
        setResult(output)
        setProgress(100)
        setStatus("complete")
        recordActivity(
          {
            type: "jobMatched",
            timestamp: Date.now(),
            matchScore: output.matchScore,
            atsCompatibility: output.atsCompatibility,
            matchedSkills: output.matchedSkills,
            missingSkills: output.missingSkills,
            matchedKeywords: output.matchedKeywords,
            missingKeywords: output.missingKeywords,
          },
          // Persist the full report so it survives a page refresh everywhere
          // (the Resume Analyzer restores it from Firestore).
          { fileName: upload.file?.name, result: output }
        )
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
              <Button type="button" variant="outline" size="sm" onClick={resetMatch} className="border-foreground/10 hover:bg-foreground/5">
                <RotateCcw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Reset Results
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">{result.recruiterSummary}</p>
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
