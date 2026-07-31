"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { clearMockAuth, getMockUser, hasMockAuth, setMockAuth, type MockUser } from "@/lib/mock-auth"

type AuthStatus = "loading" | "authenticated" | "guest"

type AuthContextValue = {
  user: MockUser | null
  status: AuthStatus
  isAuthenticated: boolean
  signIn: (user: MockUser) => void
  signOut: () => void
  requireAuth: (destination: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function safeDestination(destination: string) {
  return destination.startsWith("/") && !destination.startsWith("//") ? destination : "/dashboard"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<MockUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [authDestination, setAuthDestination] = useState<string | null>(null)

  useEffect(() => {
    const syncAuth = () => {
      const storedUser = getMockUser()
      if (storedUser && hasMockAuth()) {
        setUser(storedUser)
        setStatus("authenticated")
      } else {
        setUser(null)
        setStatus("guest")
      }
    }

    syncAuth()
    window.addEventListener("storage", syncAuth)
    return () => window.removeEventListener("storage", syncAuth)
  }, [])

  useEffect(() => {
    setAuthDestination(null)
  }, [pathname])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    isAuthenticated: status === "authenticated" && user !== null,
    signIn: (nextUser) => {
      setMockAuth(nextUser)
      setUser(nextUser)
      setStatus("authenticated")
    },
    signOut: () => {
      clearMockAuth()
      setUser(null)
      setStatus("guest")
      router.push("/")
    },
    requireAuth: (destination) => {
      const target = safeDestination(destination)
      if (status === "authenticated" && user) {
        router.push(target)
      } else {
        setAuthDestination(target)
      }
    },
  }), [router, status, user])

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
