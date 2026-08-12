/**
 * Firestore mirror of the local analytics store (Phase 5).
 *
 * Every time a module records an analytics event locally (see
 * `recordActivity` in `src/lib/analytics.ts`), a normalized record is also
 * written to the `analyses` collection so admins can see real module
 * activity across all users. Writes are fire-and-forget and never fatal:
 * if the write fails (offline, rules, etc.) the local analytics still work.
 *
 * Security: the owning user is always derived from `auth.currentUser`, and
 * `firestore.rules` rejects any create whose `userId` does not match the
 * caller — records cannot be forged for other users.
 */

import { addDoc, collection } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import type { AnalyticsEvent } from "@/lib/analytics"

export type AnalysisMeta = {
  /** Uploaded resume filename (available for resume analyses). */
  fileName?: string
  /**
   * Optional full module result (e.g. the structured resume analysis) so a
   * user's history can be restored later. Callers should strip sensitive
   * contact details they do not want persisted before passing it here.
   */
  result?: unknown
}

/** Normalizes any analytics event into a flat, admin-friendly record. */
function toAnalysisPayload(event: AnalyticsEvent): Record<string, unknown> {
  const skills: string[] = []
  const payload: Record<string, unknown> = {}

  switch (event.type) {
    case "resumeAnalyzed":
      payload.atsScore = event.atsScore
      if (event.keywordCoverage !== undefined) payload.keywordCoverage = event.keywordCoverage
      if (event.sectionScores) payload.sectionScores = event.sectionScores
      if (event.achievements && event.achievements.length > 0) payload.achievements = event.achievements
      if (event.candidateName) payload.candidateName = event.candidateName
      skills.push(...event.technicalSkills, ...event.softSkills, ...event.missingSkills)
      break
    case "jobMatched":
      payload.matchScore = event.matchScore
      payload.atsCompatibility = event.atsCompatibility
      skills.push(...event.matchedSkills, ...event.missingSkills, ...event.matchedKeywords, ...event.missingKeywords)
      break
    case "hireEvaluated":
      payload.matchScore = event.matchScore
      break
    case "recruiterSimulated":
      payload.shortlistProbability = event.shortlistProbability
      break
    case "bulletsOptimized":
      payload.optimizedCount = event.optimizedCount
      skills.push(...event.optimizedBullets)
      break
    case "interviewCompleted":
      payload.overallScore = event.overallScore
      payload.communication = event.communication
      payload.technicalAccuracy = event.technicalAccuracy
      payload.problemSolving = event.problemSolving
      payload.confidence = event.confidence
      payload.hiringRecommendation = event.hiringRecommendation
      skills.push(...event.recommendedTopics)
      break
    case "roadmapGenerated":
      payload.estimatedReadiness = event.estimatedReadiness
      payload.targetCareer = event.targetCareer
      skills.push(...event.skillGap.map((item) => item.skill))
      break
    case "coachConversation":
      payload.userMessages = event.userMessages
      break
    case "coverLetterGenerated":
      payload.tone = event.tone
      payload.companyName = event.companyName
      break
  }

  if (skills.length > 0) {
    payload.skills = Array.from(new Set(skills)).slice(0, 60)
  }
  return payload
}

/**
 * Persists an analytics event to the `analyses` collection for the current
 * user. Resolves silently when there is no signed-in user; rejects when the
 * Firestore write itself fails (callers should treat rejection as non-fatal).
 */
export async function persistAnalysisEvent(
  event: AnalyticsEvent,
  meta?: AnalysisMeta
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser) return

  const fallbackName =
    (currentUser.email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim() || "HireFit User"

  await addDoc(collection(db, "analyses"), {
    userId: currentUser.uid,
    userName: currentUser.displayName?.trim() || fallbackName,
    userEmail: currentUser.email ?? "",
    type: event.type,
    fileName: meta?.fileName ?? null,
    createdAt: event.timestamp,
    ...(meta?.result !== undefined ? { result: meta.result } : {}),
    ...toAnalysisPayload(event),
  })
}
