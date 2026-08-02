"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"

const navLinks = ["Features", "How It Works", "Testimonials", "Blog"]

function HireFitLogo() {
  return (
    <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#1a1a1a] shadow-[0_14px_35px_rgba(0,0,0,0.2)]">
      <span className="absolute inset-1 rounded-lg border border-brand-green/40" />
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="relative fill-none stroke-brand-green stroke-[1.8]">
        <path d="M3 14.5V3.5M3 9h12M15 3.5v11" strokeLinecap="round" />
        <path d="M6.5 4.5h5M6.5 13.5h5" strokeLinecap="round" opacity=".55" />
      </svg>
    </span>
  )
}

function Hamburger({ open }: { open: boolean }) {
  return (
    <span className="relative block h-5 w-6">
      <motion.span
        animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
        className="absolute left-0 top-0 h-px w-6 bg-[#1a1a1a]"
      />
      <motion.span
        animate={open ? { opacity: 0, x: 8 } : { opacity: 1, x: 0 }}
        className="absolute left-0 top-2 h-px w-6 bg-[#1a1a1a]"
      />
      <motion.span
        animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
        className="absolute left-0 top-4 h-px w-6 bg-[#1a1a1a]"
      />
    </span>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, status, signOut } = useAuth()
  const authenticated = status === "authenticated" && isAuthenticated
  const launchHref = isAuthenticated ? "/dashboard" : "/login?next=%2Fdashboard"

  const handleLogout = () => {
    setOpen(false)
    signOut()
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 py-6 md:py-10 bg-gradient-to-b from-[#f1f1f1]/80 to-transparent backdrop-blur-[2px]">
      <nav className="grid grid-cols-12 max-w-7xl mx-auto px-8 md:px-16 lg:px-20 items-center gap-x-4 md:gap-x-8">
        <Link href="/" className="col-span-6 md:col-span-3 flex items-center gap-3">
          <HireFitLogo />
          <span className="font-display text-xl md:text-2xl tracking-tight text-[#1a1a1a]">HireFit AI</span>
        </Link>

        <div className="hidden md:flex col-span-6 items-center justify-center gap-7 text-[13px] text-zinc-700">
          {navLinks.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="transition-colors hover:text-black">
              {item}
            </a>
          ))}
        </div>

        <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-3">
          {status === "loading" ? null : authenticated ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline text-[13px] text-zinc-700 hover:text-black">
                Dashboard
              </Link>
              <Link href="/profile" className="hidden sm:inline text-[13px] text-zinc-700 hover:text-black">
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[13px] font-medium text-zinc-900 transition-colors hover:border-black/25 hover:text-black"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline text-[13px] text-zinc-700 hover:text-black">
                Login
              </Link>
              <Link href="/signup" className="hidden lg:inline text-[13px] text-zinc-700 hover:text-black">
                Sign Up
              </Link>
              <Link href={launchHref} className="rounded-full bg-[#1a1a1a] px-4 py-2 text-[13px] font-medium text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-0.5">
                Launch HireFit AI →
              </Link>
            </>
          )}
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="md:hidden rounded-full border border-black/10 bg-white/45 p-3 backdrop-blur-xl"
          >
            <Hamburger open={open} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden mx-6 mt-5 rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-2xl shadow-black/10 backdrop-blur-2xl"
          >
            <div className="flex flex-col divide-y divide-black/5">
              {navLinks.map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
                  onClick={() => setOpen(false)}
                  className="py-4 text-sm text-zinc-800"
                >
                  {item}
                </Link>
              ))}
              {status === "loading" ? null : authenticated ? (
                <>
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="py-4 text-sm text-zinc-800">
                    Dashboard
                  </Link>
                  <Link href="/profile" onClick={() => setOpen(false)} className="py-4 text-sm text-zinc-800">
                    Profile
                  </Link>
                  <button type="button" onClick={handleLogout} className="py-4 text-left text-sm text-zinc-800">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="py-4 text-sm text-zinc-800">
                    Login
                  </Link>
                  <Link href="/signup" onClick={() => setOpen(false)} className="py-4 text-sm text-zinc-800">
                    Sign Up
                  </Link>
                  <Link href={launchHref} onClick={() => setOpen(false)} className="py-4 text-sm font-medium text-black">
                    Launch HireFit AI →
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
