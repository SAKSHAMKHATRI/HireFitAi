"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cpu,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic2,
  Puzzle,
  RotateCcw,
  Save,
  Send,
  SkipForward,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import {
  generateInterviewQuestions,
  type GenerateInterviewQuestionsInput,
  type InterviewQuestion,
} from "@/ai/flows/generate-interview-questions"
import {
  evaluateInterviewAnswers,
  type EvaluateInterviewAnswersOutput,
} from "@/ai/flows/evaluate-interview-answers"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { recordActivity } from "@/lib/analytics"
import { loadSettings } from "@/lib/settings"
import { friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"

const generationTimeoutMs = 60000
const evaluationTimeoutMs = 90000
const questionTimeLimitSeconds = 180
const saveProgressKey = "hirefit_interview_progress"

const targetRoles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "AI Engineer",
  "ML Engineer",
]
const experienceLevels = ["Fresher", "Junior", "Mid", "Senior"]
const interviewTypes = ["HR", "Technical", "Behavioral", "Mixed"]
const difficultyLevels = ["Easy", "Medium", "Hard"]

type InterviewSetup = {
  targetRole: string
  experienceLevel: string
  interviewType: string
  difficulty: string
}

type SavedProgress = {
  setup: InterviewSetup
  questions: InterviewQuestion[]
  answers: string[]
  currentIndex: number
  savedAt: number
}

type InterviewPhase = "setup" | "generating" | "interview" | "evaluating" | "report" | "error"

const defaultSetup: InterviewSetup = {
  targetRole: "Software Engineer",
  experienceLevel: "Mid",
  interviewType: "Mixed",
  difficulty: "Medium",
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function loadSavedProgress(): SavedProgress | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(saveProgressKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedProgress
    if (!parsed.setup || !Array.isArray(parsed.questions) || !Array.isArray(parsed.answers)) return null
    if (parsed.currentIndex < 0 || parsed.currentIndex >= parsed.questions.length) return null
    return parsed
  } catch {
    return null
  }
}

function clearSavedProgress() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(saveProgressKey)
  } catch {
    // ignore storage failures
  }
}

function difficultyTone(difficulty: string) {
  switch (difficulty) {
    case "Easy":
      return "border-green-500/30 text-green-400"
    case "Medium":
      return "border-yellow-500/30 text-yellow-400"
    case "Hard":
      return "border-red-500/30 text-red-400"
    default:
      return "border-white/20 text-muted-foreground"
  }
}

function recommendationTone(rec: string) {
  const normalized = rec.toLowerCase()
  if (normalized.includes("strong")) return "border-green-500/40 bg-green-500/10 text-green-400"
  if (normalized.includes("no hire")) return "border-red-500/40 bg-red-500/10 text-red-400"
  if (normalized.includes("lean")) return "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
  return "border-primary/40 bg-primary/10 text-primary"
}

function SetupField({
  label,
  value,
  onValueChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 border-white/10 bg-background/50 font-headline">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function NumberedSectionCard({
  title,
  description,
  items,
  tone = "primary",
}: {
  title: string
  description: string
  items: string[]
  tone?: "primary" | "yellow"
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm font-headline tracking-widest uppercase">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${title}-${index}`} className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone === "yellow" ? "bg-yellow-500/10 text-yellow-400" : "bg-primary/10 text-primary"}`}>
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-muted-foreground">{item}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No items returned by Gemini.</p>
        )}
      </CardContent>
    </Card>
  )
}

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

export default function InterviewPage() {
  const [phase, setPhase] = useState<InterviewPhase>("setup")
  const [setup, setSetup] = useState<InterviewSetup>(defaultSetup)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(questionTimeLimitSeconds)
  const [timeUp, setTimeUp] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [report, setReport] = useState<EvaluateInterviewAnswersOutput | null>(null)
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null)

  // Load any locally saved interview after mount to avoid a server/client hydration mismatch.
  useEffect(() => {
    setSavedProgress(loadSavedProgress())
  }, [])

  // Start from the role and experience configured in Settings (hydration-safe).
  useEffect(() => {
    const defaults = loadSettings()
    setSetup((current) => ({
      ...current,
      targetRole: defaults.targetRole,
      experienceLevel: defaults.experienceLevel,
    }))
  }, [])

  const saveProgress = () => {
    try {
      window.localStorage.setItem(
        saveProgressKey,
        JSON.stringify({
          setup,
          questions,
          answers,
          currentIndex,
          savedAt: Date.now(),
        } satisfies SavedProgress)
      )
      setSavedProgress({ setup, questions, answers, currentIndex, savedAt: Date.now() })
      toast({ title: "Progress saved", description: "Your interview progress was saved locally. You can resume it later." })
    } catch {
      toast({ title: "Could not save progress", description: "Your browser blocked local storage.", variant: "destructive" })
    }
  }

  const resumeSaved = (saved: SavedProgress) => {
    setSetup(saved.setup)
    setQuestions(saved.questions)
    setAnswers(saved.answers)
    setCurrentIndex(saved.currentIndex)
    setHintOpen(false)
    setError("")
    setPhase("interview")
  }

  const startInterview = async () => {
    setPhase("generating")
    setProgress(8)
    setError("")

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 5, 92))
    }, 700)

    try {
      const input: GenerateInterviewQuestionsInput = {
        targetRole: setup.targetRole,
        experienceLevel: setup.experienceLevel,
        interviewType: setup.interviewType,
        difficulty: setup.difficulty,
      }
      const output = await withTimeout(
        generateInterviewQuestions(input),
        generationTimeoutMs,
        "Question generation timed out. Please try again."
      )
      window.clearInterval(progressTimer)
      setQuestions(output.questions)
      setAnswers(output.questions.map(() => ""))
      setCurrentIndex(0)
      setHintOpen(false)
      setProgress(100)
      setPhase("interview")
      clearSavedProgress()
      setSavedProgress(null)
    } catch (generationError) {
      window.clearInterval(progressTimer)
      setProgress(0)
      setPhase("error")
      setError(friendlyErrorMessage(generationError, "Failed to generate interview questions. Please try again."))
    }
  }

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index)
    setHintOpen(false)
  }, [])

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1)
    }
  }

  const goPrevious = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1)
    }
  }

  const skipQuestion = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1)
    } else {
      toast({ title: "Last question", description: "This is the final question. Answer it or submit the interview." })
    }
  }

  // Per-question countdown timer, restarted on each question change.
  useEffect(() => {
    if (phase !== "interview") return
    setSecondsLeft(questionTimeLimitSeconds)
    setTimeUp(false)
  }, [phase, currentIndex])

  useEffect(() => {
    if (phase !== "interview" || secondsLeft <= 0) return
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase, secondsLeft])

  // Auto-advance only on the exact >0 → 0 transition so a question is never skipped.
  const prevSecondsLeft = useRef(questionTimeLimitSeconds)
  useEffect(() => {
    const crossedZero = prevSecondsLeft.current > 0 && secondsLeft === 0
    prevSecondsLeft.current = secondsLeft
    if (phase !== "interview" || !crossedZero) return
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1)
    } else {
      setTimeUp(true)
    }
  }, [phase, secondsLeft, currentIndex, questions.length, goToQuestion])

  const submitInterview = async () => {
    const answered = questions
      .map((question, index) => ({ question, answer: answers[index] ?? "" }))
      .filter((entry) => entry.answer.trim().length > 0)

    if (answered.length === 0) {
      toast({
        title: "No answers yet",
        description: "Answer at least one question before submitting for evaluation.",
        variant: "destructive",
      })
      return
    }

    setPhase("evaluating")
    setProgress(10)
    setError("")

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 4, 92))
    }, 800)

    try {
      const output = await withTimeout(
        evaluateInterviewAnswers({
          targetRole: setup.targetRole,
          experienceLevel: setup.experienceLevel,
          interviewType: setup.interviewType,
          difficulty: setup.difficulty,
          answeredQuestions: answered.map(({ question, answer }) => ({
            question: question.question,
            category: question.category,
            difficulty: question.difficulty,
            answer,
          })),
        }),
        evaluationTimeoutMs,
        "Evaluation timed out. Please try again."
      )
      window.clearInterval(progressTimer)
      setReport(output)
      setProgress(100)
      setPhase("report")
      clearSavedProgress()
      setSavedProgress(null)
      recordActivity({
        type: "interviewCompleted",
        timestamp: Date.now(),
        overallScore: output.overallScore,
        communication: output.communication,
        technicalAccuracy: output.technicalAccuracy,
        problemSolving: output.problemSolving,
        confidence: output.confidence,
        hiringRecommendation: output.hiringRecommendation,
        recommendedTopics: output.recommendedTopics,
      })
    } catch (evaluationError) {
      window.clearInterval(progressTimer)
      setProgress(0)
      setPhase("error")
      setError(friendlyErrorMessage(evaluationError, "Failed to evaluate your answers. Please try again."))
    }
  }

  const startOver = () => {
    setPhase("setup")
    setQuestions([])
    setAnswers([])
    setCurrentIndex(0)
    setSecondsLeft(questionTimeLimitSeconds)
    setTimeUp(false)
    setHintOpen(false)
    setProgress(0)
    setError("")
    setReport(null)
  }

  const updateAnswer = (index: number, value: string) => {
    setAnswers((current) => {
      const next = [...current]
      next[index] = value
      return next
    })
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = answers.filter((answer) => answer.trim().length > 0).length
  const isLastQuestion = currentIndex === questions.length - 1

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">AI Interview</h1>
        <p className="text-muted-foreground text-lg">A realistic Gemini-powered mock interview. Answer questions, then receive a full performance report.</p>
      </div>

      {phase === "setup" ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">Interview Setup</CardTitle>
                  <CardDescription>Configure the role, seniority, and style of your mock interview.</CardDescription>
                </div>
                <Mic2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <SetupField
                  label="Target Role"
                  value={setup.targetRole}
                  onValueChange={(value) => setSetup((current) => ({ ...current, targetRole: value }))}
                  options={targetRoles}
                  placeholder="Select a role"
                />
                <SetupField
                  label="Experience"
                  value={setup.experienceLevel}
                  onValueChange={(value) => setSetup((current) => ({ ...current, experienceLevel: value }))}
                  options={experienceLevels}
                  placeholder="Select experience"
                />
                <SetupField
                  label="Interview Type"
                  value={setup.interviewType}
                  onValueChange={(value) => setSetup((current) => ({ ...current, interviewType: value }))}
                  options={interviewTypes}
                  placeholder="Select type"
                />
                <SetupField
                  label="Difficulty"
                  value={setup.difficulty}
                  onValueChange={(value) => setSetup((current) => ({ ...current, difficulty: value }))}
                  options={difficultyLevels}
                  placeholder="Select difficulty"
                />
              </CardContent>
            </Card>

            {savedProgress ? (
              <Card className="glass-card border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-headline tracking-widest uppercase">Saved Interview Found</CardTitle>
                    <CardDescription>
                      {savedProgress.setup.targetRole} · {savedProgress.setup.interviewType} · Question {Math.min(savedProgress.currentIndex + 1, savedProgress.questions.length)} of {savedProgress.questions.length} · saved{" "}
                      {new Date(savedProgress.savedAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => resumeSaved(savedProgress)} className="border-white/10 hover:bg-white/5">
                      <RotateCcw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      Resume
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => { clearSavedProgress(); setSavedProgress(null) }} className="border-white/10 hover:bg-white/5">
                      Discard
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6 xl:col-span-5">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-10 w-10 text-primary" strokeWidth={1} />
                  </div>
                  <h3 className="mt-6 font-headline text-xl font-medium">Ready to practice?</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Gemini will generate 10 unique questions tailored to your setup. Answer as many as you can, then receive a detailed evaluation of your performance.
                  </p>
                  <Button type="button" onClick={startInterview} className="mt-8 h-12 w-full max-w-xs font-headline">
                    <Mic2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Start Interview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {phase === "generating" ? (
        <LoadingCard label="Generating your interview questions..." progress={progress} />
      ) : null}

      {phase === "interview" && currentQuestion ? (
        <div className="space-y-6">
          <Card className="glass-card">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {currentIndex + 1}
                  </span>
                  <div>
                    <p className="font-headline text-sm font-semibold">Question {currentIndex + 1} of {questions.length}</p>
                    <p className="text-xs text-muted-foreground">{answeredCount} answered · {questions.length - answeredCount} remaining</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock3 className={`h-4 w-4 ${secondsLeft <= 30 && !timeUp ? "animate-pulse text-red-400" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  <span className={`font-mono text-sm tabular-nums ${secondsLeft <= 30 && !timeUp ? "font-bold text-red-400" : "text-muted-foreground"}`}>
                    {timeUp ? "0:00" : formatTime(secondsLeft)}
                  </span>
                </div>
              </div>
              <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5" />
            </CardContent>
          </Card>

          {timeUp ? (
            <Card className="glass-card border-yellow-500/30">
              <CardContent className="flex items-center gap-3 p-4 text-sm text-yellow-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Time is up for this question. You can keep refining your answer or submit the interview.
              </CardContent>
            </Card>
          ) : null}

          <Card className="glass-card">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">{setup.interviewType} Interview · {setup.targetRole}</CardTitle>
                <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{currentQuestion.category}</Badge>
                  <Badge variant="outline" className={difficultyTone(currentQuestion.difficulty)}>{currentQuestion.difficulty}</Badge>
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHintOpen((current) => !current)}
                className="border-white/10 hover:bg-white/5"
              >
                <Lightbulb className="mr-2 h-4 w-4" strokeWidth={1.5} />
                {hintOpen ? "Hide Hint" : "Show Hint"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-headline text-2xl font-semibold leading-snug">{currentQuestion.question}</h3>

              {hintOpen ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in zoom-in-95 duration-200">
                  <p className="mb-1 flex items-center gap-2 text-xs font-headline uppercase tracking-widest text-primary">
                    <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Hint
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">{currentQuestion.hint}</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Your Answer</label>
                  <span className="text-xs text-muted-foreground">{(answers[currentIndex] ?? "").trim().length} characters</span>
                </div>
                <Textarea
                  value={answers[currentIndex] ?? ""}
                  onChange={(event) => updateAnswer(currentIndex, event.target.value)}
                  placeholder="Type your answer as you would in a real interview. Aim for a structured response — the interviewer values clarity and specifics."
                  className="min-h-[220px] resize-y bg-background/50 border-white/10 text-sm leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={goPrevious} disabled={currentIndex === 0} className="border-white/10 hover:bg-white/5">
                    <ChevronLeft className="mr-1 h-4 w-4" strokeWidth={1.5} />
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={skipQuestion} className="border-white/10 hover:bg-white/5">
                    <SkipForward className="mr-1 h-4 w-4" strokeWidth={1.5} />
                    Skip
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={saveProgress} className="border-white/10 hover:bg-white/5">
                    <Save className="mr-1 h-4 w-4" strokeWidth={1.5} />
                    Save Progress
                  </Button>
                  {!isLastQuestion ? (
                    <Button type="button" variant="outline" size="sm" onClick={goNext} className="border-white/10 hover:bg-white/5">
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" onClick={submitInterview} className="font-headline">
                    <Send className="mr-1 h-4 w-4" strokeWidth={1.5} />
                    {isLastQuestion ? "Submit Interview" : "Finish & Evaluate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {phase === "evaluating" ? (
        <LoadingCard label="Evaluating your answers..." progress={progress} />
      ) : null}

      {phase === "error" && error ? (
        <Card className="glass-card border-red-500/20">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      {phase === "report" && report ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{setup.targetRole}</Badge>
              <Badge variant="outline" className="border-white/10">{setup.experienceLevel}</Badge>
              <Badge variant="outline" className="border-white/10">{setup.interviewType}</Badge>
              <Badge variant="outline" className="border-white/10">{setup.difficulty}</Badge>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={startOver} className="border-white/10 hover:bg-white/5">
              <RotateCcw className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Start New Interview
            </Button>
          </div>

          <Card className="glass-card border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Overall Performance</CardTitle>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 py-6 sm:flex-row sm:justify-center sm:gap-12">
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <svg className="h-full w-full rotate-[-90deg]">
                    <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
                    <circle
                      cx="80"
                      cy="80"
                      r="74"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={465}
                      strokeDashoffset={465 - (465 * report.overallScore) / 100}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-headline font-bold">{report.overallScore}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall Score</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
                <p className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Hiring Recommendation</p>
                <Badge className={recommendationTone(report.hiringRecommendation)}>{report.hiringRecommendation}</Badge>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  {answeredCount} of {questions.length} questions answered · {Math.round((answeredCount * 100) / Math.max(questions.length, 1))}% completion. Scores reflect only the answers you provided.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Communication" value={`${report.communication}%`} description="Clarity and articulation" icon={MessageSquare} trend={{ value: "Live", positive: report.communication >= 60 }} />
            <MetricCard title="Technical Accuracy" value={`${report.technicalAccuracy}%`} description="Technical correctness and depth" icon={Cpu} trend={{ value: "Live", positive: report.technicalAccuracy >= 60 }} />
            <MetricCard title="Problem Solving" value={`${report.problemSolving}%`} description="Analytical and structured thinking" icon={Puzzle} trend={{ value: "Live", positive: report.problemSolving >= 60 }} />
            <MetricCard title="Confidence" value={`${report.confidence}%`} description="Decisiveness and composure" icon={TrendingUp} trend={{ value: "Live", positive: report.confidence >= 60 }} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <NumberedSectionCard title="Strengths" description="What you did well, grounded in your answers." items={report.strengths} />
            <NumberedSectionCard title="Weaknesses" description="Areas to improve, grounded in your answers." items={report.weaknesses} tone="yellow" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <NumberedSectionCard title="Missed Concepts" description="Key points that were missing from your answers." items={report.missedConcepts} tone="yellow" />
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-headline tracking-widest uppercase">Recommended Topics</CardTitle>
                <CardDescription>What to study next for this role.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {report.recommendedTopics.length ? (
                  report.recommendedTopics.map((topic) => (
                    <Badge key={topic} className="bg-primary/10 text-primary hover:bg-primary/20">{topic}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No topics returned by Gemini.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Practice Plan</CardTitle>
              <CardDescription>Concrete steps to improve before your next interview.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {report.practicePlan.length ? (
                report.practicePlan.map((step, index) => (
                  <div key={`practice-${index}`} className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No practice plan returned by Gemini.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Evaluation is grounded only in the answers you provided. No assumptions or fabrications.
          </div>
        </div>
      ) : null}
    </div>
  )
}
