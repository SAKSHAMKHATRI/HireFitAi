import { test } from "node:test"
import assert from "node:assert/strict"
import {
  selectMatchRecordForAnalysis,
  selectMatchRecordsForAnalysis,
  type MatchSelectionRecord,
} from "../src/lib/match-selection"

function analysis(id: string, createdAt = 1000): MatchSelectionRecord {
  return { id, type: "resumeAnalyzed", createdAt }
}

function match(
  id: string,
  overrides: Partial<MatchSelectionRecord> = {}
): MatchSelectionRecord {
  return {
    id,
    type: "jobMatched",
    result: { matchScore: 80 },
    createdAt: 2000,
    ...overrides,
  }
}

test("explicit analysisId link selects the match computed against that analysis", () => {
  const record = analysis("analysis-1")
  const matches = [match("match-1", { analysisId: "analysis-1" })]
  const selected = selectMatchRecordForAnalysis(matches, record)
  assert.equal(selected?.id, "match-1")
})

test("explicit link beats an unrelated newer match (no cross-resume leakage)", () => {
  const record = analysis("analysis-1", 1000)
  const matches = [
    // Newer match from the standalone /match page (different resume, no link)
    match("unrelated", { analysisId: undefined, createdAt: 3000 }),
    // Older match explicitly linked to this analysis
    match("linked", { analysisId: "analysis-1", createdAt: 1500 }),
  ]
  const selected = selectMatchRecordForAnalysis(matches, record)
  assert.equal(selected?.id, "linked")
})

test("legacy match without a link is selected when created at/after the analysis", () => {
  const record = analysis("analysis-1", 1000)
  const matches = [match("legacy", { analysisId: undefined, createdAt: 1500 })]
  const selected = selectMatchRecordForAnalysis(matches, record)
  assert.equal(selected?.id, "legacy")
})

test("legacy match older than the analysis is never shown next to it", () => {
  const record = analysis("analysis-1", 2000)
  const matches = [match("older", { analysisId: undefined, createdAt: 1500 })]
  assert.equal(selectMatchRecordForAnalysis(matches, record), null)
})

test("returns null when there are no match records", () => {
  assert.equal(selectMatchRecordForAnalysis([], analysis("analysis-1")), null)
})

test("returns null when there is no analysis record", () => {
  assert.equal(selectMatchRecordForAnalysis([match("match-1")], null), null)
  assert.equal(selectMatchRecordForAnalysis([match("match-1")], undefined), null)
})

test("records without a result payload are never selected", () => {
  const record = analysis("analysis-1")
  const matches = [
    match("linked-no-result", { analysisId: "analysis-1", result: undefined }),
    match("legacy-no-result", { analysisId: undefined, result: undefined }),
  ]
  assert.equal(selectMatchRecordForAnalysis(matches, record), null)
})

test("non-jobMatched records are ignored even when linked", () => {
  const record = analysis("analysis-1")
  const matches = [
    { id: "other", type: "resumeAnalyzed", analysisId: "analysis-1", result: { atsScore: 70 }, createdAt: 3000 },
  ]
  assert.equal(selectMatchRecordForAnalysis(matches, record), null)
})

test("legacy fallback picks the newest qualifying match (matches passed newest-first)", () => {
  const record = analysis("analysis-1", 1000)
  const matches = [
    match("newest", { analysisId: undefined, createdAt: 3000 }),
    match("middle", { analysisId: undefined, createdAt: 2500 }),
    match("oldest", { analysisId: undefined, createdAt: 1500 }),
  ]
  const selected = selectMatchRecordForAnalysis(matches, record)
  assert.equal(selected?.id, "newest")
})

/* ------------------------------------------------------------------ */
/* selectMatchRecordsForAnalysis — per-analysis history list           */
/* ------------------------------------------------------------------ */

test("history list returns every record explicitly linked to the analysis", () => {
  const record = analysis("analysis-1")
  const matches = [
    match("m2", { analysisId: "analysis-1", createdAt: 3000 }),
    match("m1", { analysisId: "analysis-1", createdAt: 2000 }),
  ]
  const selected = selectMatchRecordsForAnalysis(matches, record)
  assert.deepEqual(selected.map((m) => m.id), ["m2", "m1"])
})

test("history list excludes records linked to other analyses", () => {
  const record = analysis("analysis-1")
  const matches = [
    match("mine", { analysisId: "analysis-1", createdAt: 2000 }),
    match("other-analysis", { analysisId: "analysis-9", createdAt: 5000 }),
  ]
  const selected = selectMatchRecordsForAnalysis(matches, record)
  assert.deepEqual(selected.map((m) => m.id), ["mine"])
})

test("when explicit links exist, unrelated legacy records are excluded", () => {
  const record = analysis("analysis-1", 1000)
  const matches = [
    // Newer but unlinked (e.g. computed against a different resume)
    match("legacy-unlinked", { analysisId: undefined, createdAt: 9000 }),
    match("linked", { analysisId: "analysis-1", createdAt: 2000 }),
  ]
  const selected = selectMatchRecordsForAnalysis(matches, record)
  assert.deepEqual(selected.map((m) => m.id), ["linked"])
})

test("history list falls back to legacy records created at/after the analysis", () => {
  const record = analysis("analysis-1", 1000)
  const matches = [
    match("legacy-new", { analysisId: undefined, createdAt: 3000 }),
    match("legacy-old", { analysisId: undefined, createdAt: 500 }),
  ]
  const selected = selectMatchRecordsForAnalysis(matches, record)
  assert.deepEqual(selected.map((m) => m.id), ["legacy-new"])
})

test("history list is empty when there is no analysis (no selected analysis state)", () => {
  assert.deepEqual(selectMatchRecordsForAnalysis([match("m1")], null), [])
  assert.deepEqual(selectMatchRecordsForAnalysis([match("m1")], undefined), [])
})

test("history list is empty when no matches exist", () => {
  assert.deepEqual(selectMatchRecordsForAnalysis([], analysis("analysis-1")), [])
})

test("history list ignores records without a result payload", () => {
  const record = analysis("analysis-1")
  const matches = [
    match("no-result", { analysisId: "analysis-1", result: undefined }),
    match("other-type", { type: "resumeAnalyzed", analysisId: "analysis-1", result: { atsScore: 70 }, createdAt: 3000 }),
  ]
  assert.deepEqual(selectMatchRecordsForAnalysis(matches, record), [])
})
