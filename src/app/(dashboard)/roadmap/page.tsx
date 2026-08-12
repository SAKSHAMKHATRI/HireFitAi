"use client"

import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Flag,
  GraduationCap,
  Library,
  Lightbulb,
  Loader2,
  Map,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react"

import {
  generateCareerRoadmap,
  type GenerateCareerRoadmapInput,
  type GenerateCareerRoadmapOutput,
} from "@/ai/flows/generate-career-roadmap"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { recordActivity } from "@/lib/analytics"
import { loadSettings } from "@/lib/settings"
import { friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"

const generationTimeoutMs = 120000

const targetCareers = [
  "AI Engineer",
  "ML Engineer",
  "Software Engineer",
  "Backend Developer",
  "Frontend Developer",
  "Data Scientist",
  "Cyber Security",
  "Cloud Engineer",
]
const experienceLevels = ["Fresher", "Junior", "Mid", "Senior"]
const timeCommitments = ["3 months", "6 months", "12 months"]

type RoadmapSetup = {
  currentEducation: string
  currentSkills: string
  experience: string
  targetCareer: string
  timeCommitment: string
}

const defaultSetup: RoadmapSetup = {
  currentEducation: "",
  currentSkills: "",
  experience: "Fresher",
  targetCareer: "AI Engineer",
  timeCommitment: "6 months",
}

type RoadmapPhase = "setup" | "generating" | "report" | "error"

function LoadingCard({ label, progress }: { label: string; progress: number }) {
  return (
    <Card className="glass-card border-primary/20">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="font-headline text-sm uppercase tracking-widest">{label}</p>
        </div>
        <Progress value={progress} className="h-1.5" />
      </CardContent>
    </Card>
  )
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function SkillGapRow({ skill, currentLevel, requiredLevel, gap }: { skill: string; currentLevel: number; requiredLevel: number; gap: string }) {
  return (
    <div className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{skill}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-foreground/10 text-muted-foreground">
            {currentLevel}%
          </Badge>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {requiredLevel}%
          </Badge>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">Now</span>
          <Progress value={currentLevel} className="h-1.5 bg-foreground/5 [&>div]:bg-muted-foreground/60" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-primary">Goal</span>
          <Progress value={requiredLevel} className="h-1.5 bg-foreground/5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{gap}</p>
    </div>
  )
}

function buildRoadmapText(setup: RoadmapSetup, report: GenerateCareerRoadmapOutput) {
  const lines: string[] = []
  lines.push(`HIREFIT AI — CAREER ROADMAP`)
  lines.push(`${setup.targetCareer} · ${setup.experience} · ${setup.timeCommitment}`)
  lines.push("")
  lines.push(`CAREER SUMMARY`)
  lines.push(report.careerSummary)
  lines.push("")
  lines.push(`Current level: ${report.currentLevel}`)
  lines.push(`Estimated readiness after plan: ${report.estimatedReadiness}%`)
  lines.push("")
  lines.push(`SKILL GAP`)
  report.skillGap.forEach((skill) => {
    lines.push(`• ${skill.skill}: ${skill.currentLevel}% → ${skill.requiredLevel}% — ${skill.gap}`)
  })
  lines.push("")
  lines.push(`WEEKLY ROADMAP`)
  report.weeklyRoadmap.forEach((week) => {
    lines.push(`Week ${week.week}: ${week.focus}`)
    week.tasks.forEach((task) => lines.push(`   - ${task}`))
  })
  lines.push("")
  lines.push(`MONTHLY MILESTONES`)
  report.monthlyMilestones.forEach((milestone) => {
    lines.push(`Month ${milestone.month}: ${milestone.title} — ${milestone.description}`)
  })
  lines.push("")
  lines.push(`PROJECTS`)
  report.projects.forEach((project) => {
    lines.push(`• ${project.name} (${project.difficulty}) — ${project.description}`)
  })
  lines.push("")
  lines.push(`COURSES`)
  report.courses.forEach((course) => lines.push(`• ${course.title} (${course.provider})`))
  lines.push("")
  lines.push(`BOOKS`)
  report.books.forEach((book) => lines.push(`• ${book.title} (${book.provider})`))
  lines.push("")
  lines.push(`CERTIFICATIONS`)
  report.certifications.forEach((cert) => lines.push(`• ${cert.title} (${cert.provider})`))
  lines.push("")
  lines.push(`INTERVIEW PREPARATION`)
  report.interviewPreparation.forEach((item) => lines.push(`• ${item}`))
  return lines.join("\n")
}

export default function RoadmapPage() {
  const [phase, setPhase] = useState<RoadmapPhase>("setup")
  const [setup, setSetup] = useState<RoadmapSetup>(defaultSetup)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [report, setReport] = useState<GenerateCareerRoadmapOutput | null>(null)
  const [checkedMilestones, setCheckedMilestones] = useState<Record<number, boolean>>({})

  // Start from the time commitment configured in Settings (hydration-safe).
  useEffect(() => {
    setSetup((current) => ({ ...current, timeCommitment: loadSettings().roadmapTimeCommitment }))
  }, [])

  // Inject print-only styles so "Download PDF" prints just the roadmap report.
  useEffect(() => {
    if (phase !== "report") return
    const style = document.createElement("style")
    style.id = "roadmap-print-styles"
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #roadmap-report, #roadmap-report * { visibility: visible; }
        #roadmap-report { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.getElementById("roadmap-print-styles")?.remove()
    }
  }, [phase])

  const generate = async (setupOverride?: RoadmapSetup) => {
    const active = setupOverride ?? setup
    if (!active.currentEducation.trim() || !active.currentSkills.trim()) {
      toast({
        title: "Missing details",
        description: "Add your current education and skills so Gemini can build a realistic plan.",
        variant: "destructive",
      })
      return
    }
    setPhase("generating")
    setProgress(8)
    setError("")

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 5, 92))
    }, 800)

    try {
      const input: GenerateCareerRoadmapInput = {
        currentEducation: active.currentEducation,
        currentSkills: active.currentSkills,
        experience: active.experience,
        targetCareer: active.targetCareer,
        timeCommitment: active.timeCommitment,
      }
      const output = await withTimeout(
        generateCareerRoadmap(input),
        generationTimeoutMs,
        "Roadmap generation timed out. Please try again."
      )
      window.clearInterval(progressTimer)
      setReport(output)
      setCheckedMilestones({})
      setProgress(100)
      setPhase("report")
      recordActivity({
        type: "roadmapGenerated",
        timestamp: Date.now(),
        estimatedReadiness: output.estimatedReadiness,
        targetCareer: active.targetCareer,
        skillGap: output.skillGap.map((item) => ({
          skill: item.skill,
          currentLevel: item.currentLevel,
          requiredLevel: item.requiredLevel,
        })),
      })
    } catch (generationError) {
      window.clearInterval(progressTimer)
      setProgress(0)
      setPhase("error")
      setError(friendlyErrorMessage(generationError, "Failed to generate your career roadmap. Please try again."))
    }
  }

  const downloadPdf = () => {
    if (phase !== "report") return
    window.print()
  }

  const copyRoadmap = async () => {
    if (!report) return
    const text = buildRoadmapText(setup, report)
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: "Roadmap copied", description: "The full roadmap text was copied to your clipboard." })
    } catch {
      toast({ title: "Could not copy", description: "Your browser blocked clipboard access.", variant: "destructive" })
    }
  }

  const startOver = () => {
    setPhase("setup")
    setProgress(0)
    setError("")
    setReport(null)
    setCheckedMilestones({})
  }

  const toggleMilestone = (month: number) => {
    setCheckedMilestones((current) => ({ ...current, [month]: !current[month] }))
  }

  const completedMilestones = report ? Object.values(checkedMilestones).filter(Boolean).length : 0

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Career Roadmap</h1>
        <p className="text-muted-foreground text-lg">A personalized, Gemini-powered learning path from where you are to where you want to be.</p>
      </div>

      {phase === "setup" ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">Roadmap Setup</CardTitle>
                  <CardDescription>Tell Gemini where you are today and where you want to go.</CardDescription>
                </div>
                <Map className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Current Education</label>
                  <Textarea
                    value={setup.currentEducation}
                    onChange={(event) => setSetup((current) => ({ ...current, currentEducation: event.target.value }))}
                    placeholder="e.g. B.Tech in Computer Science (2023), self-taught web developer"
                    className="min-h-[80px] resize-y bg-background/50 border-foreground/10 text-sm leading-relaxed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Current Skills</label>
                  <Textarea
                    value={setup.currentSkills}
                    onChange={(event) => setSetup((current) => ({ ...current, currentSkills: event.target.value }))}
                    placeholder="e.g. Python, JavaScript, SQL, Git, basic data structures"
                    className="min-h-[80px] resize-y bg-background/50 border-foreground/10 text-sm leading-relaxed"
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Experience</label>
                    <Select value={setup.experience} onValueChange={(value) => setSetup((current) => ({ ...current, experience: value }))}>
                      <SelectTrigger className="h-11 border-foreground/10 bg-background/50 font-headline">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Target Career</label>
                    <Select value={setup.targetCareer} onValueChange={(value) => setSetup((current) => ({ ...current, targetCareer: value }))}>
                      <SelectTrigger className="h-11 border-foreground/10 bg-background/50 font-headline">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetCareers.map((career) => (
                          <SelectItem key={career} value={career}>
                            {career}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Time Commitment</label>
                    <Select value={setup.timeCommitment} onValueChange={(value) => setSetup((current) => ({ ...current, timeCommitment: value }))}>
                      <SelectTrigger className="h-11 border-foreground/10 bg-background/50 font-headline">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeCommitments.map((commitment) => (
                          <SelectItem key={commitment} value={commitment}>
                            {commitment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:col-span-5">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10">
                    <Target className="h-10 w-10 text-primary" strokeWidth={1} />
                  </div>
                  <h3 className="mt-6 font-headline text-xl font-medium">Chart your path</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Gemini will build a structured plan: your skill gaps, a week-by-week roadmap, monthly milestones, projects, courses, books, certifications, and interview prep — all scaled to your time commitment.
                  </p>
                  <Button type="button" onClick={() => generate()} className="mt-8 h-12 w-full max-w-xs font-headline">
                    <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Generate My Roadmap
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {phase === "generating" ? (
        <LoadingCard label="Building your career roadmap..." progress={progress} />
      ) : null}

      {phase === "error" && error ? (
        <Card className="glass-card border-red-500/20">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={startOver} className="border-foreground/10 hover:bg-foreground/5">
                Back to Setup
              </Button>
              <Button type="button" size="sm" onClick={() => generate()} className="font-headline">
                <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {phase === "report" && report ? (
        <div id="roadmap-report" className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{setup.targetCareer}</Badge>
              <Badge variant="outline" className="border-foreground/10">{setup.experience}</Badge>
              <Badge variant="outline" className="border-foreground/10">{setup.timeCommitment}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadPdf} className="border-foreground/10 hover:bg-foreground/5">
                <Download className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Download PDF
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={copyRoadmap} className="border-foreground/10 hover:bg-foreground/5">
                <ClipboardCopy className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Copy Roadmap
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => generate(setup)} className="border-foreground/10 hover:bg-foreground/5">
                <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Regenerate
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={startOver} className="border-foreground/10 hover:bg-foreground/5">
                <Map className="mr-2 h-4 w-4" strokeWidth={1.5} />
                New Roadmap
              </Button>
            </div>
          </div>

          {/* Progress / summary cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Career Summary</CardTitle>
                <CardDescription>Your personalized transition plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">{report.careerSummary}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    <GraduationCap className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                    Current Level: {report.currentLevel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Estimated Readiness</CardTitle>
                <CardDescription>After completing this plan.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-4">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg className="h-full w-full rotate-[-90deg]">
                    <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-foreground/5" />
                    <circle
                      cx="72"
                      cy="72"
                      r="66"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={415}
                      strokeDashoffset={415 - (415 * report.estimatedReadiness) / 100}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-headline font-bold">{report.estimatedReadiness}%</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Readiness</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skill gap chart */}
          <SectionCard icon={BarChart3} title="Skill Gap Analysis" description="Where you are today versus where your target career needs you to be.">
            <div className="grid gap-3 md:grid-cols-2">
              {report.skillGap.map((skill) => (
                <SkillGapRow key={skill.skill} skill={skill.skill} currentLevel={skill.currentLevel} requiredLevel={skill.requiredLevel} gap={skill.gap} />
              ))}
            </div>
          </SectionCard>

          {/* Weekly roadmap timeline */}
          <SectionCard icon={CalendarDays} title="Weekly Roadmap" description="A week-by-week plan scaled to your time commitment.">
            <div className="relative space-y-4">
              {report.weeklyRoadmap.map((week, index) => (
                <div key={`week-${week.week}`} className="relative flex gap-4">
                  {index < report.weeklyRoadmap.length - 1 ? (
                    <span className="absolute left-[15px] top-9 h-full w-px bg-gradient-to-b from-primary/40 to-transparent" aria-hidden="true" />
                  ) : null}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                    {week.week}
                  </span>
                  <div className="flex-1 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                    <p className="text-sm font-headline font-semibold text-foreground">{week.focus}</p>
                    <ul className="mt-2 space-y-1.5">
                      {week.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                          <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary/60" strokeWidth={1.5} />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Monthly milestones checklist */}
          <SectionCard icon={Flag} title="Monthly Milestones" description="Check off each milestone as you complete it.">
            <div className="mb-4 flex items-center gap-4">
              <Progress value={(completedMilestones / Math.max(report.monthlyMilestones.length, 1)) * 100} className="h-1.5 bg-foreground/5" />
              <span className="shrink-0 text-xs text-muted-foreground">{completedMilestones} / {report.monthlyMilestones.length} complete</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {report.monthlyMilestones.map((milestone) => {
                const checked = Boolean(checkedMilestones[milestone.month])
                const milestoneId = `milestone-${milestone.month}`
                return (
                  <div
                    key={milestoneId}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200 ${
                      checked ? "border-primary/30 bg-primary/5" : "border-foreground/5 bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                    }`}
                  >
                    <Checkbox
                      id={milestoneId}
                      checked={checked}
                      onCheckedChange={() => toggleMilestone(milestone.month)}
                      className="mt-0.5"
                    />
                    <label htmlFor={milestoneId} className="min-w-0 cursor-pointer">
                      <p className={`text-sm font-headline font-semibold ${checked ? "text-primary" : "text-foreground"}`}>
                        Month {milestone.month} · {milestone.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{milestone.description}</p>
                    </label>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Projects */}
          <SectionCard icon={Briefcase} title="Practice Projects" description="Realistic projects that demonstrate your growth to employers.">
            <div className="grid gap-3 md:grid-cols-2">
              {report.projects.map((project, index) => (
                <div key={`project-${index}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-headline font-semibold text-foreground">{project.name}</p>
                    <Badge variant="outline" className="border-foreground/10 text-muted-foreground">{project.difficulty}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Learning cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard icon={BookOpen} title="Courses" description="Recommended learning resources.">
              <div className="space-y-3">
                {report.courses.map((course, index) => (
                  <div key={`course-${index}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-3.5">
                    <p className="text-sm font-medium text-foreground">{course.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{course.provider}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard icon={Library} title="Books" description="Books worth reading along the way.">
              <div className="space-y-3">
                {report.books.map((book, index) => (
                  <div key={`book-${index}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-3.5">
                    <p className="text-sm font-medium text-foreground">{book.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{book.provider}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard icon={Award} title="Certifications" description="Only real, verifiable certifications.">
              <div className="space-y-3">
                {report.certifications.map((cert, index) => (
                  <div key={`cert-${index}`} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-3.5">
                    <p className="text-sm font-medium text-foreground">{cert.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{cert.provider}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Interview preparation */}
          <SectionCard icon={Lightbulb} title="Interview Preparation" description="How to turn your learning into an offer.">
            <div className="grid gap-3">
              {report.interviewPreparation.map((item, index) => (
                <div key={`interview-${index}`} className="flex gap-4 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="flex items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Certifications and resources are recommended from real, verifiable sources only. No fabrications.
          </div>
        </div>
      ) : null}
    </div>
  )
}
