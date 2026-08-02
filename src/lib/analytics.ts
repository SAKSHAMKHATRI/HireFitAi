/**
 * Central analytics store for the HireFit Command Center dashboard.
 *
 * Modules record lightweight events whenever Gemini finishes a job; the
 * dashboard derives every metric exclusively from these persisted events.
 * Nothing here is fabricated: if an event type has never been recorded,
 * the corresponding analytics show an empty state instead of a number.
 */

export const analyticsStorageKey = "hirefit_analytics"

const maxStoredEvents = 400

/* ------------------------------------------------------------------ */
/* Event types                                                         */
/* ------------------------------------------------------------------ */

export type ResumeAnalyzedEvent = {
  type: "resumeAnalyzed"
  timestamp: number
  atsScore: number
  technicalSkills: string[]
  softSkills: string[]
  missingSkills: string[]
}

export type JobMatchedEvent = {
  type: "jobMatched"
  timestamp: number
  matchScore: number
  atsCompatibility: number
  matchedSkills: string[]
  missingSkills: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
}

export type HireEvaluatedEvent = {
  type: "hireEvaluated"
  timestamp: number
  matchScore: number
}

export type BulletsOptimizedEvent = {
  type: "bulletsOptimized"
  timestamp: number
  inputCount: number
  optimizedCount: number
  optimizedBullets: string[]
}

export type InterviewCompletedEvent = {
  type: "interviewCompleted"
  timestamp: number
  overallScore: number
  communication: number
  technicalAccuracy: number
  problemSolving: number
  confidence: number
  hiringRecommendation: string
  recommendedTopics: string[]
}

export type RoadmapGeneratedEvent = {
  type: "roadmapGenerated"
  timestamp: number
  estimatedReadiness: number
  targetCareer: string
  skillGap: { skill: string; currentLevel: number; requiredLevel: number }[]
}

export type CoachConversationEvent = {
  type: "coachConversation"
  timestamp: number
  userMessages: number
}

export type CoverLetterGeneratedEvent = {
  type: "coverLetterGenerated"
  timestamp: number
  tone: string
  companyName: string
}

export type RecruiterSimulatedEvent = {
  type: "recruiterSimulated"
  timestamp: number
  shortlistProbability: string
}

export type AnalyticsEvent =
  | ResumeAnalyzedEvent
  | JobMatchedEvent
  | HireEvaluatedEvent
  | BulletsOptimizedEvent
  | InterviewCompletedEvent
  | RoadmapGeneratedEvent
  | CoachConversationEvent
  | CoverLetterGeneratedEvent
  | RecruiterSimulatedEvent

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isValidEvent(raw: unknown): raw is AnalyticsEvent {
  if (!isRecord(raw) || !isFiniteNumber(raw.timestamp) || typeof raw.type !== "string") {
    return false
  }
  switch (raw.type) {
    case "resumeAnalyzed":
      return isFiniteNumber(raw.atsScore) && isStringArray(raw.technicalSkills) && isStringArray(raw.softSkills) && isStringArray(raw.missingSkills)
    case "jobMatched":
      return isFiniteNumber(raw.matchScore) && isFiniteNumber(raw.atsCompatibility) && isStringArray(raw.matchedSkills) && isStringArray(raw.missingSkills) && isStringArray(raw.matchedKeywords) && isStringArray(raw.missingKeywords)
    case "hireEvaluated":
      return isFiniteNumber(raw.matchScore)
    case "bulletsOptimized":
      return isFiniteNumber(raw.inputCount) && isFiniteNumber(raw.optimizedCount) && isStringArray(raw.optimizedBullets)
    case "interviewCompleted":
      return isFiniteNumber(raw.overallScore) && isFiniteNumber(raw.communication) && isFiniteNumber(raw.technicalAccuracy) && isFiniteNumber(raw.problemSolving) && isFiniteNumber(raw.confidence) && typeof raw.hiringRecommendation === "string" && isStringArray(raw.recommendedTopics)
    case "roadmapGenerated":
      return isFiniteNumber(raw.estimatedReadiness) && typeof raw.targetCareer === "string" && Array.isArray(raw.skillGap) && raw.skillGap.every((item) => isRecord(item) && typeof item.skill === "string" && isFiniteNumber(item.currentLevel) && isFiniteNumber(item.requiredLevel))
    case "coachConversation":
      return isFiniteNumber(raw.userMessages)
    case "coverLetterGenerated":
      return typeof raw.tone === "string" && typeof raw.companyName === "string"
    case "recruiterSimulated":
      return typeof raw.shortlistProbability === "string"
    default:
      return false
  }
}

export function loadAnalytics(): AnalyticsEvent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(analyticsStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEvent)
  } catch {
    return []
  }
}

export function recordActivity(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return
  try {
    const current = loadAnalytics()
    current.push(event)
    if (current.length > maxStoredEvents) {
      current.splice(0, current.length - maxStoredEvents)
    }
    window.localStorage.setItem(analyticsStorageKey, JSON.stringify(current))
  } catch {
    // Analytics must never break the module that produced the event.
  }
}

/* ------------------------------------------------------------------ */
/* Module registry (single source of truth for module metadata)        */
/* ------------------------------------------------------------------ */

export type AnalyticsModuleKey =
  | "analyzer"
  | "match"
  | "evaluator"
  | "recruiter"
  | "optimizer"
  | "interview"
  | "roadmap"
  | "coach"
  | "coverLetter"

export const analyticsModules: {
  key: AnalyticsModuleKey
  label: string
  shortLabel: string
  href: string
  eventType: AnalyticsEvent["type"]
}[] = [
  { key: "analyzer", label: "Resume Analyzer", shortLabel: "Analyzer", href: "/analyzer", eventType: "resumeAnalyzed" },
  { key: "match", label: "AI Match", shortLabel: "Match", href: "/match", eventType: "jobMatched" },
  { key: "evaluator", label: "H.I.R.E Evaluator", shortLabel: "H.I.R.E", href: "/evaluator", eventType: "hireEvaluated" },
  { key: "recruiter", label: "Recruiter Mode", shortLabel: "Recruiter", href: "/recruiter", eventType: "recruiterSimulated" },
  { key: "optimizer", label: "Bullet Optimizer", shortLabel: "Optimizer", href: "/optimizer", eventType: "bulletsOptimized" },
  { key: "interview", label: "AI Interview", shortLabel: "Interview", href: "/interview", eventType: "interviewCompleted" },
  { key: "roadmap", label: "Career Roadmap", shortLabel: "Roadmap", href: "/roadmap", eventType: "roadmapGenerated" },
  { key: "coach", label: "Career Coach", shortLabel: "Coach", href: "/coach", eventType: "coachConversation" },
  { key: "coverLetter", label: "Cover Letter", shortLabel: "Cover Letter", href: "/cover-letter", eventType: "coverLetterGenerated" },
]

export const analyticsMilestones: { key: AnalyticsEvent["type"]; label: string }[] = [
  { key: "resumeAnalyzed", label: "First resume analysis" },
  { key: "jobMatched", label: "First job match" },
  { key: "hireEvaluated", label: "First H.I.R.E scan" },
  { key: "recruiterSimulated", label: "First recruiter simulation" },
  { key: "bulletsOptimized", label: "First bullet optimization" },
  { key: "interviewCompleted", label: "First interview completed" },
  { key: "roadmapGenerated", label: "First roadmap generated" },
  { key: "coachConversation", label: "First coach conversation" },
  { key: "coverLetterGenerated", label: "First cover letter" },
]

/* ------------------------------------------------------------------ */
/* Derivation helpers                                                  */
/* ------------------------------------------------------------------ */

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function latestByType<T extends AnalyticsEvent["type"]>(
  events: AnalyticsEvent[],
  type: T
): Extract<AnalyticsEvent, { type: T }> | null {
  let latest: Extract<AnalyticsEvent, { type: T }> | null = null
  for (const event of events) {
    if (event.type !== type) continue
    const candidate = event as Extract<AnalyticsEvent, { type: T }>
    if (!latest || candidate.timestamp >= latest.timestamp) {
      latest = candidate
    }
  }
  return latest
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

/* -- Application Readiness ---------------------------------------- */

export type ReadinessBreakdown = {
  score: number
  resume: number | null
  match: number | null
  interview: number | null
  roadmap: number | null
}

export function computeReadinessBreakdown(events: AnalyticsEvent[]): ReadinessBreakdown | null {
  const resume = latestByType(events, "resumeAnalyzed")?.atsScore ?? null
  const matchEvent = latestByType(events, "jobMatched")
  const hireEvent = latestByType(events, "hireEvaluated")
  const match =
    matchEvent?.matchScore ??
    hireEvent?.matchScore ??
    matchEvent?.atsCompatibility ??
    null
  const interview = latestByType(events, "interviewCompleted")?.overallScore ?? null
  const roadmap = latestByType(events, "roadmapGenerated")?.estimatedReadiness ?? null

  const sources = [resume, match, interview, roadmap].filter(
    (value): value is number => typeof value === "number"
  )
  if (sources.length === 0) return null
  return {
    score: Math.round(average(sources)),
    resume,
    match,
    interview,
    roadmap,
  }
}

export type TrendPoint = {
  label: string
  readiness: number | null
  resume: number | null
  interview: number | null
}

export function computeTrendSeries(events: AnalyticsEvent[]): TrendPoint[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const running: AnalyticsEvent[] = []
  const points: TrendPoint[] = []

  for (const event of sorted) {
    running.push(event)
    const breakdown = computeReadinessBreakdown(running)
    const latestResume = latestByType(running, "resumeAnalyzed")?.atsScore ?? null
    const latestInterview = latestByType(running, "interviewCompleted")?.overallScore ?? null
    points.push({
      label: new Date(event.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      readiness: breakdown?.score ?? null,
      resume: latestResume,
      interview: latestInterview,
    })
  }
  return points
}

export function computeReadinessTrend(events: AnalyticsEvent[]): { value: string; positive: boolean } | null {
  const points = computeTrendSeries(events)
  if (points.length < 2) return null
  const last = points[points.length - 1].readiness
  const previous = points[points.length - 2].readiness
  if (last === null || previous === null) return null
  const delta = last - previous
  return { value: `${delta >= 0 ? "+" : ""}${delta}`, positive: delta >= 0 }
}

/* -- Keyword Coverage ---------------------------------------------- */

export function computeKeywordCoverage(events: AnalyticsEvent[]): {
  coverage: number
  matched: number
  missing: number
} | null {
  const match = latestByType(events, "jobMatched")
  if (!match) return null
  const total = match.matchedKeywords.length + match.missingKeywords.length
  if (total === 0) return null
  return {
    coverage: Math.round((match.matchedKeywords.length / total) * 100),
    matched: match.matchedKeywords.length,
    missing: match.missingKeywords.length,
  }
}

export function computeKeywordCoverageTrend(events: AnalyticsEvent[]): { value: string; positive: boolean } | null {
  const matches = events
    .filter((event): event is JobMatchedEvent => event.type === "jobMatched")
    .sort((a, b) => a.timestamp - b.timestamp)
  if (matches.length < 2) return null
  const coverage = (match: JobMatchedEvent) => {
    const total = match.matchedKeywords.length + match.missingKeywords.length
    return total === 0 ? null : Math.round((match.matchedKeywords.length / total) * 100)
  }
  const last = coverage(matches[matches.length - 1])
  const previous = coverage(matches[matches.length - 2])
  if (last === null || previous === null) return null
  const delta = last - previous
  return { value: `${delta >= 0 ? "+" : ""}${delta}%`, positive: delta >= 0 }
}

/* -- Achievement Strength ------------------------------------------- */

export function computeAchievementStrength(events: AnalyticsEvent[]): {
  strength: number
  optimizedCount: number
  quantifiedCount: number
} | null {
  const optimized = latestByType(events, "bulletsOptimized")
  if (!optimized || optimized.optimizedBullets.length === 0) return null
  const quantifiedCount = optimized.optimizedBullets.filter((bullet) => /\d/.test(bullet)).length
  return {
    strength: Math.round((quantifiedCount / optimized.optimizedBullets.length) * 100),
    optimizedCount: optimized.optimizedCount,
    quantifiedCount,
  }
}

export function computeAchievementStrengthTrend(events: AnalyticsEvent[]): { value: string; positive: boolean } | null {
  const optimizedEvents = events
    .filter((event): event is BulletsOptimizedEvent => event.type === "bulletsOptimized")
    .sort((a, b) => a.timestamp - b.timestamp)
  if (optimizedEvents.length < 2) return null
  const strength = (event: BulletsOptimizedEvent) =>
    event.optimizedBullets.length === 0
      ? null
      : Math.round((event.optimizedBullets.filter((bullet) => /\d/.test(bullet)).length / event.optimizedBullets.length) * 100)
  const last = strength(optimizedEvents[optimizedEvents.length - 1])
  const previous = strength(optimizedEvents[optimizedEvents.length - 2])
  if (last === null || previous === null) return null
  const delta = last - previous
  return { value: `${delta >= 0 ? "+" : ""}${delta}`, positive: delta >= 0 }
}

/* -- Recruiter Shortlist -------------------------------------------- */

export function computeRecruiterShortlist(events: AnalyticsEvent[]): {
  label: string
  detail: string
} | null {
  const simulation = latestByType(events, "recruiterSimulated")
  if (simulation) {
    return {
      label: simulation.shortlistProbability,
      detail: "Latest recruiter simulation",
    }
  }
  const hire = latestByType(events, "hireEvaluated")
  if (hire) {
    const label = hire.matchScore >= 75 ? "High" : hire.matchScore >= 50 ? "Medium" : "Low"
    return { label, detail: `H.I.R.E match ${hire.matchScore}/100` }
  }
  return null
}

/* -- Skill Gap Overview ---------------------------------------------- */

export type SkillGapItem = {
  skill: string
  currentLevel: number
  requiredLevel: number
  gap: number
}

export function computeSkillGap(events: AnalyticsEvent[]): {
  missingSkills: string[]
  prioritySkills: SkillGapItem[]
  learningProgress: number | null
} | null {
  const match = latestByType(events, "jobMatched")
  const analyzer = latestByType(events, "resumeAnalyzed")
  const roadmap = latestByType(events, "roadmapGenerated")

  const missingSkills = dedupe([
    ...(match?.missingSkills ?? []),
    ...(analyzer?.missingSkills ?? []),
  ]).slice(0, 8)

  const prioritySkills: SkillGapItem[] = roadmap
    ? [...roadmap.skillGap]
        .map((item) => ({ ...item, gap: item.requiredLevel - item.currentLevel }))
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 4)
    : []

  const learningProgress =
    roadmap && roadmap.skillGap.length > 0
      ? Math.round(
          (average(roadmap.skillGap.map((item) => item.currentLevel)) /
            Math.max(average(roadmap.skillGap.map((item) => item.requiredLevel)), 1)) *
            100
        )
      : null

  if (missingSkills.length === 0 && prioritySkills.length === 0) return null
  return { missingSkills, prioritySkills, learningProgress }
}

/* -- Career Progress -------------------------------------------------- */

export type CareerProgress = {
  totalModules: number
  completedModules: number
  completionPct: number
  modules: { key: AnalyticsModuleKey; label: string; shortLabel: string; href: string; used: boolean }[]
}

export function computeCareerProgress(events: AnalyticsEvent[]): CareerProgress {
  const used = new Set(events.map((event) => event.type))
  const modules = analyticsModules.map((module) => ({ ...module, used: used.has(module.eventType) }))
  const completedModules = modules.filter((module) => module.used).length
  return {
    totalModules: modules.length,
    completedModules,
    completionPct: Math.round((completedModules / modules.length) * 100),
    modules,
  }
}

export function computeMilestones(events: AnalyticsEvent[]): { key: string; label: string; reached: boolean }[] {
  const reached = new Set(events.map((event) => event.type))
  return analyticsMilestones.map((milestone) => ({
    ...milestone,
    reached: reached.has(milestone.key),
  }))
}

/* -- Recent Activity --------------------------------------------------- */

export type EventSummary = {
  title: string
  detail: string
}

/** Human-readable summary for an analytics event (shared by activity + notifications). */
export function getEventSummary(event: AnalyticsEvent): EventSummary {
  switch (event.type) {
    case "resumeAnalyzed":
      return { title: "Resume analyzed", detail: `ATS score ${event.atsScore}%` }
    case "jobMatched":
      return { title: "Job matched", detail: `Match ${event.matchScore}% · ${event.matchedKeywords.length} keywords matched` }
    case "hireEvaluated":
      return { title: "H.I.R.E evaluation", detail: `Match score ${event.matchScore}%` }
    case "recruiterSimulated":
      return { title: "Recruiter simulation", detail: `${event.shortlistProbability} shortlist probability` }
    case "bulletsOptimized":
      return { title: "Bullets optimized", detail: `${event.optimizedCount} achievement statements refined` }
    case "interviewCompleted":
      return { title: "Interview completed", detail: `Overall ${event.overallScore} · ${event.hiringRecommendation}` }
    case "roadmapGenerated":
      return { title: "Roadmap generated", detail: `${event.targetCareer} · readiness ${event.estimatedReadiness}%` }
    case "coachConversation":
      return { title: "Coach conversation", detail: `${event.userMessages} messages exchanged` }
    case "coverLetterGenerated":
      return { title: "Cover letter generated", detail: event.companyName.trim() ? `${event.companyName} · ${event.tone} tone` : `General application · ${event.tone} tone` }
  }
}

export function getRecentActivity(events: AnalyticsEvent[], limit = 8): AnalyticsEvent[] {
  return [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function formatEventTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

