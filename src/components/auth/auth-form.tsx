"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { motion } from "motion/react"
import { useAuth } from "@/components/auth/auth-provider"

type AuthMode = "login" | "signup"
type FormErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function safeNextPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard"
}

export function AuthForm({ mode, nextPath = "/dashboard" }: { mode: AuthMode; nextPath?: string }) {
  const router = useRouter()
  const { signIn } = useAuth()
  const isSignup = mode === "signup"
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" })

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    const email = form.email.trim().toLowerCase()
    const fallbackName = email.split("@")[0].replace(/[._-]+/g, " ")
    signIn({ name: isSignup ? form.name.trim() : fallbackName, email })
    router.push(safeNextPath(nextPath))
    router.refresh()
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
                  <input value={form.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                  {errors.name ? <span className="mt-1.5 block text-xs text-red-600">{errors.name}</span> : null}
                </label>
              ) : null}

              <label className="block text-sm font-medium">
                Email address
                <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                {errors.email ? <span className="mt-1.5 block text-xs text-red-600">{errors.email}</span> : null}
              </label>

              <label className="block text-sm font-medium">
                Password
                <span className="relative mt-2 block">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => updateField("password", event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 pr-12 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-black">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
                {errors.password ? <span className="mt-1.5 block text-xs text-red-600">{errors.password}</span> : null}
              </label>

              {isSignup ? (
                <label className="block text-sm font-medium">
                  Confirm password
                  <input type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} autoComplete="new-password" className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40" />
                  {errors.confirmPassword ? <span className="mt-1.5 block text-xs text-red-600">{errors.confirmPassword}</span> : null}
                </label>
              ) : null}

              <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">
                {submitting ? "Opening dashboard..." : isSignup ? "Create account" : "Login"}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600">
              {isSignup ? "Already have an account?" : "New to HireFit AI?"}{" "}
              <Link href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(safeNextPath(nextPath))}`} className="font-semibold text-zinc-950 underline decoration-brand-green decoration-2 underline-offset-4">
                {isSignup ? "Login" : "Sign up"}
              </Link>
            </p>
            <p className="mt-4 text-center text-[11px] leading-5 text-zinc-500">Mock authentication only. No credentials are sent to a server.</p>
          </motion.section>
        </div>
      </div>
    </main>
  )
}
