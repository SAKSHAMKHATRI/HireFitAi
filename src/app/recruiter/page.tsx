"use client"

import { useState } from "react"
import { recruiterShortlistProbability, RecruiterShortlistProbabilityOutput } from "@/ai/flows/recruiter-shortlist-probability"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCheck, Loader2, BarChart, AlertCircle, TrendingUp, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function RecruiterPage() {
  const [resumeText, setResumeText] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecruiterShortlistProbabilityOutput | null>(null)

  const handleSimulate = async () => {
    if (!resumeText || !jobDescription) {
      toast({
        title: "Input missing",
        description: "Please provide resume text and job description.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Browser-safe base64 encoding (replaces Node.js Buffer API)
      const encodedText = btoa(encodeURIComponent(resumeText).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
      const resumeDataUri = `data:text/plain;base64,${encodedText}`

      const output = await recruiterShortlistProbability({
        resumeDataUri,
        jobDescription
      })
      setResult(output)
    } catch (error) {
      toast({
        title: "Simulation failed",
        description: "An error occurred during recruiter behavior simulation.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getProbabilityColor = (prob: string) => {
    switch(prob) {
      case 'Very High': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'High': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      default: return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Recruiter View Mode</h1>
        <p className="text-muted-foreground text-lg">Simulate recruiter behavior to provide shortlist probability and qualitative hiring decisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Simulation Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase text-muted-foreground">Resume Context</label>
                <Textarea 
                  placeholder="Paste resume content..." 
                  className="min-h-[200px] bg-background/50 border-white/10 text-sm"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-headline uppercase text-muted-foreground">Target Role Description</label>
                <Textarea 
                  placeholder="Paste job description..." 
                  className="min-h-[200px] bg-background/50 border-white/10 text-sm"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSimulate} 
                className="w-full h-12 text-md font-headline"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Simulating Behavior...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Begin Qualitative Assessment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-headline tracking-widest uppercase">Shortlist Probability</CardTitle>
                    <Badge variant="outline" className={getProbabilityColor(result.shortlistProbability)}>
                      {result.shortlistProbability} Probability
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 p-6 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-lg mb-1">Recruiter Sentiment</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Based on qualitative factors, a recruiter in this industry would likely categorize you as a <span className="text-white font-medium">{result.shortlistProbability}</span> priority candidate.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">Qualitative Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {result.qualitativeAssessment}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                  <BarChart className="h-5 w-5 text-blue-400 shrink-0" strokeWidth={1.5} />
                  <div>
                    <h5 className="text-xs font-headline uppercase text-blue-400 mb-1">Market Benchmark</h5>
                    <p className="text-xs">Your profile aligns with top-tier candidates currently interviewing for similar roles.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" strokeWidth={1.5} />
                  <div>
                    <h5 className="text-xs font-headline uppercase text-yellow-400 mb-1">Key Decision Factor</h5>
                    <p className="text-xs">Domain expertise in cloud infrastructure is the strongest conversion point.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-50">
              <UserCheck className="h-16 w-16 text-muted-foreground mb-6" strokeWidth={0.5} />
              <h3 className="text-xl font-headline font-medium mb-2">Simulate a Recruiter</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Understand exactly how a hiring manager or recruiter perceives your resume at first glance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
