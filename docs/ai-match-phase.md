# Phase 7 — AI Match Integration with Resume Analyzer

HireFit AI's Resume Analyzer now runs a full AI Match against a real job
description using the actual analyzed resume, persists the result per-user,
and restores it across refresh, navigation, and history. This document covers
the objective, the implementation that was discovered (and reused), the data
flow, and how to verify everything.

---

## 1. Phase objective

Connect the existing AI Match module to the real Resume Analyzer workflow:

```
User uploads resume → resume analyzed → user enters Job Description
→ AI Match (Gemini) → structured result → saved to Firestore
→ displayed → persisted across refresh / history
```

Constraints honored:

- No mock/fabricated scores — every number comes from Gemini over the real
  resume PDF + real job description.
- No duplicate architecture — the existing `matchResumeToJob` flow, the
  `analyses` Firestore collection, the analyzer page, and the design system
  components were all reused.
- Auth, Forgot/Reset Password, and Admin functionality were not touched.

---

## 2. Existing implementation discovered

Before this phase, the project already contained:

- `src/ai/flows/analyze-resume-flow.ts` — server-only (`'use server'`) Gemini
  flow; Zod-validated `AnalyzeResumeOutput` (atsScore, keywordCoverage,
  candidateInfo, sectionScores, education, experience, projects,
  certifications, achievements, technical/soft skills, strengths, weaknesses,
  improvement suggestions).
- `src/ai/flows/match-resume-to-job-flow.ts` — server-only Gemini flow with
  Zod-validated `MatchResumeToJobOutput` (matchScore, atsCompatibility,
  matchedSkills, missingSkills, matchedKeywords, missingKeywords, strengths,
  weaknesses, recruiterSummary, improvementSuggestions, recommendedProjects,
  priorityActions).
- `src/ai/genkit.ts` — single Genkit instance (`googleai/gemini-2.5-flash`);
  API key resolved server-side from env (`GEMINI_API_KEY`).
- `src/app/(dashboard)/analyzer/page.tsx` — upload → analyze → render, with an
  AI Match section (job description textarea, match results) already partially
  wired.
- `src/app/(dashboard)/match/page.tsx` — standalone match module.
- `src/lib/analytics.ts` / `src/lib/firebase-analytics.ts` —
  `recordActivity` → `persistAnalysisEvent` mirror into Firestore `analyses`.
- `src/lib/firebase-firestore.ts` — `fetchMyResumeAnalyses`,
  `fetchMyJobMatches`, `AnalysisRecord`, owner-scoped reads.
- `firestore.rules` — `analyses` create-by-owner / read-by-owner-or-admin /
  delete-by-admin / **update denied**.

## 3. Files changed (this phase)

| File | Change |
| --- | --- |
| `src/lib/match-selection.ts` | **New** — pure helper `selectMatchRecordForAnalysis`: resolves which saved match record belongs to an analysis (explicit `analysisId` link first, conservative legacy timestamp fallback). |
| `tests/match-selection.test.ts` | **New** — 9 unit tests for the selection helper. |
| `src/lib/firebase-analytics.ts` | `persistAnalysisEvent` now returns the created record id; `AnalysisMeta` gains `analysisId` + `jobDescription`, both persisted. |
| `src/lib/analytics.ts` | `recordActivity` returns the mirrored record id (`Promise<string \| null> \| undefined`), never rejects — backward compatible with all existing callers. |
| `src/lib/firebase-firestore.ts` | `AnalysisRecord` gains optional `analysisId` / `jobDescription`. |
| `src/app/(dashboard)/analyzer/page.tsx` | Match↔analysis linkage on save + restore; job description persisted and restored; historical analyses restore their own linked match; "Not analyzed" badge for analyses without match data; JD textarea labeled. |

## 4. AI Match data flow

```
Upload PDF → fileToDataUri → analyzeResume (server, Gemini)
  → normalized analysis rendered
  → recordActivity("resumeAnalyzed", {result}) → Firestore analyses/{id}  (id captured)
Paste JD → runMatch → matchResumeToJob({ resumeDataUri, jobDescription }) (server, Gemini)
  → normalized match rendered (score, matched/missing skills, keywords,
    strengths, weaknesses, recruiter summary, recommendations, projects)
  → recordActivity("jobMatched", {result, analysisId: <analysis id>, jobDescription})
    → Firestore analyses/{id2}  (explicitly linked to the analysis)
Refresh / history open → fetchMyResumeAnalyses + fetchMyJobMatches
  → selectMatchRecordForAnalysis(matchRecords, analysis)
  → restore match result + job description
```

The match always uses the **actual analyzed resume** — the same PDF data URI
is passed to Gemini, and the result is validated by the Zod output schema
before it is rendered or persisted.

## 5. AI response structure

`MatchResumeToJobOutput` (Zod-validated on the server; every field present or
the flow throws):

| Field | Type | Notes |
| --- | --- | --- |
| `matchScore` | number 0–100 | Overall resume→job match score |
| `atsCompatibility` | number 0–100 | ATS alignment for this JD |
| `matchedSkills` | string[] | Skills in both resume and JD |
| `missingSkills` | string[] | JD skills absent from resume |
| `matchedKeywords` / `missingKeywords` | string[] | Keyword-level alignment |
| `strengths` / `weaknesses` | string[] | Evidence-backed positives/gaps |
| `recruiterSummary` | string | Concise compatibility summary |
| `improvementSuggestions` | string[] | Actionable resume improvements |
| `recommendedProjects` | string[] | Projects that demonstrate gaps |
| `priorityActions` | string[] | Highest-impact next actions |

Malformed responses are handled gracefully: `normalizeMatch` returns null and
the UI shows "Gemini returned an unreadable match report. Please try again."
Invalid data is never rendered or saved.

## 6. Firestore structure

Records live in the existing `analyses` collection (per-user activity):

```
analyses/{id} {
  userId, userName, userEmail,   // owner identity (rules-enforced)
  type: "resumeAnalyzed" | "jobMatched",
  fileName,
  createdAt,
  result,                        // full validated AI output
  analysisId,                    // jobMatched only: source resume analysis id
  jobDescription,                // jobMatched only: JD used for the match
  matchScore, atsCompatibility, matchedSkills, missingSkills, ...  // flat admin fields
  skills,                        // deduped skill list for admin UI
}
```

- Matches are **linked** to their analysis via `analysisId`; legacy records
  without a link fall back to a conservative timestamp rule.
- Writes are **create-only** (`addDoc`); nothing is overwritten, updated, or
  deleted by the client. Existing analysis documents without match data keep
  working and are shown as **"Not analyzed"**.
- No rules or index changes were required: `analyses` rules already cover
  owner-scoped create/read, and the only query is a single-field equality on
  `userId` (auto-indexed).

## 7. Authentication / authorization

- The Analyzer (and everything under `/dashboard`) is wrapped in
  `ProtectedRoute` — signed-out users are redirected to `/login`.
- Firestore enforces ownership server-side: `create` requires
  `request.resource.data.userId == request.auth.uid`; `read` requires
  `resource.data.userId == request.auth.uid || isAdmin()`. Client-side checks
  are never the security boundary.
- Gemini API key stays server-side (env `GEMINI_API_KEY`); only the PDF data
  URI and JD text cross the client/server boundary.

## 8. Security considerations

- No secrets in client code; no stack traces or Firebase internals surfaced
  to users (`friendlyErrorMessage` returns message text only).
- Resume/JD content is persisted only in the owner's own records; no
  unnecessary logging.
- `firestore.rules` unchanged — existing rules already satisfy this phase.
  If the **deployed** rules are older than the repo rules, deploy them:

  ```bash
  npx firebase deploy --only firestore:rules
  ```

  (Required because the `analyses` collection used by AI Match is fully denied
  unless the owner-scoped rules are live. This phase makes **no** rules
  changes.)

## 9. Tests performed

- `npm run typecheck` — PASS
- `npm run lint` — PASS (0 errors; 5 pre-existing warnings in untouched files)
- `npm test` — PASS, 22/22 (13 existing + 9 new match-selection tests)
- `npm run build` — PASS (all 37 routes)

## 10. Live Gemini verification

A temporary script exercised the **real** flows against live Gemini with a
generated PDF resume and a realistic job description:

- `analyzeResume` → PASS (ATS 20 on the sparse test PDF, name/skills/experience
  extracted correctly — the low score is honest, not fabricated).
- `matchResumeToJob` → PASS (matchScore 85–88, matchedSkills 6, missingSkills 2,
  full structured report).

The script was removed after verification; no test data was written to
Firestore.

## 11. Browser QA

Performed in code review + build/tests only — this environment has no browser
automation, so interactive browser QA was **not executed**. Manual steps for
final live verification:

1. Sign in → open Resume Analyzer.
2. Upload a real resume → run analysis → confirm results.
3. Paste a realistic Job Description → Run AI Match.
4. Confirm Match Score, Matched Skills, Missing Skills, Strengths,
   Recommendations, Summary.
5. Refresh the page → result and JD are restored.
6. Navigate away and back → result persists.
7. Open an older analysis from history → its own match (if any) restores;
   analyses without match data show **"Not analyzed"**.
8. Sign out → `/analyzer` and `/admin*` redirect to login; sign back in →
   own analysis accessible.
9. DevTools: zero console errors, zero hydration errors, no horizontal
   overflow at desktop/tablet/mobile widths.

## 12. Known limitations

- Legacy match records (created before the `analysisId` link existed) are
  associated by timestamp; a pre-linkage match from the standalone `/match`
  page could still appear next to the newest analysis if newer. New records
  are exact.
- Live browser QA could not be executed in this environment (no browser
  automation); see section 11.
- Job descriptions are capped at 16,000 characters (pre-existing, intentional).

## 13. Next recommended phase

**AI Match "Job Description library" + export.** Reuse the existing
`users/{uid}/saved/{type}` subcollection to let users save frequently used job
descriptions and pick them from the analyzer; add a "view full match report"
export using the existing DOCX export infrastructure under `/export-reports`.
This builds directly on the match↔analysis linkage added here, without new
architecture.
