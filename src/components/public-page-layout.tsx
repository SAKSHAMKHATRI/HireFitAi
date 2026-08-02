import Link from "next/link"
import { Navbar } from "@/components/Navbar"
import type { ReactNode } from "react"

export function PublicPageLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-base selection:bg-brand-green selection:text-black">
      <Navbar />
      <main className="mx-auto max-w-3xl px-8 pb-24 pt-40 md:px-16 lg:px-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
        <h1 className="mt-5 font-display text-5xl leading-[1.02] text-zinc-950">{title}</h1>
        {intro ? <p className="mt-6 text-lg leading-8 text-zinc-600">{intro}</p> : null}
        <div className="mt-14">{children}</div>
        <Link
          href="/"
          className="mt-16 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm backdrop-blur-xl transition-transform hover:-translate-y-0.5"
        >
          ← Back to home
        </Link>
      </main>
      <footer className="border-t border-black/5 py-10 text-center text-xs text-zinc-500">
        <p>© 2026 HireFit AI. Built for ambitious careers.</p>
      </footer>
    </div>
  )
}
