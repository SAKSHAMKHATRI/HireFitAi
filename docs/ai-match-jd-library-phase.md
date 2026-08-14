# Phase — AI Match JD Library + Full Match Report Export

HireFit AI now ships a reusable **Job Description Library** for authenticated
users and a **Full Match Report DOCX export** for completed AI Match results.
Both reuse existing architecture — the saved-items subcollection and the
existing `/api/reports/export` DOCX pipeline — with no new collections, no
duplicate modules, and no Firestore rule changes.

---

## 1. Files changed

| File | Change |
| --- | --- |
| `src/lib/job-description-library.ts` | **New** — dependency-free types + pure helpers: `validateJobDescriptionInput`, `upsertJobDescription` (create/update), `removeJobDescription`, `sanitizeJobDescriptionList`, limits (50 items, 120-char title, 16,000-char JD). |
| `src/lib/job-description-library-store.ts` | **New** — owner-scoped Firestore CRUD (`fetchSavedJobDescriptions`, `saveJobDescription`, `deleteSavedJobDescription`) reusing `saveSavedRecord`/`fetchSavedRecord`. |
| `src/lib/firebase-firestore.ts` | Added `jobDescriptions: "job-descriptions"` to `savedRecordTypes`. |
| `src/lib/match-report.ts` | **New** — shared `normalizeMatchResult` + pure `buildMatchReportMarkdown` (omits/labels unavailable values, never fabricates). |
| `src/components/match/jd-library-panel.tsx` | **New** — JD Library UI: list, load, save/update, two-step delete, loading/empty/error states. Loading a JD only fills the textarea — never auto-runs AI Match. |
| `src/app/(dashboard)/analyzer/page.tsx` | Renders the JD Library panel in the AI Match section; adds **Export Report** (DOCX) button on the match result via the existing export route. |
| `src/app/(dashboard)/export-reports/page.tsx` | New **Full Match Report** card: loads the user's latest linked match from Firestore (owner-scoped), shows score/skills summary, exports DOCX or copies markdown. |
| `tests/job-description-library.test.ts` | **New** — 10 unit tests for validation, upsert, remove, caps. |
| `tests/match-report.test.ts` | **New** — 6 unit tests for normalization + markdown mapping (no fabrication). |
| `docs/ai-match-jd-library-phase.md` | This document. |

## 2. Firestore schema

No new collections and **no rule changes** — the JD Library lives inside the
existing owner-only saved-items subcollection:

```
users/{uid}/saved/job-descriptions   (single record per user/type)
{
  userId: uid,                // owner (rules-enforced)
  type: "job-descriptions",
  createdAt, updatedAt,
  data: [                     // the library
    { id, title, jobDescription, createdAt, updatedAt },
    ...
  ]
}
```

The existing `users/{userId}/{document=**}` rule (`allow read, write: if
request.auth != null && request.auth.uid == userId`) already restricts this
path to the owner, so users can only read/write/delete their own library.

Match reports are not stored separately — the export is generated from the
existing owner-scoped `analyses/{id}` record (type `jobMatched`) that is
already linked to its resume analysis via `analysisId`.

## 3. Security

- Owner-only access: JD library under `users/{uid}/saved/...` (existing rule);
  match records under `analyses` (owner create/read, admin delete, update
  denied). Client-side checks are never the boundary.
- The export route (`/api/reports/export`) is stateless markdown→DOCX; the
  markdown is built client-side only from the signed-in user's own loaded
  data, so one user's report can never reference another user's analysis.
- Gemini keys remain server-side; no secrets or Firebase internals reach the
  client; errors are friendly strings only.
- No production data is modified or deleted by this phase (writes are
  create/update of the user's own library entries only).

## 4. JD Library flow

```
Analyzer (after resume analysis) → "Saved Job Descriptions" panel
  Load  → fills the JD textarea (editing mode) — does NOT run AI Match
  Save  → validate → upsert into users/{uid}/saved/job-descriptions
  Update→ same entry id kept, updatedAt bumped
  Delete→ two-step confirm → removed from the list
Refresh/history → library reloads from Firestore (owner-scoped)
```

- Selecting a saved JD never auto-runs analysis; the user must press
  **Run AI Match**.
- Existing manual JD entry and the match↔analysis `analysisId` linkage are
  untouched.

## 5. Report export flow

```
Analyzer: match result shown → Export Report
  → buildMatchReportMarkdown(match, {candidateName, jobDescription, dates})
  → POST /api/reports/export {markdown, filename:"hirefit-match-report"}
  → server-side DOCX (existing docx pipeline) → download

/export-reports: latest linked match (fetchMyResumeAnalyses + fetchMyJobMatches
  + selectMatchRecordForAnalysis) → Full Match Report card → same DOCX route
  or copy markdown.
```

Report contents: candidate name (when available), match score, ATS
compatibility, matched/missing skills + keywords, strengths/weaknesses,
priority actions, recommendations, recommended projects, job description
(when available), generated date. **Empty sections are omitted and a missing
summary is labelled "Summary not available." — nothing is fabricated.**

## 6. Tests and validation

- `npm run typecheck` — PASS
- `npm run lint` — PASS (0 errors; 5 pre-existing warnings in untouched files)
- `npm test` — PASS, **45/45** (22 prior + 23 new: JD library 10, match
  report 6, analysis↔match selection 7)
- `npm run build` — PASS (37/37 routes)

## 7. Remaining limitations

- JD Library is a single document per user (array of up to 50 entries) —
  fine at this scale; a per-entry subcollection would be needed at very large
  counts.
- Match history on `/match` is grouped by the user's **latest** resume
  analysis (the page has no analysis picker). New matches are linked to that
  analysis via `analysisId`; matches run before this linkage existed fall
  back to the conservative timestamp rule.
- Browser automation is unavailable in this environment, so interactive
  browser QA was not executed (see checklist below).

## 8. Manual browser QA checklist

1. Sign in → open Resume Analyzer → upload + analyze a resume.
2. Paste a JD → save it to the library with a name.
3. Reload the page → library still lists it (persisted).
4. Load it → textarea fills; verify AI Match does **not** auto-run.
5. Edit the JD → Update saved → reload → changes persisted.
6. Delete a JD → two-step confirm removes it.
7. Run AI Match → click **Export Report** → DOCX downloads containing score,
   skills, strengths, recommendations, summary.
8. Open `/export-reports` → Full Match Report card shows the latest match →
   Download DOCX works; Copy works.
9. Open `/match`: the JD Library panel is present; load a saved JD → textarea
   fills without auto-matching; **Previous Match Reports** lists the latest
   analysis's matches with score/ATS/date; clicking one restores that exact
   report (no Gemini call, no new record) and its Export Report button
   re-exports it.
10. Sign out → `/analyzer`, `/match` and `/admin*` redirect to login;
    another account cannot see the first account's library or match records.
11. DevTools: zero console errors, zero hydration errors, no horizontal
    overflow at desktop/tablet/mobile widths.

---

## 9. Final phase — /match completion (per-analysis history + shared JD Library)

The standalone `/match` page now mirrors the analyzer's model:

- **Active analysis**: the user's latest restorable resume analysis
  (`fetchMyResumeAnalyses`), resolved with the same selection rules as the
  analyzer (`selectMatchRecordsForAnalysis` in `src/lib/match-selection.ts`).
- **Previous Match Reports**: a per-analysis list (explicit `analysisId`
  links; legacy timestamp fallback) showing JD snippet, match score, ATS
  compatibility, and created date. Clicking **View** restores that exact
  report with `normalizeMatchResult` — **no Gemini call, no new record**.
- **Re-export**: restored reports reuse the existing Export Report button +
  `/api/reports/export` DOCX pipeline (`buildMatchReportMarkdown`).
- **JD Library**: the shared `JdLibraryPanel` component is reused directly;
  loading a saved JD fills the textarea without auto-matching.
- **New matches**: saved with `analysisId` (linked to the active analysis),
  `jobDescription`, full `result`, and owner scoping via the existing
  `recordActivity` → `persistAnalysisEvent` path; history refreshes
  afterwards.

Files changed in this final phase:

| File | Change |
| --- | --- |
| `src/lib/match-selection.ts` | Added `selectMatchRecordsForAnalysis` (per-analysis history list). |
| `src/lib/match-report.ts` | Added shared `extractCandidateName` (used by /match + /export-reports). |
| `src/app/(dashboard)/match/page.tsx` | History restore, per-analysis Previous Match Reports, JD Library panel, Export Report, match→analysis linkage on save. |
| `src/app/(dashboard)/export-reports/page.tsx` | Uses the shared `extractCandidateName` (local copy removed). |
| `tests/match-selection.test.ts` | +7 tests for per-analysis history filtering (linkage, legacy fallback, empty states, exclusion of other analyses). |
