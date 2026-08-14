/**
 * Full Match Report — shared normalization + markdown building for the AI
 * Match report export.
 *
 * The report is built ONLY from a validated match result (the same payload
 * that was persisted to Firestore) plus optional context (candidate name,
 * job description, dates). Missing values are omitted or explicitly labelled —
 * nothing is fabricated. The DOCX conversion reuses the existing
 * `/api/reports/export` route (see `src/lib/docx.ts`).
 */

export type NormalizedMatch = {
  matchScore: number
  atsCompatibility: number
  matchedSkills: string[]
  missingSkills: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
  strengths: string[]
  weaknesses: string[]
  recruiterSummary: string
  improvementSuggestions: string[]
  recommendedProjects: string[]
  priorityActions: string[]
}

export type MatchReportContext = {
  /** Candidate name extracted from the analyzed resume (may be unknown). */
  candidateName?: string
  /** Title/name of the job (e.g. from the JD Library) if available. */
  jdTitle?: string
  /** The job description text used for the match, if available. */
  jobDescription?: string
  /** Timestamp of the resume analysis. */
  analysisDate?: number
  /** Timestamp of the match run. */
  matchDate?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0
}

function toStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

/**
 * Extracts the candidate name from a stored resume-analysis payload, when
 * present. Shared by the analyzer and the export pages so the candidate
 * name is never duplicated or invented.
 */
export function extractCandidateName(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const info = (raw as Record<string, unknown>).candidateInfo
  if (info && typeof info === "object") {
    const name = (info as Record<string, unknown>).name
    return typeof name === "string" && name.trim() ? name.trim() : undefined
  }
  return undefined
}

/**
 * Coerces a Firestore-restored match payload into the report view model.
 * Returns null when the payload is not a match report at all.
 */
export function normalizeMatchResult(raw: unknown): NormalizedMatch | null {
  if (!isRecord(raw) || typeof raw.matchScore !== "number") return null
  return {
    matchScore: toNumber(raw.matchScore),
    atsCompatibility: toNumber(raw.atsCompatibility),
    matchedSkills: toStrings(raw.matchedSkills),
    missingSkills: toStrings(raw.missingSkills),
    matchedKeywords: toStrings(raw.matchedKeywords),
    missingKeywords: toStrings(raw.missingKeywords),
    strengths: toStrings(raw.strengths),
    weaknesses: toStrings(raw.weaknesses),
    recruiterSummary: str(raw.recruiterSummary),
    improvementSuggestions: toStrings(raw.improvementSuggestions),
    recommendedProjects: toStrings(raw.recommendedProjects),
    priorityActions: toStrings(raw.priorityActions),
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function pushSection(lines: string[], title: string, items: string[]): void {
  if (items.length === 0) return
  lines.push(`## ${title}`)
  items.forEach((item) => lines.push(`- ${item}`))
  lines.push("")
}

/**
 * Builds the markdown for a full match report. Only present data is included;
 * empty sections are omitted, and an unavailable recruiter summary is labelled
 * rather than invented.
 */
export function buildMatchReportMarkdown(
  match: NormalizedMatch,
  context: MatchReportContext = {}
): string {
  const lines: string[] = []
  lines.push("# AI Match Report")
  lines.push(`Generated ${formatDate(Date.now())}`)
  lines.push("")

  if (str(context.candidateName)) lines.push(`**Candidate:** ${str(context.candidateName)}`)
  if (str(context.jdTitle)) lines.push(`**Job:** ${str(context.jdTitle)}`)
  if (context.analysisDate) lines.push(`**Resume analyzed:** ${formatDate(context.analysisDate)}`)
  if (context.matchDate) lines.push(`**Match date:** ${formatDate(context.matchDate)}`)
  lines.push("")

  lines.push("## Overall Match Score")
  lines.push(`**${match.matchScore}/100**`)
  if (typeof match.atsCompatibility === "number" && match.atsCompatibility > 0) {
    lines.push(`ATS compatibility: **${match.atsCompatibility}/100**`)
  }
  lines.push("")

  if (str(match.recruiterSummary)) {
    lines.push("## Summary")
    lines.push(match.recruiterSummary)
    lines.push("")
  } else {
    lines.push("## Summary")
    lines.push("Summary not available.")
    lines.push("")
  }

  pushSection(lines, "Matched Skills", match.matchedSkills)
  pushSection(lines, "Missing Skills", match.missingSkills)
  pushSection(lines, "Matched Keywords", match.matchedKeywords)
  pushSection(lines, "Missing Keywords", match.missingKeywords)
  pushSection(lines, "Strengths", match.strengths)
  pushSection(lines, "Weaknesses", match.weaknesses)
  pushSection(lines, "Priority Actions", match.priorityActions)
  pushSection(lines, "Recommendations", match.improvementSuggestions)
  pushSection(lines, "Recommended Projects", match.recommendedProjects)

  if (str(context.jobDescription)) {
    lines.push("## Job Description")
    lines.push(str(context.jobDescription))
    lines.push("")
  }

  return lines.join("\n")
}
