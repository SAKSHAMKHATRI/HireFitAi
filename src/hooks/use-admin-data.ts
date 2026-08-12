"use client"

import { useCallback, useEffect, useState } from "react"
import {
  listAnalysisRecords,
  listRoles,
  listUsers,
  type AnalysisRecord,
  type UserRecord,
  type UserRole,
} from "@/lib/firebase-firestore"

export type AdminData = {
  users: UserRecord[]
  roles: Record<string, UserRole>
  analyses: AnalysisRecord[]
  loading: boolean
  error: string | null
  reload: () => void
}

export type AdminDataOptions = {
  /** Fetch the `users` collection (default true). */
  users?: boolean
  /** Fetch the `roles` collection (default true). */
  roles?: boolean
  /** Fetch the `analyses` collection (default true). */
  analyses?: boolean
}

function friendlyError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? ""
  if (code === "permission-denied") {
    return "Permission denied. This account does not have admin access, or the Firestore security rules have not been deployed yet."
  }
  if (code === "unavailable") {
    return "Network error — could not reach Firestore. Check your connection and try again."
  }
  return "Something went wrong while loading admin data. Please try again."
}

/**
 * Loads the requested admin dataset (user records, role documents, analysis
 * records) once and exposes it with loading/error/retry state. Pages opt in
 * to only the collections they actually render (`AdminDataOptions`), so the
 * Users page fetches users+roles+analyses while the Analyses page fetches
 * just analyses. Defaults keep every collection on for backward compat.
 */
export function useAdminData(options: AdminDataOptions = {}): AdminData {
  const wantUsers = options.users ?? true
  const wantRoles = options.roles ?? true
  const wantAnalyses = options.analyses ?? true

  const [users, setUsers] = useState<UserRecord[]>([])
  const [roles, setRoles] = useState<Record<string, UserRole>>({})
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const results = await Promise.all([
          wantUsers ? listUsers() : Promise.resolve([] as UserRecord[]),
          wantRoles ? listRoles() : Promise.resolve({} as Record<string, UserRole>),
          wantAnalyses ? listAnalysisRecords() : Promise.resolve([] as AnalysisRecord[]),
        ])
        if (cancelled) return
        setUsers(results[0])
        setRoles(results[1])
        setAnalyses(results[2])
      } catch (loadError) {
        if (!cancelled) setError(friendlyError(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey, wantUsers, wantRoles, wantAnalyses])

  return { users, roles, analyses, loading, error, reload }
}
