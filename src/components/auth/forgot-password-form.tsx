"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react"
import { motion } from "motion/react"
import { sendPasswordResetEmail } from "@/lib/firebase-auth"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function HireFitMark() {
  return (
    <Link href="/" className="flex items-center gap-3 font-display text-xl font-semibold">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-zinc-950 text-brand-green shadow-lg">
        <span className="absolute inset-1 rounded-lg border border-brand-green/40" />
        H
      </span>
      HireFit AI
    </Link>
  )
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const updateEmail = (value: string) => {
    setEmail(value)
    setError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = email.trim().toLowerCase()
    if (!value) {
      setError("Enter your email address.")
      return
    }
    if (!emailPattern.test(value)) {
      setError("Enter a valid email address.")
      return
    }
    setError(null)
    setSubmitting(true)
    // Anti-enumeration: an unknown email still resolves to the success screen,
    // so a visitor can never learn whether an address is registered.
    sendPasswordResetEmail(value)
      .then(() => setSent(true))
      .catch((sendError) => {
        const code = (sendError as { code?: string } | null)?.code ?? ""
        if (code === "auth/too-many-requests") {
          setError("Too many attempts. Wait a moment and try again.")
        } else if (code === "auth/network-request-failed") {
          setError("Network error — check your connection and try again.")
        } else if (code === "auth/unauthorized-continue-uri") {
          // The app's domain isn't in the Firebase authorized-domains list.
          // Surfacing this is safe (it's a config issue, not account info).
          setError("Password reset emails can't be sent from this domain yet. Please try again later.")
        } else {
          // Includes auth/user-not-found: never reveal whether the email is registered.
          setSent(true)
        }
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base px-6 py-10 text-zinc-950">
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-green/20 blur-[130px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <HireFitMark />
          <Link href="/" className="text-sm text-zinc-600 transition-colors hover:text-black">Back to home</Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-2">
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Account recovery</p>
            <h1 className="mt-6 max-w-xl font-display text-6xl leading-[0.98]">Back to your best self in minutes.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-600">
              Forgot your password? No problem. We&apos;ll send you a secure link to reset it — your resume, matches, and progress are safe.
            </p>
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
              {["92% ATS", "87% Match", "91% Ready"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/70 bg-white/55 p-4 text-sm font-semibold shadow-sm backdrop-blur-xl">{item}</div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/70 p-7 shadow-[0_35px_100px_rgba(22,28,45,0.14)] backdrop-blur-2xl sm:p-9"
          >
            {sent ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-green/20">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />
                </div>
                <h2 className="mt-6 font-display text-3xl font-semibold">Check your inbox</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600">
                  {email.trim()
                    ? <>If an account exists for <span className="font-semibold text-zinc-900">{email.trim().toLowerCase()}</span>, we&apos;ve sent a link to reset your password. Check your inbox (and spam folder).</>
                    : "If an account exists, we've sent a link to reset your password. Check your inbox (and spam folder)."}
                </p>
                <div className="mt-8 flex w-full flex-col gap-3">
                  <Link
                    href="/login"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
                  >
                    Back to Login
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="h-12 w-full rounded-xl text-sm font-medium text-zinc-600 transition hover:bg-black/5 hover:text-black"
                  >
                    Didn&apos;t get an email? Try again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Forgot password</p>
                <h2 className="mt-4 font-display text-4xl font-semibold">Forgot your password?</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
                  <label className="block text-sm font-medium">
                    Email address
                    <span className="relative mt-2 block">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
                      <input
                        id="reset-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => updateEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="h-12 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 outline-none transition placeholder:text-zinc-400 focus:border-black/30 focus:ring-2 focus:ring-brand-green/40"
                      />
                    </span>
                    {error ? <span className="mt-1.5 block text-xs text-red-600">{error}</span> : null}
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                  >
                    {submitting ? "Sending reset link..." : "Send Reset Link"}
                    {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                </form>

                <Link
                  href="/login"
                  className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                  Back to Login
                </Link>
              </>
            )}
          </motion.section>
        </div>
      </div>
    </main>
  )
}
