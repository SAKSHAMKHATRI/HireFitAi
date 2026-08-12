"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { motion } from "motion/react"
import { useAuth } from "@/components/auth/auth-provider"
import { getAuthErrorMessage, signInWithGoogle } from "@/lib/firebase-auth"

type AuthMode = "login" | "signup"
type FormErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function safeNextPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard"
}

export function AuthForm({ mode, nextPath = "/dashboard" }: { mode: AuthMode; nextPath?: string }) {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const isSignup = mode === "signup"
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" })

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(null)
  }

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (isSignup && form.name.trim().length < 2) nextErrors.name = "Enter your full name."
    if (!emailPattern.test(form.email.trim())) nextErrors.email = "Enter a valid email address."
    if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters."
    if (isSignup && form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match."
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const completeAuth = async (action: () => Promise<unknown>, silentOnCancel = false) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await action()
      router.push(safeNextPath(nextPath))
      router.refresh()
    } catch (error) {
      const code = (error as { code?: string } | null)?.code
      const cancelled = code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
      if (!(silentOnCancel && cancelled)) {
        setFormError(getAuthErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    void completeAuth(async () => {
      const email = form.email.trim().toLowerCase()
      if (isSignup) {
        await signUp(form.name.trim(), email, form.password)
      } else {
        await signIn(email, form.password)
      }
    })
  }

  const handleGoogle = () => {
    void completeAuth(signInWithGoogle, true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base px-6 py-10 text-zinc-950">
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-green/20 blur-[130px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-display text-xl font-semibold">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-zinc-950 text-brand-green shadow-lg">
              <span className="absolute inset-1 rounded-lg border border-brand-green/40" />
              H
            </span>
            HireFit AI
          </Link>
          <Link href="/" className="text-sm text-zinc-600 transition-colors hover:text-black">Back to home</Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-2">
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Your AI career copilot</p>
            <h1 className="mt-6 max-w-xl font-display text-6xl leading-[0.98]">Move from application to opportunity.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-600">Resume intelligence, ATS guidance, and interview preparation in one focused workspace.</p>
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
              {["92% ATS", "87% Match", "91% Ready"].map((item) => <div key={item} className="rounded-2xl border border-white/70 bg-white/55 p-4 text-sm font-semibold shadow-sm backdrop-blur-xl">{item}</div>)}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.08 }} className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/70 p-7 shadow-[0_35px_100px_rgba(22,28,45,0.14)] backdrop-blur-2xl sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{isSignup ? "Create account" : "Welcome back"}</p>
            <h2 className="mt-4 font-display text-4xl font-semibold">{isSignup ? "Start building momentum." : "Continue your journey."}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{isSignup ? "Create your free HireFit AI account." : "Sign in to access your HireFit AI dashboard."}</p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              {isSignup ? (
                <label className="block text-sm font-medium">
                  Full name
                  <input id="signup-name" name="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                  {errors.name ? <span className="mt-1.5 block text-xs text-red-600">{errors.name}</span> : null}
                </label>
              ) : null}

              <label className="block text-sm font-medium">
                Email address
                <input id="email" name="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                {errors.email ? <span className="mt-1.5 block text-xs text-red-600">{errors.email}</span> : null}
              </label>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  {!isSignup ? (
                    <Link href="/forgot-password" className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 hover:underline">
                      Forgot password?
                    </Link>
                  ) : null}
                </div>
                <span className="relative mt-2 block">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => updateField("password", event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 pr-12 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-black">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
                {errors.password ? <span className="mt-1.5 block text-xs text-red-600">{errors.password}</span> : null}
              </div>

              {isSignup ? (
                <label className="block text-sm font-medium">
                  Confirm password
                  <input id="confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                  {errors.confirmPassword ? <span className="mt-1.5 block text-xs text-red-600">{errors.confirmPassword}</span> : null}
                </label>
              ) : null}

              {formError ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}

              <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">
                {submitting ? "Opening dashboard..." : isSignup ? "Create account" : "Login"}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">or continue with</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <button type="button" onClick={handleGoogle} disabled={submitting} className="mt-4 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-white text-sm font-semibold text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow disabled:cursor-wait disabled:opacity-70">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
              </svg>
              Continue with Google
            </button>

            <p className="mt-6 text-center text-sm text-zinc-600">
              {isSignup ? "Already have an account?" : "New to HireFit AI?"}{" "}
              <Link href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(safeNextPath(nextPath))}`} className="font-semibold text-zinc-950 underline decoration-brand-green decoration-2 underline-offset-4">
                {isSignup ? "Login" : "Sign up"}
              </Link>
            </p>
            <p className="mt-4 text-center text-[11px] leading-5 text-zinc-500">Your account is secured with Firebase Authentication.</p>
          </motion.section>
        </div>
      </div>
    </main>
  )
}
