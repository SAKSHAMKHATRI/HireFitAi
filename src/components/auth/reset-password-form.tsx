"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react"
import { motion } from "motion/react"
import { getAuthErrorMessage, resetPasswordWithCode, verifyPasswordResetCode } from "@/lib/firebase-auth"

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

type ResetStatus = "verifying" | "invalid" | "ready" | "success"

const passwordMinLength = 8

export function ResetPasswordForm({ oobCode }: { oobCode: string | null }) {
  const [status, setStatus] = useState<ResetStatus>(oobCode ? "verifying" : "invalid")
  const [invalidMessage, setInvalidMessage] = useState("This password reset link is invalid or has expired. Request a new one.")
  const [accountEmail, setAccountEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!oobCode) return
    let cancelled = false
    verifyPasswordResetCode(oobCode)
      .then((email) => {
        if (cancelled) return
        setAccountEmail(email)
        setStatus("ready")
      })
      .catch((verifyError) => {
        if (cancelled) return
        const code = (verifyError as { code?: string } | null)?.code ?? ""
        setInvalidMessage(
          code === "auth/expired-action-code"
            ? "This password reset link has expired. Request a new one."
            : code === "auth/network-request-failed"
              ? "Network error — check your connection and try again."
              : "This password reset link is invalid or has already been used. Request a new one."
        )
        setStatus("invalid")
      })
    return () => {
      cancelled = true
    }
  }, [oobCode])

  const updatePassword = (value: string) => {
    setPassword(value)
    setError(null)
  }

  const updateConfirm = (value: string) => {
    setConfirmPassword(value)
    setError(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.length < passwordMinLength) {
      setError(`Password must be at least ${passwordMinLength} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (!oobCode) return
    setError(null)
    setSubmitting(true)
    resetPasswordWithCode(oobCode, password)
      .then(() => setStatus("success"))
      .catch((resetError) => {
        const code = (resetError as { code?: string } | null)?.code ?? ""
        if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
          setInvalidMessage("This password reset link has expired or was already used. Request a new one.")
          setStatus("invalid")
        } else {
          setError(getAuthErrorMessage(resetError))
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
            <h1 className="mt-6 max-w-xl font-display text-6xl leading-[0.98]">New password, same momentum.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-600">
              Choose a fresh password and get straight back to your resume, matches, and interview prep.
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
            {status === "verifying" ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
                <p className="mt-5 text-sm text-zinc-600">Checking your reset link...</p>
              </div>
            ) : status === "invalid" ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-red-100">
                  <ShieldAlert className="h-7 w-7 text-red-500" strokeWidth={1.5} />
                </div>
                <h2 className="mt-6 font-display text-3xl font-semibold">Link unavailable</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600">{invalidMessage}</p>
                <div className="mt-8 flex w-full flex-col gap-3">
                  <Link
                    href="/forgot-password"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
                  >
                    Request a new link
                  </Link>
                  <Link
                    href="/login"
                    className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-zinc-600 transition hover:bg-black/5 hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                    Back to Login
                  </Link>
                </div>
              </div>
            ) : status === "success" ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-green/20">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />
                </div>
                <h2 className="mt-6 font-display text-3xl font-semibold">Password updated</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600">
                  Your password has been reset. Sign in with your new password to continue.
                </p>
                <Link
                  href="/login"
                  className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
                >
                  Back to Login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Reset password</p>
                <h2 className="mt-4 font-display text-4xl font-semibold">Choose a new password</h2>
                {accountEmail ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    For <span className="font-semibold text-zinc-900">{accountEmail}</span>
                  </p>
                ) : null}

                <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
                  <label className="block text-sm font-medium">
                    New password
                    <span className="relative mt-2 block">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
                      <input
                        id="new-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => updatePassword(event.target.value)}
                        className="h-12 w-full rounded-xl border border-black/10 bg-white pl-11 pr-12 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-black"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>

                  <label className="block text-sm font-medium">
                    Confirm password
                    <span className="relative mt-2 block">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => updateConfirm(event.target.value)}
                        className="h-12 w-full rounded-xl border border-black/10 bg-white pl-11 pr-12 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-black"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>

                  {error ? (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                  >
                    {submitting ? "Resetting..." : "Reset Password"}
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
