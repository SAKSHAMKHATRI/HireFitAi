"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { useAuth } from "@/components/auth/auth-provider"

type AuthAwareLinkProps = ComponentProps<typeof Link>

export function AuthAwareLink({ href, onClick, ...props }: AuthAwareLinkProps) {
  const { isAuthenticated, requireAuth } = useAuth()
  const destination = typeof href === "string" ? href : href.pathname ?? "/dashboard"

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (!isAuthenticated) {
          event.preventDefault()
          requireAuth(destination)
        }
      }}
    />
  )
}
