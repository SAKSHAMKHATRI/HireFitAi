/**
 * Job Description Library — pure, dependency-free helpers.
 *
 * The actual Firestore read/write lives in `job-description-library-store.ts`
 * (owner-scoped via the existing saved-items architecture). Keeping the pure
 * logic here makes it unit-testable without pulling in the Firebase SDK.
 */

export type SavedJobDescription = {
  /** Stable client-generated id (used to update/delete this entry). */
  id: string
  /** Human-friendly name for the saved job description. */
  title: string
  /** Full job description text. */
  jobDescription: string
  createdAt: number
  updatedAt: number
}

/** Input accepted when creating or updating a saved job description. */
export type SavedJobDescriptionInput = {
  /** Omit to create a new entry; provide to update an existing one. */
  id?: string
  title: string
  jobDescription: string
}

export const savedJobDescriptionLimits = {
  /** Cap on the number of saved job descriptions per user. */
  maxItems: 50,
  maxTitleLength: 120,
  maxJobDescriptionLength: 16000,
} as const

export type SaveJobDescriptionResult =
  | { ok: true; item: SavedJobDescription; list: SavedJobDescription[] }
  | { ok: false; error: string }

/** Trims + validates a save input. Returns the error or the clean input. */
export function validateJobDescriptionInput(input: SavedJobDescriptionInput):
  | { ok: true; title: string; jobDescription: string }
  | { ok: false; error: string } {
  const title = input.title.trim()
  const jobDescription = input.jobDescription.trim()

  if (!title) return { ok: false, error: "Give this job description a name." }
  if (title.length > savedJobDescriptionLimits.maxTitleLength) {
    return { ok: false, error: "Title must be 120 characters or fewer." }
  }
  if (!jobDescription) {
    return { ok: false, error: "Paste a job description before saving it." }
  }
  if (jobDescription.length > savedJobDescriptionLimits.maxJobDescriptionLength) {
    return { ok: false, error: "Job description is too large to save (16,000 character limit)." }
  }
  return { ok: true, title, jobDescription }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `jd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Creates or updates an entry in the list and returns the new list. Pure —
 * does not touch Firestore. Keeps entries sorted newest-first by updatedAt.
 */
export function upsertJobDescription(
  list: SavedJobDescription[],
  input: SavedJobDescriptionInput
): SaveJobDescriptionResult {
  const validated = validateJobDescriptionInput(input)
  if (!validated.ok) return validated

  const now = Date.now()
  if (input.id) {
    const existing = list.find((item) => item.id === input.id)
    if (!existing) {
      return { ok: false, error: "This saved job description no longer exists." }
    }
    const updated: SavedJobDescription = {
      ...existing,
      title: validated.title,
      jobDescription: validated.jobDescription,
      updatedAt: now,
    }
    const next = list
      .map((item) => (item.id === input.id ? updated : item))
      .sort((a, b) => b.updatedAt - a.updatedAt)
    return { ok: true, item: updated, list: next }
  }

  const item: SavedJobDescription = {
    id: newId(),
    title: validated.title,
    jobDescription: validated.jobDescription,
    createdAt: now,
    updatedAt: now,
  }
  const next = [item, ...list].slice(0, savedJobDescriptionLimits.maxItems)
  return { ok: true, item, list: next }
}

/** Removes an entry by id. Pure — returns the new list (unchanged when missing). */
export function removeJobDescription(
  list: SavedJobDescription[],
  id: string
): SavedJobDescription[] {
  return list.filter((item) => item.id !== id)
}

/** Sanitizes an unknown stored payload into a clean, deduped list. */
export function sanitizeJobDescriptionList(raw: unknown): SavedJobDescription[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      title: typeof item.title === "string" ? item.title.trim() : "",
      jobDescription:
        typeof item.jobDescription === "string" ? item.jobDescription.trim() : "",
      createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
      updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : 0,
    }))
    .filter((item) => item.id && item.title && item.jobDescription)
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
