"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { resolveAdminRoute } from "@/lib/admin-route-guard"

/**
 * Phase 5 — admin route guard.
 *
 *  - Not signed in      → redirect to /login?next=<current admin path>
 *  - Signed-in user     → redirect to the user dashboard (access denied)
 *  - Admin              → render children
 *
 * The check uses the role resolved by the AuthProvider from Firestore; it
 * never relies on hidden UI. Server-side enforcement lives in
 * `firestore.rules` (admin-only collections), so a non-admin can never
 * read admin data even by calling Firestore directly.
 *
 * The redirect/render decision is delegated to the pure
 * `resolveAdminRoute` helper so the matrix is unit-tested in
 * `tests/admin-route-guard.test.ts`.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { status, isAuthenticated, isAdmin, roleStatus } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const decision = resolveAdminRoute({
      status,
      isAuthenticated,
      isAdmin,
      roleStatus,
      pathname,
      search: window.location.search.replace(/^\?/, ""),
    })
    if (decision.kind === "redirect-login") {
      router.replace(`/login?next=${encodeURIComponent(decision.destination)}`)
    } else if (decision.kind === "redirect-dashboard") {
      router.replace("/dashboard")
    }
  }, [pathname, router, status, isAuthenticated, isAdmin, roleStatus])

  const decision = resolveAdminRoute({
    status,
    isAuthenticated,
    isAdmin,
    roleStatus,
    pathname,
    search: typeof window === "undefined" ? "" : window.location.search.replace(/^\?/, ""),
  })

  if (decision.kind === "render") {
    return children
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-green" />
        Checking admin access...
      </div>
    </div>
  )
}
