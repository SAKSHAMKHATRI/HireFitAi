/**
 * Pure decision logic for the admin route guard (`AdminRoute`).
 *
 * Kept dependency-free so the redirect matrix can be unit-tested without
 * mounting the React tree or mocking Next.js. `AdminRoute` renders the
 * "Checking admin access…" screen while the decision is `"wait"` and fires
 * the redirect for `"redirect-*"` results.
 *
 * Rules (preserved from the original guard):
 *  - Guest (signed out)            → redirect to `/login?next=<path>`
 *  - Role lookup still in flight    → wait (NEVER redirect prematurely —
 *    the role defaults to "user" while loading, so redirecting here would
 *    bounce a real admin to /dashboard before their role resolves)
 *  - Signed-in non-admin            → redirect to /dashboard
 *  - Signed-in admin                → render the console
 */

export type AdminRouteState = {
  status: "loading" | "authenticated" | "guest"
  isAuthenticated: boolean
  isAdmin: boolean
  roleStatus: "loading" | "ready"
  pathname: string
  search: string
}

export type AdminRouteDecision =
  | { kind: "redirect-login"; destination: string }
  | { kind: "redirect-dashboard" }
  | { kind: "wait" }
  | { kind: "render" }

export function resolveAdminRoute(state: AdminRouteState): AdminRouteDecision {
  const { status, isAuthenticated, isAdmin, roleStatus, pathname, search } = state

  if (status === "guest") {
    const query = search.replace(/^\?/, "")
    const destination = `${pathname}${query ? `?${query}` : ""}`
    return { kind: "redirect-login", destination }
  }

  // Critical: never redirect before the role lookup has finished. The role
  // defaults to "user" while `fetchUserRole` is still in flight, so an admin
  // would be bounced to /dashboard before their role ever resolves.
  if (roleStatus === "loading") return { kind: "wait" }

  if (isAuthenticated && !isAdmin) return { kind: "redirect-dashboard" }

  if (isAuthenticated && isAdmin && status === "authenticated") {
    return { kind: "render" }
  }

  // Any other intermediate state (auth session still restoring, etc.) keeps
  // the loading screen up without redirecting.
  return { kind: "wait" }
}
