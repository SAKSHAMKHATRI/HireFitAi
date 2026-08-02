import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, GitBranch, Rocket, Sparkles } from "lucide-react"

type Release = {
  version: string
  date: string
  title: string
  highlights: string[]
  current?: boolean
}

const releases: Release[] = [
  {
    version: "2.0",
    date: "August 2026",
    title: "Career Analytics Dashboard",
    current: true,
    highlights: [
      "Command Center rebuilt as a live analytics hub fed by every HireFit module.",
      "Application readiness, keyword coverage, achievement strength, and recruiter shortlist — all derived from real module results, never fabricated.",
      "Recent AI activity timeline, performance trends chart, skill gap overview, and career progress tracking.",
      "Local persistence: your dashboard state survives a refresh.",
    ],
  },
  {
    version: "1.9",
    date: "July 2026",
    title: "AI Cover Letter Generator",
    highlights: [
      "Gemini-powered tailored cover letters grounded strictly in your resume and job description.",
      "Professional, Confident, Friendly, and Formal tone options.",
      "Built-in quality check for greeting, introduction, fit, skills, closing, and sign-off.",
      "Copy, regenerate, PDF, and DOCX export.",
    ],
  },
  {
    version: "1.8",
    date: "June 2026",
    title: "Career Roadmap & Career Coach",
    highlights: [
      "Personalized career roadmaps with skill-gap analysis, weekly plans, milestones, projects, courses, and certifications.",
      "Career Coach mentor chat that grounds answers in your real HireFit data.",
      "Roadmap milestone checklists and full roadmap copy/PDF export.",
    ],
  },
  {
    version: "1.7",
    date: "May 2026",
    title: "AI Interview",
    highlights: [
      "Realistic mock interviews with questions tailored to role, experience, type, and difficulty.",
      "Per-question timing, hints, and progress saving.",
      "Detailed performance report: communication, technical accuracy, problem solving, confidence, and a hiring recommendation.",
    ],
  },
  {
    version: "1.6",
    date: "April 2026",
    title: "Recruiter Mode",
    highlights: [
      "Qualitative recruiter simulation with shortlist probability assessment.",
      "Candid strengths, weaknesses, and decision-factor feedback for your resume against a target role.",
    ],
  },
  {
    version: "1.5",
    date: "March 2026",
    title: "Bullet Optimizer",
    highlights: [
      "Transforms passive resume bullets into high-impact, results-oriented achievement statements.",
      "Strict no-fabrication rules — only improves what is already in your input.",
    ],
  },
  {
    version: "1.4",
    date: "February 2026",
    title: "H.I.R.E Evaluator",
    highlights: [
      "Deep reasoning engine comparing your resume against a job description.",
      "Detailed match score and line-by-line alignment reasoning.",
    ],
  },
  {
    version: "1.3",
    date: "January 2026",
    title: "AI Match",
    highlights: [
      "Resume-to-job-description compatibility engine with ATS alignment scoring.",
      "Matched and missing keywords, strengths, weaknesses, and prioritized improvements.",
    ],
  },
  {
    version: "1.2",
    date: "December 2025",
    title: "Resume Analyzer",
    highlights: [
      "Gemini-powered ATS analysis of uploaded PDF resumes.",
      "Detected technical and soft skills, missing skills, strengths, weaknesses, and improvement suggestions.",
    ],
  },
  {
    version: "1.1",
    date: "November 2025",
    title: "Authentication",
    highlights: [
      "Account creation and sign-in flow with a protected dashboard area.",
      "Persistent local session so you can return to your workspace.",
    ],
  },
  {
    version: "1.0",
    date: "October 2025",
    title: "Launch",
    highlights: [
      "HireFit AI landing page and product shell.",
      "Founding vision: resume intelligence, ATS guidance, and interview preparation in one focused workspace.",
    ],
  },
]

export default function VersionHistoryPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Version History</h1>
        <p className="text-muted-foreground text-lg">Every release of HireFit AI, from launch to today.</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <GitBranch className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="font-headline">Release Timeline</CardTitle>
            <CardDescription>Current version: 2.0 · Career Analytics Dashboard</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="relative space-y-6">
        {releases.map((release, index) => (
          <div key={release.version} className="relative flex gap-5">
            {index < releases.length - 1 ? (
              <span className="absolute left-[19px] top-12 h-[calc(100%+8px)] w-px bg-gradient-to-b from-primary/30 to-white/5" aria-hidden="true" />
            ) : null}
            <span className="relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
              {release.version.split(".")[0]}
            </span>
            <Card className="glass-card flex-1">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-headline text-lg">
                    v{release.version} — {release.title}
                  </CardTitle>
                  <CardDescription>{release.date}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {release.current ? (
                    <Badge className="bg-green-500/10 text-green-500">
                      <Sparkles className="mr-1 h-3 w-3" strokeWidth={1.5} />
                      Current
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="border-white/10 text-muted-foreground">
                    v{release.version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {release.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary/70" strokeWidth={1.5} />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Card className="glass-card">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-headline text-sm font-semibold">What&apos;s next</p>
              <p className="text-sm text-muted-foreground">Version History tracks every improvement as it ships — check back after each update.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
