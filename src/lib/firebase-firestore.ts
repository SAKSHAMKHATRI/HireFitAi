/**
 * Firestore persistence service (Phase 2).
 *
 * Uses the single `db` instance from `src/lib/firebase.ts` — Firestore is
 * initialized exactly once there. All reads/writes are scoped to the caller's
 * Firebase Auth `uid`; callers must pass `auth.currentUser.uid` (never a
 * client-supplied arbitrary uid).
 *
 * Data model:
 *   users/{uid}                        -> profile document (ProfileData)
 *   users/{uid}/settings/preferences   -> preferences document (HireFitSettings)
 *   users/{uid}/saved/{type}           -> saved module work/history (Phase 4)
 *
 * The client only ever reads/writes these exact paths, which is what the
 * Firestore security rules in `firestore.rules` enforce. Saved records are
 * owned by the authenticated UID: the `saved` subcollection falls under the
 * existing owner-only `users/{userId}/{document=**}` rule.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import {
  defaultProfile,
  defaultSettings,
  hasLocalProfile,
  hasLocalSettings,
  hydrateProfile,
  hydrateSettings,
  loadProfile,
  loadSettings,
  type HireFitSettings,
  type ProfileData,
} from "@/lib/settings"

function profileRef(uid: string) {
  return doc(db, "users", uid)
}

function settingsRef(uid: string) {
  return doc(db, "users", uid, "settings", "preferences")
}

/* -- Profile ----------------------------------------------------------- */

export async function fetchProfileFromFirestore(uid: string): Promise<ProfileData | null> {
  const snapshot = await getDoc(profileRef(uid))
  if (!snapshot.exists()) return null
  return { ...defaultProfile, ...(snapshot.data() as Partial<ProfileData>) }
}

export async function writeProfileToFirestore(uid: string, profile: ProfileData): Promise<void> {
  await setDoc(profileRef(uid), profile, { merge: true })
}

/* -- Settings ----------------------------------------------------------- */

export async function fetchSettingsFromFirestore(uid: string): Promise<HireFitSettings | null> {
  const snapshot = await getDoc(settingsRef(uid))
  if (!snapshot.exists()) return null
  return { ...defaultSettings, ...(snapshot.data() as Partial<HireFitSettings>) }
}

export async function writeSettingsToFirestore(
  uid: string,
  settings: HireFitSettings
): Promise<void> {
  await setDoc(settingsRef(uid), settings, { merge: true })
}

/* -- Roles (Phase 5) ---------------------------------------------------------
 * Authoritative role documents live in `roles/{uid}` with `role` set to
 * "user" or "admin". A missing role document always means "user". Users can
 * never write to the roles collection — only admins can (enforced both here
 * and in `firestore.rules`), so normal users cannot escalate their own role.
 * ------------------------------------------------------------------------ */

export type UserRole = "user" | "admin"

/**
 * Reads the caller's own role. Missing document or a read/network failure
 * resolves to "user" — the safe default — so a stale or denied read can
 * never grant admin access.
 */
export async function fetchUserRole(uid: string): Promise<UserRole> {
  const roleRef = doc(db, "roles", uid)
  try {
    const snapshot = await getDoc(roleRef)
    return snapshot.exists() && snapshot.data()?.role === "admin" ? "admin" : "user"
  } catch {
    return "user"
  }
}

/* -- Account records (Phase 5) ---------------------------------------------
 * `users/{uid}` doubles as the account record so admins can list real
 * users. Created lazily on sign-in/sign-up; role lives in `roles/{uid}`.
 * ------------------------------------------------------------------------ */

export type UserRecord = {
  uid: string
  name: string
  email: string
  avatar?: string
  createdAt?: number
  lastActiveAt?: number
  [key: string]: unknown
}

/**
 * Creates the account record on first sign-in (never overwrites createdAt)
 * and keeps the name/email/lastActive fields fresh. Idempotent and safe to
 * call on every session start.
 */
export async function ensureUserRecord(
  uid: string,
  identity: { name: string; email: string; avatar?: string }
): Promise<void> {
  const ref = doc(db, "users", uid)
  const existing = await getDoc(ref)
  const now = Date.now()
  await setDoc(
    ref,
    {
      name: identity.name.trim() || "HireFit User",
      email: identity.email,
      ...(identity.avatar ? { avatar: identity.avatar } : {}),
      ...(existing.exists() ? {} : { createdAt: now }),
      lastActiveAt: now,
    },
    { merge: true }
  )
}

/** Updates the `lastActiveAt` marker (used for "active users" analytics). */
export async function touchLastActive(uid: string): Promise<void> {
  await setDoc(doc(db, "users", uid), { lastActiveAt: Date.now() }, { merge: true })
}

/* -- Admin data access (Phase 5) -------------------------------------------
 * These operations are only meaningful for admins. The client checks the
 * role, but the real gate is `firestore.rules`: a non-admin receives
 * permission-denied from Firestore itself, so admin data can never be
 * reached by typing a URL or calling these functions from the console.
 * ------------------------------------------------------------------------ */

export type AnalysisRecord = {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: string
  fileName?: string | null
  atsScore?: number
  matchScore?: number
  atsCompatibility?: number
  overallScore?: number
  shortlistProbability?: string
  targetCareer?: string
  tone?: string
  companyName?: string
  skills?: string[]
  createdAt: number
  /** Id of the source resume analysis record an AI Match was computed against. */
  analysisId?: string
  /** Job description used for an AI Match run (restored alongside the result). */
  jobDescription?: string
  [key: string]: unknown
}

/** Lists every user account record (admins only at the rules level). */
export async function listUsers(): Promise<UserRecord[]> {
  const snapshot = await getDocs(collection(db, "users"))
  return snapshot.docs.map(
    (docSnapshot) => ({ uid: docSnapshot.id, ...docSnapshot.data() }) as UserRecord
  )
}

/** Lists every role document, mapped by uid (admins only at the rules level). */
export async function listRoles(): Promise<Record<string, UserRole>> {
  const snapshot = await getDocs(collection(db, "roles"))
  const roles: Record<string, UserRole> = {}
  snapshot.docs.forEach((docSnapshot) => {
    const role = docSnapshot.data()?.role
    if (role === "admin" || role === "user") roles[docSnapshot.id] = role
  })
  return roles
}

/**
 * Changes a user's role. Only admins can call this successfully (rules
 * enforce it). The actor uid is recorded for audit purposes.
 */
export async function setUserRole(
  targetUid: string,
  role: UserRole,
  actorUid: string
): Promise<void> {
  await setDoc(
    doc(db, "roles", targetUid),
    { role, updatedAt: Date.now(), updatedBy: actorUid },
    { merge: true }
  )
}

/** Lists all analysis records, newest first (admins only at the rules level). */
export async function listAnalysisRecords(): Promise<AnalysisRecord[]> {
  const snapshot = await getDocs(collection(db, "analyses"))
  return snapshot.docs
    .map(
      (docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as AnalysisRecord
    )
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/** Deletes a single analysis record (admins only at the rules level). */
export async function deleteAnalysisRecord(id: string): Promise<void> {
  await deleteDoc(doc(db, "analyses", id))
}

/**
 * Fetches the current user's own records of a given analysis type, newest
 * first. Scoped with `where("userId", "==", uid)` so the query is provably
 * owner-only under `firestore.rules` (which reads `resource.data.userId`).
 * Records are sorted client-side to avoid requiring a composite index.
 */
async function fetchMyAnalysesByType(uid: string, type: string): Promise<AnalysisRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, "analyses"), where("userId", "==", uid), limit(50))
  )
  return snapshot.docs
    .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as AnalysisRecord)
    .filter((record) => record.type === type)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/** Fetches the current user's resume analysis history, newest first. */
export async function fetchMyResumeAnalyses(uid: string): Promise<AnalysisRecord[]> {
  return fetchMyAnalysesByType(uid, "resumeAnalyzed")
}

/** Fetches the current user's AI Match history, newest first. */
export async function fetchMyJobMatches(uid: string): Promise<AnalysisRecord[]> {
  return fetchMyAnalysesByType(uid, "jobMatched")
}

/* -- Saved work / module history (Phase 4) ----------------------------------
 * Cloud source of truth for saved module work (cover letters, coach
 * conversations, interview progress). Records live at users/{uid}/saved/{type}.
 * localStorage remains a read/write cache; Firestore is authoritative for
 * authenticated users. The owner uid is ALWAYS derived from auth.currentUser —
 * callers never supply an ownership uid.
 * ------------------------------------------------------------------------ */

export type SavedRecordDoc<T = unknown> = {
  userId: string
  type: string
  data: T
  createdAt: number
  updatedAt: number
}

export const savedRecordTypes = {
  coverLetter: "cover-letter",
  coachHistory: "coach-history",
  interviewProgress: "interview-progress",
  jobDescriptions: "job-descriptions",
} as const

type SavedRecordType = (typeof savedRecordTypes)[keyof typeof savedRecordTypes]

/** Owner uid always comes from the current Firebase auth session. */
function currentOwnerUid(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error("You must be signed in to sync saved work.")
  return uid
}

function savedRecordRef(type: string) {
  const uid = currentOwnerUid()
  return { uid, ref: doc(db, "users", uid, "saved", type) }
}


/** Logs the real Firebase error (code, message, affected path) for development. */
function logSavedError(type: string, action: string, path: string, error: unknown) {
  const err = error as { code?: string; message?: string }
  console.error(`[saved:${type}] ${action} failed — error.code:`, err.code ?? "unknown", "| error.message:", err.message ?? String(error), "| path:", path)
}

/**
 * Loads the authenticated user's saved record for `type` (cloud source of
 * truth). Returns null when no record exists yet.
 */
export async function fetchSavedRecord<T = unknown>(
  type: SavedRecordType
): Promise<SavedRecordDoc<T> | null> {
  const { ref } = savedRecordRef(type)
  try {
    const snapshot = await getDoc(ref)
    if (!snapshot.exists()) return null
    return snapshot.data() as SavedRecordDoc<T>
  } catch (error) {
    logSavedError(type, "fetch", ref.path, error)
    throw error
  }
}

/**
 * Persists the authenticated user's saved record for `type`. `merge: true`
 * preserves existing fields; `createdAt` is kept from the first write.
 */
export async function saveSavedRecord(
  type: SavedRecordType,
  data: unknown
): Promise<void> {
  const { uid, ref } = savedRecordRef(type)
  try {
    const existing = await getDoc(ref)
    const now = Date.now()
    const createdAt = existing.exists() ? ((existing.data() as SavedRecordDoc).createdAt ?? now) : now
    await setDoc(ref, { userId: uid, type, data, createdAt, updatedAt: now }, { merge: true })
  } catch (error) {
    logSavedError(type, "save", ref.path, error)
    throw error
  }
}

/** Deletes the authenticated user's saved record for `type`. */
export async function deleteSavedRecord(type: SavedRecordType): Promise<void> {
  const { ref } = savedRecordRef(type)
  try {
    await deleteDoc(ref)
  } catch (error) {
    logSavedError(type, "delete", ref.path, error)
    throw error
  }
}

/* -- Local -> Firestore migration -----------------------------------------
 * Runs once per user: if there is no Firestore doc yet but the browser has
 * legacy localStorage profile/settings data, push it up (scoped to the
 * currently authenticated uid) and hydrate the cache from the result.
 * Firestore data always wins — stale localStorage is never written over it.
 * ------------------------------------------------------------------------ */

export async function pushLocalProfileToFirestore(uid: string): Promise<ProfileData | null> {
  if (!hasLocalProfile()) return null
  const local = loadProfile()
  await writeProfileToFirestore(uid, local)
  return local
}

export async function pushLocalSettingsToFirestore(uid: string): Promise<HireFitSettings | null> {
  if (!hasLocalSettings()) return null
  const local = loadSettings()
  await writeSettingsToFirestore(uid, local)
  return local
}

/**
 * Convenience used by the AuthProvider to hydrate caches after sign-in.
 * `isCancelled` lets the caller abort a stale hydration (e.g. after logout
 * or an account switch) so the previous user's data is never written into
 * the shared cache.
 */
export async function hydrateUserDataFromFirestore(
  uid: string,
  isCancelled?: () => boolean
): Promise<void> {
  const [profile, settings] = await Promise.all([
    fetchProfileFromFirestore(uid),
    fetchSettingsFromFirestore(uid),
  ])
  if (isCancelled?.()) return
  if (profile) {
    hydrateProfile(profile)
  } else {
    const migrated = await pushLocalProfileToFirestore(uid)
    if (isCancelled?.()) return
    hydrateProfile(migrated ?? { ...defaultProfile })
  }
  if (settings) {
    hydrateSettings(settings)
  } else {
    const migrated = await pushLocalSettingsToFirestore(uid)
    if (isCancelled?.()) return
    hydrateSettings(migrated ?? { ...defaultSettings })
  }
}
