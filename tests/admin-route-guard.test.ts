import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveAdminRoute, type AdminRouteState } from "../src/lib/admin-route-guard"

function state(overrides: Partial<AdminRouteState>): AdminRouteState {
  return {
    status: "loading",
    isAuthenticated: false,
    isAdmin: false,
    roleStatus: "loading",
    pathname: "/admin",
    search: "",
    ...overrides,
  }
}

test("signed-out user visiting /admin → redirect to /login?next=%2Fadmin", () => {
  const decision = resolveAdminRoute(state({ status: "guest", roleStatus: "ready" }))
  assert.equal(decision.kind, "redirect-login")
  if (decision.kind === "redirect-login") {
    assert.equal(decision.destination, "/admin")
  }
})

test("signed-out user visiting /admin/users with a query → next preserves path + query", () => {
  const decision = resolveAdminRoute(
    state({ status: "guest", roleStatus: "ready", pathname: "/admin/users", search: "?tab=active" })
  )
  assert.equal(decision.kind, "redirect-login")
  if (decision.kind === "redirect-login") {
    assert.equal(decision.destination, "/admin/users?tab=active")
  }
})

test("authenticated non-admin → redirect to /dashboard", () => {
  const decision = resolveAdminRoute(
    state({ status: "authenticated", isAuthenticated: true, isAdmin: false, roleStatus: "ready" })
  )
  assert.equal(decision.kind, "redirect-dashboard")
})

test("authenticated admin → render the console", () => {
  const decision = resolveAdminRoute(
    state({ status: "authenticated", isAuthenticated: true, isAdmin: true, roleStatus: "ready" })
  )
  assert.equal(decision.kind, "render")
})

test("admin can access admin child routes (e.g. /admin/users)", () => {
  const decision = resolveAdminRoute(
    state({
      status: "authenticated",
      isAuthenticated: true,
      isAdmin: true,
      roleStatus: "ready",
      pathname: "/admin/users",
    })
  )
  assert.equal(decision.kind, "render")
})

test("admin can access every admin child route", () => {
  for (const pathname of ["/admin", "/admin/users", "/admin/analyses", "/admin/analytics", "/admin/settings"]) {
    const decision = resolveAdminRoute(
      state({ status: "authenticated", isAuthenticated: true, isAdmin: true, roleStatus: "ready", pathname })
    )
    assert.equal(decision.kind, "render", `expected render for ${pathname}`)
  }
})

test("roleStatus === 'loading' must NOT cause a premature redirect for a real admin", () => {
  // This is the race-condition regression: the role defaults to "user" while
  // fetchUserRole is still in flight, so an admin must never be bounced to
  // /dashboard before their role document is read.
  const decision = resolveAdminRoute(
    state({ status: "authenticated", isAuthenticated: true, isAdmin: false, roleStatus: "loading" })
  )
  assert.equal(decision.kind, "wait")
})

test("roleStatus === 'loading' never redirects even for a guest mid-session-restore", () => {
  const decision = resolveAdminRoute(state({ status: "loading", roleStatus: "loading" }))
  assert.equal(decision.kind, "wait")
})

test("auth session still restoring (status loading) → wait, no redirect", () => {
  const decision = resolveAdminRoute(
    state({ status: "loading", isAuthenticated: false, isAdmin: false, roleStatus: "loading" })
  )
  assert.equal(decision.kind, "wait")
})

test("signed-out user visiting EVERY admin child route → login with correct next path", () => {
  for (const pathname of ["/admin/users", "/admin/analyses", "/admin/analytics", "/admin/settings"]) {
    const decision = resolveAdminRoute(state({ status: "guest", roleStatus: "ready", pathname }))
    assert.equal(decision.kind, "redirect-login", `expected login redirect for ${pathname}`)
    if (decision.kind === "redirect-login") {
      assert.equal(decision.destination, pathname)
    }
  }
})

test("authenticated non-admin visiting any admin route → redirect to /dashboard", () => {
  for (const pathname of ["/admin", "/admin/users", "/admin/analyses", "/admin/analytics", "/admin/settings"]) {
    const decision = resolveAdminRoute(
      state({ status: "authenticated", isAuthenticated: true, isAdmin: false, roleStatus: "ready", pathname })
    )
    assert.equal(decision.kind, "redirect-dashboard", `expected dashboard redirect for ${pathname}`)
  }
})

test("guest with an already-encoded next path never redirects to an external destination", () => {
  // The guard builds `next` from the current path only — a crafted
  // search string cannot smuggle an external URL into the redirect.
  const decision = resolveAdminRoute(
    state({ status: "guest", roleStatus: "ready", pathname: "/admin", search: "next=https%3A%2F%2Fevil.example" })
  )
  assert.equal(decision.kind, "redirect-login")
  if (decision.kind === "redirect-login") {
    assert.ok(!decision.destination.startsWith("http"))
    assert.ok(decision.destination.startsWith("/"))
  }
})

test("isAuthenticated is false while the auth session restores → wait, never render or redirect", () => {
  const decision = resolveAdminRoute(
    state({ status: "loading", isAuthenticated: false, isAdmin: false, roleStatus: "ready" })
  )
  assert.equal(decision.kind, "wait")
})
