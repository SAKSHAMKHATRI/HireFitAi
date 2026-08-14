/**
 * Match ↔ analysis selection (Resume Analyzer → AI Match linkage).
 *
 * AI Match results are persisted as their own `analyses` records of type
 * `jobMatched` (the same collection holds resume analyses of type
 * `resumeAnalyzed`). Newer match records carry an explicit `analysisId`
 * field pointing back to the resume analysis they were computed against.
 * This module resolves which match record belongs to a given analysis and
 * is intentionally pure and dependency-free so it can be unit-tested.
 */

/** Structural subset of an analysis record used for match selection. */
export type MatchSelectionRecord = {
  id: string
  type?: string
  /** Id of the source resume analysis record this match was computed against. */
  analysisId?: string
  /** Full module result payload (the match report for `jobMatched` records). */
  result?: unknown
  /** Job description used for the match, restored alongside the result. */
  jobDescription?: string
  createdAt?: number
}

/**
 * Resolves which saved AI Match record belongs to the given resume analysis.
 *
 * Preference order:
 * 1. An explicit `analysisId` link (written by this phase) pointing at the
 *    analysis record.
 * 2. Legacy fallback for older records that predate the link: only a match
 *    created at/after the analysis could have been computed against this
 *    resume. A match older than the analysis was computed against an earlier
 *    resume and must never be displayed next to it.
 *
 * Returns null when no match belongs to the analysis (or when the analysis
 * itself is missing).
 */
export function selectMatchRecordForAnalysis(
  matchRecords: MatchSelectionRecord[],
  analysisRecord: MatchSelectionRecord | null | undefined
): MatchSelectionRecord | null {
  if (!analysisRecord) return null

  const explicitlyLinked = matchRecords.find(
    (record) =>
      record.type === "jobMatched" &&
      record.analysisId === analysisRecord.id &&
      record.result !== undefined
  )
  if (explicitlyLinked) return explicitlyLinked

  // Legacy records have no analysisId. The conservative rule: only show a
  // match created at/after this analysis. (matches newest-first ordering is
  // preserved by callers, so `find` picks the newest qualifying record)
  const analysisTs = analysisRecord.createdAt ?? 0
  return (
    matchRecords.find(
      (record) =>
        record.type === "jobMatched" &&
        record.result !== undefined &&
        (record.createdAt ?? 0) >= analysisTs
    ) ?? null
  )
}

/**
 * Resolves ALL saved AI Match records belonging to the given resume analysis
 * (newest-first ordering preserved from the caller). Uses the same rules as
 * `selectMatchRecordForAnalysis` but returns every qualifying record — used
 * for the per-analysis "Previous Match Reports" list on the AI Match page.
 *
 * When the analysis has any explicitly linked records, only those are
 * returned (unlinked/legacy records are excluded to avoid mixing matches
 * computed against other resumes). Otherwise every record created at/after
 * the analysis qualifies. Returns [] when there is no analysis.
 */
export function selectMatchRecordsForAnalysis(
  matchRecords: MatchSelectionRecord[],
  analysisRecord: MatchSelectionRecord | null | undefined
): MatchSelectionRecord[] {
  if (!analysisRecord) return []

  const linked = matchRecords.filter(
    (record) =>
      record.type === "jobMatched" &&
      record.analysisId === analysisRecord.id &&
      record.result !== undefined
  )
  if (linked.length > 0) return linked

  const analysisTs = analysisRecord.createdAt ?? 0
  return matchRecords.filter(
    (record) =>
      record.type === "jobMatched" &&
      record.result !== undefined &&
      (record.createdAt ?? 0) >= analysisTs
  )
}
