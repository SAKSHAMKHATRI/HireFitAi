"use client"

import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

/** Admin shortcut shown in the user-dashboard header — admins only. */
export function AdminHeaderLink() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null

  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 rounded-md border border-brand-green/30 bg-brand-green/10 px-2.5 py-1.5 text-xs font-semibold text-brand-green transition-colors hover:bg-brand-green/20"
    >
      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
      Admin
    </Link>
  )
}
