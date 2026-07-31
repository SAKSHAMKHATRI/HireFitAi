"use client"

import { useState } from "react"
import {
  FileCheck2,
  ScanSearch,
  Sparkles,
} from "lucide-react"

import { analyzeResume, type AnalyzeResumeOutput } from "@/ai/flows/analyze-resume-flow"
import { MetricCard } from "@/components/dashboard/metric-card"
import { ResumePdfUploader } from "@/components/resume/resume-pdf-uploader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useResumePdfUpload } from "@/hooks/use-resume-pdf-upload"
import { fileToDataUri, friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"

const analysisTimeoutMs = 45000

type AnalyzerStatus = "idle" | "uploading" | "analyzing" | "complete" | "error"

export default function AnalyzerPage() {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<AnalyzerStatus>("idle")
  const [analysis, setAnalysis] = useState<AnalyzeResumeOutput | null>(null)
  const upload = useResumePdfUpload((selectedFile) => {
    void runAnalysis(selectedFile)
  })

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
        const output = await withTimeout(analyzeResume({ resumeDataUri }), analysisTimeoutMs, "Resume analysis timed out. Please try again with a smaller PDF.")
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
      setError(friendlyErrorMessage(uploadError))
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
            helperText="PDF only. Maximum file size 8 MB. Gemini will extract the resume text and analyze it."
            loadingMessage="Analyzing your resume..."
            validationLabel="Gemini analysis"
            onReset={() => {
              setProgress(0)
              setError("")
              setStatus("idle")
              setAnalysis(null)
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
              <div className="min-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
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
