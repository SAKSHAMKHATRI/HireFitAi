"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status === "guest") {
      const query = window.location.search.replace(/^\?/, "")
      const destination = `${pathname}${query ? `?${query}` : ""}`
      router.replace(`/login?next=${encodeURIComponent(destination)}`)
    }
  }, [pathname, router, status])

  if (status === "loading" || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-green" />
          Checking your session...
        </div>
      </div>
    )
  }

  return children
}
