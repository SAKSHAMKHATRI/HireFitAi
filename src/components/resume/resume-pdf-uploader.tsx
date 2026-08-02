"use client"

import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatResumeFileSize, maxResumeFileSize } from "@/lib/resume-upload"
import type { useResumePdfUpload } from "@/hooks/use-resume-pdf-upload"

type UploadStatus = "idle" | "uploading" | "analyzing" | "complete" | "error"
type ResumeUploadState = ReturnType<typeof useResumePdfUpload>

type ResumePdfUploaderProps = {
  upload: ResumeUploadState
  progress: number
  status: UploadStatus
  error: string
  helperText: string
  loadingMessage: string
  readyMessage?: string
  completeMessage?: string
  validationLabel?: string
  onReset?: () => void
}

export function ResumePdfUploader({
  upload,
  progress,
  status,
  error,
  helperText,
  loadingMessage,
  readyMessage = "Resume Ready",
  completeMessage = "Analysis Ready",
  validationLabel = "Gemini analysis",
  onReset,
}: ResumePdfUploaderProps) {
  const visibleError = upload.uploadError || error

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">PDF Upload</CardTitle>
          <CardDescription>Drag and drop your resume or browse from your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              upload.setIsDragging(true)
            }}
            onDragLeave={() => upload.setIsDragging(false)}
            onDrop={upload.handleDrop}
            className={cn(
              "relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-background/40 p-8 text-center transition-all hover:border-primary/40 hover:bg-white/[0.04]",
              upload.isDragging && "border-primary/70 bg-primary/5"
            )}
            onClick={() => upload.inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") upload.inputRef.current?.click()
            }}
          >
            <input
              ref={upload.inputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => upload.handleFile(event.target.files?.[0])}
            />
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <h2 className="font-headline text-xl font-semibold">{upload.file ? "Resume ready for analysis" : "Drop your PDF resume here"}</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{helperText}</p>
          </div>

          {visibleError ? (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {visibleError}
            </div>
          ) : null}

          {upload.file ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{upload.file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatResumeFileSize(upload.file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    upload.resetFile()
                    onReset?.()
                  }}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Remove resume"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{status === "analyzing" ? loadingMessage : "Upload progress"}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </div>
          ) : null}

          <Button type="button" onClick={() => upload.inputRef.current?.click()} className="h-12 w-full font-headline">
            {!upload.file ? (
              <>
                <UploadCloud className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Upload Resume
              </>
            ) : status === "idle" ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {readyMessage}
              </>
            ) : status === "complete" ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {completeMessage}
              </>
            ) : status === "error" ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Analysis Failed
              </>
            ) : (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingMessage}
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
            ["PDF format", Boolean(upload.file), "Only PDF resumes are accepted."],
            ["File size", Boolean(upload.file && upload.file.size <= maxResumeFileSize), "Maximum upload size is 8 MB."],
            ["Preview generated", Boolean(upload.previewUrl), "Resume preview appears after upload."],
            [validationLabel, status === "complete", "Structured analysis appears after processing."],
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
  )
}
