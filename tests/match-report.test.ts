import { test } from "node:test"
import assert from "node:assert/strict"
import {
  buildMatchReportMarkdown,
  normalizeMatchResult,
  type NormalizedMatch,
} from "../src/lib/match-report"

const fullMatch: NormalizedMatch = {
  matchScore: 85,
  atsCompatibility: 90,
  matchedSkills: ["TypeScript", "React"],
  missingSkills: ["Kubernetes"],
  matchedKeywords: ["microservices"],
  missingKeywords: ["GraphQL"],
  strengths: ["Strong TypeScript depth"],
  weaknesses: ["No Kubernetes exposure"],
  recruiterSummary: "A strong candidate for the role.",
  improvementSuggestions: ["Add Kubernetes projects"],
  recommendedProjects: ["Build a K8s demo"],
  priorityActions: ["Learn Kubernetes"],
}

test("normalizeMatchResult returns null for a non-match payload", () => {
  assert.equal(normalizeMatchResult(null), null)
  assert.equal(normalizeMatchResult({ atsScore: 80 }), null)
  assert.equal(normalizeMatchResult("nope"), null)
})

test("normalizeMatchResult clamps and sanitizes fields", () => {
  const result = normalizeMatchResult({
    matchScore: 150,
    atsCompatibility: -5,
    matchedSkills: [" React ", 42, "TypeScript"],
    missingSkills: "not-an-array",
    recruiterSummary: "  summary  ",
  })
  assert.ok(result)
  assert.equal(result.matchScore, 100)
  assert.equal(result.atsCompatibility, 0)
  assert.deepEqual(result.matchedSkills, ["React", "TypeScript"])
  assert.deepEqual(result.missingSkills, [])
  assert.equal(result.recruiterSummary, "summary")
})

test("markdown includes candidate, scores, and generated date", () => {
  const markdown = buildMatchReportMarkdown(fullMatch, {
    candidateName: "Jane Doe",
    jdTitle: "Senior Software Engineer",
    analysisDate: new Date("2026-01-01").getTime(),
    matchDate: new Date("2026-01-02").getTime(),
  })
  assert.match(markdown, /# AI Match Report/)
  assert.match(markdown, /Generated \w/)
  assert.match(markdown, /Jane Doe/)
  assert.match(markdown, /Senior Software Engineer/)
  assert.match(markdown, /\*\*85\/100\*\*/)
  assert.match(markdown, /ATS compatibility: \*\*90\/100\*\*/)
  assert.match(markdown, /## Matched Skills/)
  assert.match(markdown, /- TypeScript/)
  assert.match(markdown, /## Missing Skills/)
  assert.match(markdown, /- Kubernetes/)
})

test("markdown omits empty sections — no fabricated values", () => {
  const minimal: NormalizedMatch = {
    ...fullMatch,
    matchedSkills: [],
    missingSkills: [],
    matchedKeywords: [],
    missingKeywords: [],
    strengths: [],
    weaknesses: [],
    recruiterSummary: "",
    improvementSuggestions: [],
    recommendedProjects: [],
    priorityActions: [],
  }
  const markdown = buildMatchReportMarkdown(minimal, {})
  assert.ok(!markdown.includes("## Matched Skills"))
  assert.ok(!markdown.includes("## Missing Skills"))
  assert.ok(!markdown.includes("## Strengths"))
  assert.ok(!markdown.includes("## Job Description"))
  assert.ok(!markdown.includes("Jane Doe"))
  // The required summary is labelled, not invented.
  assert.match(markdown, /Summary not available/)
})

test("markdown includes the job description when provided", () => {
  const markdown = buildMatchReportMarkdown(fullMatch, { jobDescription: "We need TypeScript experts." })
  assert.match(markdown, /## Job Description/)
  assert.match(markdown, /We need TypeScript experts/)
})

test("markdown lists every present section with bullets", () => {
  const markdown = buildMatchReportMarkdown(fullMatch, {})
  assert.match(markdown, /## Strengths\n- Strong TypeScript depth/)
  assert.match(markdown, /## Weaknesses\n- No Kubernetes exposure/)
  assert.match(markdown, /## Priority Actions\n- Learn Kubernetes/)
  assert.match(markdown, /## Recommendations\n- Add Kubernetes projects/)
  assert.match(markdown, /## Recommended Projects\n- Build a K8s demo/)
})
