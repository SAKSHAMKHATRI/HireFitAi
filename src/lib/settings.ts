/**
 * Local settings, profile, and notification read-state store for HireFit AI.
 * All values persist in localStorage (the app's existing storage architecture)
 * and are guarded so they are safe to call during SSR / hydration.
 */

export type ProfileData = {
  name: string
  headline: string
  location: string
  bio: string
  linkedin: string
  github: string
  website: string
  avatar: string
}

export const defaultProfile: ProfileData = {
  name: "",
  headline: "",
  location: "",
  bio: "",
  linkedin: "",
  github: "",
  website: "",
  avatar: "",
}

export const targetRoles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "AI Engineer",
  "ML Engineer",
  "Product Designer",
  "Data Analyst",
]

export const experienceLevels = ["Fresher", "Junior", "Mid", "Senior"]
export const coverLetterTones = ["Professional", "Confident", "Friendly", "Formal"]
export const roadmapTimeCommitments = ["3 months", "6 months", "12 months"]

export type HireFitSettings = {
  targetRole: string
  experienceLevel: string
  coverLetterTone: string
  roadmapTimeCommitment: string
  notifyModuleActivity: boolean
  notifyReminders: boolean
  reduceMotion: boolean
}

export const defaultSettings: HireFitSettings = {
  targetRole: "Software Engineer",
  experienceLevel: "Mid",
  coverLetterTone: "Professional",
  roadmapTimeCommitment: "6 months",
  notifyModuleActivity: true,
  notifyReminders: true,
  reduceMotion: false,
}

const profileKey = "hirefit_profile"
const settingsKey = "hirefit_settings"
const notificationsReadKey = "hirefit_notifications_read"

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

/* -- In-memory cache (hydrated from Firestore when signed in) -------------
 * load/save keep working synchronously for existing consumers. Once the
 * Firestore data has been fetched for the authenticated user, the cache is
 * the source of truth and localStorage acts as a write-through cache.
 * ---------------------------------------------------------------------- */

let profileCache: ProfileData | null = null
let settingsCache: HireFitSettings | null = null

/** Replace the cached profile (e.g. after a Firestore fetch) and keep localStorage in sync. */
export function hydrateProfile(profile: ProfileData): void {
  profileCache = profile
  writeJson(profileKey, profile)
}

/** Replace the cached settings (e.g. after a Firestore fetch) and keep localStorage in sync. */
export function hydrateSettings(settings: HireFitSettings): void {
  settingsCache = settings
  writeJson(settingsKey, settings)
}

/** Drop cached values (e.g. on logout) so another user never sees them. */
export function clearHydratedData(): void {
  profileCache = null
  settingsCache = null
}

/* -- Profile --------------------------------------------------------- */

export function loadProfile(): ProfileData {
  if (profileCache) return { ...profileCache }
  const stored = readJson<Partial<ProfileData>>(profileKey)
  if (!stored) return { ...defaultProfile }
  return { ...defaultProfile, ...stored }
}

export function saveProfile(profile: ProfileData): void {
  profileCache = profile
  writeJson(profileKey, profile)
}

export function hasLocalProfile(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(profileKey) !== null
}

/* -- Settings --------------------------------------------------------- */

export function loadSettings(): HireFitSettings {
  if (settingsCache) return { ...settingsCache }
  const stored = readJson<Partial<HireFitSettings>>(settingsKey)
  if (!stored) return { ...defaultSettings }
  return { ...defaultSettings, ...stored }
}

export function saveSettings(settings: HireFitSettings): void {
  settingsCache = settings
  writeJson(settingsKey, settings)
}

export function hasLocalSettings(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(settingsKey) !== null
}

/* -- Notification read state ------------------------------------------- */

export function loadReadNotifications(): string[] {
  const stored = readJson<unknown>(notificationsReadKey)
  if (!Array.isArray(stored)) return []
  return stored.filter((id): id is string => typeof id === "string")
}

export function markNotificationsRead(ids: string[]): void {
  if (ids.length === 0) return
  const current = new Set(loadReadNotifications())
  ids.forEach((id) => current.add(id))
  writeJson(notificationsReadKey, Array.from(current))
}

/* -- Data management ---------------------------------------------------- */

/**
 * Removes all HireFit app data stored locally (analytics, profile, settings,
 * saved module state). Authentication is intentionally preserved.
 */
export function clearAllLocalData(): void {
  if (typeof window === "undefined") return
  clearHydratedData()
  const keys = [
    "hirefit_analytics",
    "hirefit_profile",
    "hirefit_settings",
    "hirefit_notifications_read",
    "hirefit_cover_letter",
    "hirefit_coach_history",
    "hirefit_interview_progress",
  ]
  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore storage failures
    }
  })
}
