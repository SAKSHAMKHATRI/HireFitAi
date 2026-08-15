"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { useState, type FormEvent } from "react"
import { LandingSections } from "@/components/LandingSections"
import { useAuth } from "@/components/auth/auth-provider"

const videoUrl =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260603_132049_036591b8-6e92-4760-b94c-a7ea6eef315c.mp4"

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="absolute inset-0 m-auto h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M5 10h9" strokeLinecap="round" />
      <path d="m10.5 5.5 4.5 4.5-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EyePill() {
  return (
    <span className="mx-2 mb-1 h-[16px] w-[28px] border-[2px] border-[#1a1a1a] rounded-full inline-flex items-center justify-center align-middle md:h-[24px] md:w-[42px] lg:h-[30px] lg:w-[62px]">
      <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
    </span>
  )
}

function InsightCard({ title, value, className, delay }: { title: string; value: string; className: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
      transition={{ opacity: { duration: 0.7, delay }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay } }}
      className={`absolute z-20 rounded-2xl border border-white/70 bg-white/65 p-4 shadow-[0_24px_70px_rgba(22,28,45,0.18)] backdrop-blur-2xl ${className}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">{title}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-zinc-950">{value}</p>
    </motion.div>
  )
}

export function Hero() {
  const router = useRouter()
  const { isAuthenticated, requireAuth } = useAuth()
  const [question, setQuestion] = useState("")
  const dashboardHref = isAuthenticated ? "/dashboard" : "/login?next=%2Fdashboard"

  const askAssistant = (event?: FormEvent) => {
    event?.preventDefault()
    const questionText = question.trim()
    if (!questionText) return
    const href = `/coach?q=${encodeURIComponent(questionText)}`
    if (isAuthenticated) {
      router.push(href)
    } else {
      requireAuth(href)
    }
  }

  return (
    <>
      <section className="relative min-h-[110vh] sm:min-h-[140vh] w-full flex flex-col items-center justify-start overflow-hidden bg-bg-base">
        <div className="absolute top-[15vh] sm:top-[20vh] left-0 w-full h-[95vh] sm:h-[120vh] z-0 pointer-events-none">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-100">
            <source src={videoUrl} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,238,245,0.08)_35%,rgba(237,238,245,0.92)_100%)]" />
          <div className="absolute top-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-b from-bg-base to-transparent" />
          <InsightCard title="ATS Score" value="92%" className="left-[7%] top-[48%] hidden w-44 md:block" delay={0.4} />
          <InsightCard title="Resume Match" value="87%" className="right-[8%] top-[40%] hidden w-48 md:block" delay={0.55} />
          <InsightCard title="Interview Ready" value="91%" className="left-[8%] top-[70%] w-44" delay={0.7} />
          <InsightCard title="AI Suggestions" value="24 Improvements" className="right-[7%] top-[72%] w-52" delay={0.85} />
        </div>

        <div className="max-w-7xl w-full mx-auto px-8 md:px-16 lg:px-20 relative z-10 grid grid-cols-12 gap-x-4 md:gap-x-8 pt-36 md:pt-44">
          <div className="col-span-12 md:col-span-10 md:col-start-2">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-display text-[2.75rem] leading-[0.98] tracking-normal sm:text-[4.8rem] lg:text-[6.25rem]"
            >
              <span className="text-[#1a1a1a]">Land Your Dream Job</span>
              <br />
              <span className="text-[#8e8e8e]">with <EyePill /> AI-powered resume analysis,</span>
              <br />
              <span className="text-[#8e8e8e]">ATS optimization, interview coaching,</span>
              <br />
              <span className="text-[#8e8e8e]">and personalized career guidance.</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative z-30 mt-8 flex max-w-4xl flex-col gap-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Link href={dashboardHref} className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(106,154,0,0.35)] transition-transform hover:-translate-y-0.5">
                  Analyze Resume →
                </Link>
                <span className="w-full text-sm font-medium text-zinc-700 sm:w-auto">✓ No Credit Card Required</span>
              </div>

              <form
                onSubmit={askAssistant}
                className="bg-white rounded-[6px] border border-black/[0.05] p-1 pl-4 flex items-center shadow-sm w-full max-w-xl"
              >
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask your career question or upload a resume..."
                  aria-label="Ask your career question"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!question.trim()}
                  aria-label="Ask the career assistant"
                  className="bg-[#1a1a1a] text-white w-9 h-9 rounded-full relative shrink-0 transition-opacity hover:opacity-85 disabled:opacity-40"
                >
                  <ArrowIcon />
                </button>
              </form>
              <p className="text-xs text-zinc-500">
                Your question opens the HireFit Career Coach, which answers only from your real data.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="absolute right-5 md:right-10 top-[72%] md:top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/55 bg-white/70 px-4 py-2 text-xs font-medium text-zinc-800 shadow-xl shadow-black/5 backdrop-blur-2xl">
          Your AI Career Copilot
        </div>
        <div className="absolute bottom-6 left-8 md:left-12 z-10 text-xs font-medium tracking-wide text-zinc-700">HireFit AI · 2026</div>
        <div className="absolute bottom-6 right-8 md:right-12 z-10 text-xs font-medium tracking-wide text-zinc-700">AI career intelligence</div>
      </section>

      <LandingSections />
    </>
  )
}
