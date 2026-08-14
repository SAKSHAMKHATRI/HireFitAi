/**
 * Job Description Library — Firestore store (owner-scoped).
 *
 * Storage reuses the existing saved-items architecture: a single record per
 * type at `users/{uid}/saved/job-descriptions` (see `saveSavedRecord` /
 * `fetchSavedRecord` in `src/lib/firebase-firestore.ts`). The record's `data`
 * field holds the array of saved job descriptions. Ownership is enforced by
 * the existing `users/{userId}/{document=**}` Firestore rule (owner-only), so
 * no rules changes are needed and no parallel collection is created.
 *
 * Pure helpers (validation/upsert/remove) live in
 * `job-description-library.ts` so they can be unit-tested without Firebase.
 */

import {
  fetchSavedRecord,
  saveSavedRecord,
  savedRecordTypes,
} from "@/lib/firebase-firestore"
import {
  removeJobDescription,
  sanitizeJobDescriptionList,
  upsertJobDescription,
  type SavedJobDescription,
  type SavedJobDescriptionInput,
} from "@/lib/job-description-library"

/** Loads the signed-in user's saved job descriptions ([] when none/corrupt). */
export async function fetchSavedJobDescriptions(): Promise<SavedJobDescription[]> {
  const record = await fetchSavedRecord<unknown>(savedRecordTypes.jobDescriptions)
  return sanitizeJobDescriptionList(record?.data)
}

/**
 * Saves (creates or updates) a job description for the signed-in user.
 * Throws when validation fails or Firestore rejects the write (callers
 * surface a friendly error).
 */
export async function saveJobDescription(
  input: SavedJobDescriptionInput
): Promise<SavedJobDescription[]> {
  const current = await fetchSavedJobDescriptions()
  const result = upsertJobDescription(current, input)
  if (!result.ok) throw new Error(result.error)
  await saveSavedRecord(savedRecordTypes.jobDescriptions, result.list)
  return result.list
}

/** Deletes a saved job description for the signed-in user. */
export async function deleteSavedJobDescription(id: string): Promise<SavedJobDescription[]> {
  const current = await fetchSavedJobDescriptions()
  const next = removeJobDescription(current, id)
  await saveSavedRecord(savedRecordTypes.jobDescriptions, next)
  return next
}
