"use client"

import { useEffect, useRef, useState, type DragEvent } from "react"
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  ScanSearch,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react"

import { analyzeResume, type AnalyzeResumeOutput } from "@/ai/flows/analyze-resume-flow"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const maxFileSize = 8 * 1024 * 1024
const analysisTimeoutMs = 45000

type AnalyzerStatus = "idle" | "uploading" | "analyzing" | "complete" | "error"

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function fileToDataUri(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Could not read the uploaded PDF. Please try again."))
      }
    }
    reader.onerror = () => reject(new Error("Could not read the uploaded PDF. Please try again."))
    reader.readAsDataURL(file)
  })
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Resume analysis timed out. Please try again with a smaller PDF.")), timeoutMs)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "Resume analysis failed. Please try again."
}

export default function AnalyzerPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<AnalyzerStatus>("idle")
  const [analysis, setAnalysis] = useState<AnalyzeResumeOutput | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const resetFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setProgress(0)
    setError("")
    setStatus("idle")
    setAnalysis(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const runAnalysis = async (selectedFile: File) => {
    setStatus("uploading")
    setProgress(15)
    setAnalysis(null)

    try {
      const resumeDataUri = await fileToDataUri(selectedFile)
      setProgress(38)
      setStatus("analyzing")

      const progressTimer = window.setInterval(() => {
        setProgress((current) => Math.min(current + 4, 92))
      }, 650)

      try {
        const output = await withTimeout(analyzeResume({ resumeDataUri }), analysisTimeoutMs)
        window.clearInterval(progressTimer)
        setAnalysis(output)
        setProgress(100)
        setStatus("complete")
      } catch (analysisError) {
        window.clearInterval(progressTimer)
        throw analysisError
      }
    } catch (uploadError) {
      setProgress(0)
      setStatus("error")
      setError(errorMessage(uploadError))
    }
  }

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return

    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF resume.")
      return
    }

    if (selectedFile.size > maxFileSize) {
      setError("PDF must be smaller than 8 MB.")
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setError("")
    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    void runAnalysis(selectedFile)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Resume Analyzer</h1>
        <p className="text-muted-foreground text-lg">Upload a PDF resume and receive structured AI analysis powered by Gemini.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">PDF Upload</CardTitle>
              <CardDescription>Drag and drop your resume or browse from your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-background/40 p-8 text-center transition-all hover:border-primary/40 hover:bg-white/[0.04]",
                  isDragging && "border-primary/70 bg-primary/5"
                )}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") inputRef.current?.click()
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h2 className="font-headline text-xl font-semibold">{file ? "Resume ready for analysis" : "Drop your PDF resume here"}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                  PDF only. Maximum file size 8 MB. Gemini will extract the resume text and analyze it.
                </p>
              </div>

              {error ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              ) : null}

              {file ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={resetFile} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white" aria-label="Remove resume">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{status === "analyzing" ? "Analyzing your resume..." : "Upload progress"}</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </div>
              ) : null}

              <Button type="button" disabled className="h-12 w-full font-headline">
                {!file ? (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Upload Resume
                  </>
                ) : status === "complete" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Analysis Ready
                  </>
                ) : status === "error" ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Analysis Failed
                  </>
                ) : (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing your resume...
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Validation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {[
                ["PDF format", Boolean(file), "Only PDF resumes are accepted."],
                ["File size", Boolean(file && file.size <= maxFileSize), "Maximum upload size is 8 MB."],
                ["Preview generated", Boolean(previewUrl), "Resume preview appears after upload."],
                ["Gemini analysis", status === "complete", "Structured resume analysis appears after processing."],
              ].map(([label, complete, copy]) => (
                <div key={String(label)} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <CheckCircle2 className={cn("mt-0.5 h-4 w-4", complete ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
              <div className="min-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                {previewUrl ? (
                  <object data={previewUrl} type="application/pdf" className="h-[520px] w-full">
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <MetricCard title="ATS Score" value={`${analysis.atsScore}%`} description="Gemini screening compatibility" icon={ScanSearch} trend={{ value: "Live", positive: true }} />
            <MetricCard title="Detected Skills" value={analysis.technicalSkills.length + analysis.softSkills.length} description="Technical and soft skills found" icon={Sparkles} trend={{ value: "Parsed", positive: true }} />
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Resume Summary</CardTitle>
              <CardDescription>Generated only from the uploaded resume content.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">{analysis.resumeSummary}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Technical Skills</CardTitle>
                <CardDescription>Technical skills explicitly detected in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.technicalSkills.map((skill) => (
                  <Badge key={skill} className="bg-primary/10 text-primary hover:bg-primary/20">{skill}</Badge>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Soft Skills</CardTitle>
                <CardDescription>Soft skills supported by the resume content.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.softSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="border-primary/30 text-primary">{skill}</Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Missing Skills</CardTitle>
              <CardDescription>Underrepresented skills or resume gaps to consider.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {analysis.missingSkills.map((skill) => (
                <Badge key={skill} variant="outline" className="border-yellow-500/30 text-yellow-400">{skill}</Badge>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Strengths</CardTitle>
                <CardDescription>Signals Gemini found in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {analysis.strengths.map((strength, index) => (
                  <div key={strength} className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <p className="text-sm leading-6 text-muted-foreground">{strength}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Weaknesses</CardTitle>
                <CardDescription>Gaps and clarity issues found in the resume.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {analysis.weaknesses.map((weakness, index) => (
                  <div key={weakness} className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xs font-bold text-yellow-400">{index + 1}</span>
                    <p className="text-sm leading-6 text-muted-foreground">{weakness}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Improvement Suggestions</CardTitle>
              <CardDescription>Actionable changes grounded in the uploaded resume.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {analysis.improvementSuggestions.map((suggestion, index) => (
                <div key={suggestion} className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                  <p className="text-sm leading-6 text-muted-foreground">{suggestion}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
