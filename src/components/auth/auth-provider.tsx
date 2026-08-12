"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  loginWithEmail,
  logout,
  observeAuthState,
  registerWithEmail,
  updateUserProfile,
  type AuthUser,
} from "@/lib/firebase-auth"
import {
  ensureUserRecord,
  fetchUserRole,
  hydrateUserDataFromFirestore,
  touchLastActive,
  type UserRole,
} from "@/lib/firebase-firestore"
import { clearHydratedData } from "@/lib/settings"

type AuthStatus = "loading" | "authenticated" | "guest"

type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  /** The current user's role. "user" while loading, missing, or on read failure. */
  role: UserRole
  /** Whether the role lookup has finished ("ready") or is still in flight ("loading"). */
  roleStatus: "loading" | "ready"
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateUser: (updates: { name?: string; avatar?: string }) => Promise<void>
  requireAuth: (destination: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function safeDestination(destination: string) {
  return destination.startsWith("/") && !destination.startsWith("//") ? destination : "/dashboard"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [role, setRole] = useState<UserRole>("user")
  const [roleStatus, setRoleStatus] = useState<"loading" | "ready">("loading")
  const [authDestination, setAuthDestination] = useState<string | null>(null)

  useEffect(() => {
    // Remove the legacy mock-auth keys from the previous phase. A leftover
    // mock session must never be mistaken for a real Firebase session.
    window.localStorage.removeItem("hirefit_mock_auth")
    window.localStorage.removeItem("hirefit_mock_user")

    // Real Firebase session: fires with the persisted user after restore
    // (keeps a page refresh logged in) and stays in sync across tabs.
    const unsubscribe = observeAuthState((nextUser) => {
      setUser(nextUser)
      setStatus(nextUser ? "authenticated" : "guest")
    })
    return unsubscribe
  }, [])

  // Hydrate the profile/settings caches from Firestore whenever the
  // authenticated user changes (sign-in, sign-up, refresh, user switch).
  // On logout the caches are cleared so no other user's data leaks.
  const uid = user?.uid
  useEffect(() => {
    if (!uid) {
      clearHydratedData()
      return
    }
    let cancelled = false
    void (async () => {
      try {
        await hydrateUserDataFromFirestore(uid, () => cancelled)
      } catch {
        // Read/network errors are non-fatal here: caches keep their defaults
        // and the Profile/Settings pages surface their own error states.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid])

  // Phase 5 — role + account record. Resolved whenever the authenticated
  // user changes (sign-in, sign-up, refresh, user switch). The account
  // record is created lazily and the role is always fetched fresh so an
  // admin grant/revoke takes effect on the next refresh.
  useEffect(() => {
    if (!uid) {
      setRole("user")
      // Only settle the role lookup once we know there is genuinely no
      // session (guest). While the auth session is still restoring
      // (status === "loading"), keep roleStatus "loading" — marking it
      // "ready" early lets AdminRoute redirect a signed-in admin to
      // /dashboard before their role document is ever read.
      if (status === "guest") setRoleStatus("ready")
      return
    }
    setRoleStatus("loading")
    let cancelled = false
    void (async () => {
      // The account record is best-effort — a failed write must never
      // block role resolution or gate admin access.
      try {
        await ensureUserRecord(uid, {
          name: user?.name ?? "",
          email: user?.email ?? "",
          avatar: user?.avatar,
        })
      } catch {
        // Non-fatal: role resolution continues below.
      }
      void touchLastActive(uid).catch(() => {})
      const nextRole = await fetchUserRole(uid)
      if (!cancelled) {
        setRole(nextRole)
        setRoleStatus("ready")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, user?.name, user?.email, user?.avatar, status])

  useEffect(() => {
    setAuthDestination(null)
  }, [pathname])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      role,
      roleStatus,
      isAdmin: role === "admin",
      isAuthenticated: status === "authenticated" && user !== null,
      signIn: async (email, password) => {
        const nextUser = await loginWithEmail(email, password)
        setUser(nextUser)
        setStatus("authenticated")
        setRole("user")
        setRoleStatus("loading")
      },
      signUp: async (name, email, password) => {
        const nextUser = await registerWithEmail(name, email, password)
        setUser(nextUser)
        setStatus("authenticated")
        setRole("user")
        setRoleStatus("loading")
      },
      signOut: async () => {
        await logout()
        setUser(null)
        setStatus("guest")
        setRole("user")
        setRoleStatus("ready")
        router.push("/")
      },
      updateUser: async (updates) => {
        const nextUser = await updateUserProfile(updates)
        setUser(nextUser)
      },
      requireAuth: (destination) => {
        const target = safeDestination(destination)
        if (status === "authenticated" && user) {
          router.push(target)
        } else {
          setAuthDestination(target)
        }
      },
    }),
    [router, status, user, role, roleStatus]
  )

  const nextQuery = encodeURIComponent(authDestination ?? "/dashboard")

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {authDestination ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-5 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setAuthDestination(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg rounded-[28px] border border-white/80 bg-[#EDEEF5]/95 p-7 text-zinc-950 shadow-[0_40px_120px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-9"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-zinc-950 font-display font-semibold text-brand-green">H</div>
              <h2 id="auth-modal-title" className="mt-7 font-display text-4xl font-semibold">Sign in to continue</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                Create your free HireFit AI account to analyze resumes, improve ATS scores, prepare for interviews, and access your personalized dashboard.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link href={`/login?next=${nextQuery}`} className="flex h-12 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5">
                  Sign In
                </Link>
                <Link href={`/signup?next=${nextQuery}`} className="flex h-12 items-center justify-center rounded-xl bg-brand-green text-sm font-semibold text-black shadow-xl transition hover:-translate-y-0.5">
                  Create Account
                </Link>
              </div>
              <button type="button" onClick={() => setAuthDestination(null)} className="mt-4 h-11 w-full rounded-xl text-sm font-medium text-zinc-600 transition hover:bg-black/5 hover:text-black">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
