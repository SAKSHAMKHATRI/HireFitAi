
"use client"

import { useState } from "react"
import { hireResumeEvaluation, HireResumeEvaluationOutput } from "@/ai/flows/hire-resume-evaluation-flow"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BrainCircuit, Loader2, Sparkles, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function EvaluatorPage() {
  const [resume, setResume] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HireResumeEvaluationOutput | null>(null)

  const handleEvaluate = async () => {
    if (!resume || !jobDescription) {
      toast({
        title: "Missing input",
        description: "Please provide both a resume and a job description.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const output = await hireResumeEvaluation({
        resumeText: resume,
        jobDescriptionText: jobDescription
      })
      setResult(output)
    } catch (error) {
      toast({
        title: "Evaluation failed",
        description: "An error occurred while evaluating your resume.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">H.I.R.E Evaluator</h1>
        <p className="text-muted-foreground text-lg">Intelligent Resume Evaluation Engine using state-of-the-art LLMs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Input Data</CardTitle>
              <CardDescription>Paste your professional content for deep reasoning analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase text-muted-foreground">Your Resume</label>
                <Textarea 
                  placeholder="Paste resume content here..." 
                  className="min-h-[250px] bg-background/50 border-white/10 font-mono text-sm"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase text-muted-foreground">Job Description</label>
                <Textarea 
                  placeholder="Paste target job description..." 
                  className="min-h-[250px] bg-background/50 border-white/10 font-mono text-sm"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleEvaluate} 
                className="w-full h-12 text-md font-headline"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Alignment...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Run H.I.R.E Scan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {result ? (
            <Card className="glass-card border-primary/20 animate-in zoom-in-95 duration-500">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">Evaluation Results</CardTitle>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="relative h-32 w-32 flex items-center justify-center mb-4">
                    <svg className="h-full w-full rotate-[-90deg]">
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-white/5"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={377}
                        strokeDashoffset={377 - (377 * result.matchScore) / 100}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-headline font-bold">{result.matchScore}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Match Score</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <h4 className="text-sm font-headline uppercase mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Reasoning & Feedback
                  </h4>
                  <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {result.reasoning}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-50">
              <BrainCircuit className="h-16 w-16 text-muted-foreground mb-6" strokeWidth={0.5} />
              <h3 className="text-xl font-headline font-medium mb-2">No Analysis Yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Run your first H.I.R.E scan to see deep match reasoning and compatibility metrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
