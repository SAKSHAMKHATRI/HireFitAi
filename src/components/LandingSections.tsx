"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { useState, type ReactNode } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  FileSearch,
  FileText,
  Gauge,
  MessageSquareText,
  Route,
  ScanSearch,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react"

const reveal = {
  initial: { opacity: 0, y: 30, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-12%" },
  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600 backdrop-blur-xl">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-green ring-2 ring-black/10" />
      {children}
    </div>
  )
}

function SectionHeading({ eyebrow, title, copy, dark = false }: { eyebrow: string; title: string; copy: string; dark?: boolean }) {
  return (
    <motion.div {...reveal} className="max-w-4xl">
      <SectionLabel>{eyebrow}</SectionLabel>
      <h2 className={`font-display text-4xl leading-[1.02] sm:text-6xl lg:text-7xl ${dark ? "text-white" : "text-zinc-950"}`}>{title}</h2>
      <p className={`mt-6 max-w-2xl text-base leading-7 md:text-lg ${dark ? "text-zinc-400" : "text-zinc-600"}`}>{copy}</p>
    </motion.div>
  )
}

const stats = [
  ["98%", "ATS Accuracy"],
  ["50K+", "Resumes Reviewed"],
  ["10K+", "Mock Interviews"],
  ["4.9★", "User Rating"],
]

const logos = ["Google", "Microsoft", "Amazon", "Deloitte", "Accenture"]

function TrustSection() {
  return (
    <section className="relative min-h-[80vh] overflow-hidden border-y border-black/5 bg-white/35 py-28">
      <div className="mx-auto max-w-7xl px-8 md:px-16 lg:px-20">
        <motion.p {...reveal} className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Trusted by ambitious students and professionals
        </motion.p>
      </div>
      <div className="relative mt-16 overflow-hidden border-y border-black/5 py-8">
        <div className="absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#f4f4f8] to-transparent" />
        <div className="absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#f4f4f8] to-transparent" />
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          className="flex w-max items-center"
        >
          {[...logos, ...logos].map((logo, index) => (
            <div key={`${logo}-${index}`} className="flex w-56 items-center justify-center gap-3 font-display text-2xl font-medium text-zinc-400 grayscale">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-xs font-bold text-zinc-700">{logo[0]}</span>
              {logo}
            </div>
          ))}
        </motion.div>
      </div>
      <div className="mx-auto mt-20 grid max-w-7xl grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-white/70 bg-black/5 shadow-[0_35px_100px_rgba(22,28,45,0.08)] md:grid-cols-4">
        {stats.map(([value, label], index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, duration: 0.55 }}
            className="bg-white/65 px-6 py-10 text-center backdrop-blur-xl"
          >
            <p className="font-display text-4xl font-semibold text-zinc-950">{value}</p>
            <p className="mt-2 text-sm text-zinc-500">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

const features = [
  { title: "AI Resume Analyzer", copy: "Turn every line into evidence of impact with role-aware recommendations.", icon: FileSearch },
  { title: "ATS Score Checker", copy: "See how your resume performs before a recruiter or screening system does.", icon: Gauge },
  { title: "AI Interview Coach", copy: "Practice tailored questions and sharpen your answers with instant feedback.", icon: MessageSquareText },
  { title: "Resume Builder", copy: "Create a polished, recruiter-friendly resume with guided AI assistance.", icon: FileText },
  { title: "Career Roadmap", copy: "Move from where you are to where you want to be with a focused action plan.", icon: Route },
  { title: "Skill Gap Analysis", copy: "Identify missing skills and prioritize the learning that improves your odds.", icon: ScanSearch },
]

function FeaturesSection() {
  return (
    <section id="features" className="relative min-h-screen overflow-hidden py-28 md:py-36">
      <div className="absolute left-1/2 top-1/3 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-brand-green/15 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-8 md:px-16 lg:px-20">
        <SectionHeading eyebrow="Career intelligence suite" title="Everything you need to get hired." copy="One thoughtful workspace for the decisions between finding a role and signing the offer." />
        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-8%" }}
              transition={{ duration: 0.6, delay: index * 0.06 }}
              whileHover={{ y: -8 }}
              className="group min-h-64 rounded-[28px] border border-white/80 bg-white/55 p-7 shadow-[0_24px_80px_rgba(22,28,45,0.08)] backdrop-blur-2xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-brand-green shadow-xl transition-transform group-hover:rotate-3 group-hover:scale-105">
                <feature.icon className="h-5 w-5" strokeWidth={1.7} />
              </div>
              <h3 className="mt-10 font-display text-2xl font-semibold text-zinc-950">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{feature.copy}</p>
              <ArrowRight className="mt-7 h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-zinc-950" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

const steps = [
  ["01", "Upload resume", "Bring your current resume or start from a clean AI-assisted draft."],
  ["02", "AI analysis", "HireFit reads role fit, ATS structure, clarity, evidence, and skill coverage."],
  ["03", "Career insights", "Receive a prioritized plan with exact recommendations you can act on."],
  ["04", "Land the role", "Apply with confidence, prepare intelligently, and show up ready."],
]

function HowSection() {
  return (
    <section id="how-it-works" className="relative min-h-screen bg-zinc-950 py-28 text-white md:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(159,255,0,0.14),transparent_28%)]" />
      <div className="relative mx-auto max-w-7xl px-8 md:px-16 lg:px-20">
        <motion.div {...reveal} className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="font-display text-5xl leading-[1.02] sm:text-7xl">From resume to ready.</h2>
          </div>
          <p className="max-w-xl text-lg leading-8 text-zinc-400 lg:col-span-5 lg:col-start-8 lg:pt-20">
            HireFit replaces scattered tools and guesswork with one clear sequence that keeps you moving forward.
          </p>
        </motion.div>
        <div className="mt-20 grid gap-px overflow-hidden rounded-[30px] border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, copy], index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12, duration: 0.65 }}
              className="relative min-h-80 bg-zinc-950 p-7"
            >
              <span className="text-xs tracking-[0.24em] text-brand-green">{number}</span>
              <div className="mt-20 h-px w-full bg-gradient-to-r from-brand-green to-transparent" />
              <h3 className="mt-7 font-display text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              {index < steps.length - 1 ? <ArrowRight className="absolute right-5 top-6 h-4 w-4 text-zinc-600" /> : null}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductPanel({ mode }: { mode: "resume" | "ats" | "interview" }) {
  const config = {
    resume: { label: "Resume health", score: "87", title: "Senior Product Designer", color: "bg-brand-green" },
    ats: { label: "ATS compatibility", score: "92", title: "Match analysis", color: "bg-brand-green" },
    interview: { label: "Interview readiness", score: "91", title: "Practice session", color: "bg-brand-green" },
  }[mode]

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/55 p-4 shadow-[0_36px_100px_rgba(22,28,45,0.14)] backdrop-blur-3xl"
    >
      <div className="rounded-[24px] bg-zinc-950 p-5 text-white md:p-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-brand-green">{config.label}</p>
            <h3 className="mt-2 font-display text-2xl">{config.title}</h3>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-full border border-brand-green/35 bg-brand-green/10 font-display text-2xl text-brand-green">{config.score}</div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[78, 91, 86].map((score, index) => (
            <div key={score} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="h-1.5 rounded-full bg-white/10">
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${score}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: index * 0.1 }} className={`h-full rounded-full ${config.color}`} />
              </div>
              <p className="mt-4 text-xs text-zinc-300">{["Role alignment", "Keyword strength", "Impact clarity"][index]}</p>
              <p className="mt-1 text-lg font-semibold">{score}%</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-center justify-between text-xs"><span>AI recommendation</span><span className="text-brand-green">High impact</span></div>
          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">Add measurable outcomes to your leadership bullets and mirror the target role’s product language.</p>
        </div>
      </div>
    </motion.div>
  )
}

const showcases = [
  { eyebrow: "AI Resume Analysis", title: "Know what recruiters will notice.", copy: "Get a structured review of impact, relevance, clarity, and role alignment before you submit.", mode: "resume" as const },
  { eyebrow: "ATS Score Preview", title: "Optimize for systems without sounding robotic.", copy: "Balance keyword coverage and natural writing with role-specific ATS guidance that explains every recommendation.", mode: "ats" as const },
  { eyebrow: "AI Interview Coach", title: "Practice the questions that matter.", copy: "Generate realistic interviews from your resume and target role, then improve with precise coaching after every answer.", mode: "interview" as const },
]

function ShowcaseSection({ dashboardHref }: { dashboardHref: string }) {
  return (
    <section id="product-showcase" className="relative overflow-hidden py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-8 md:px-16 lg:px-20">
        <SectionHeading eyebrow="Product showcase" title="Your application, seen clearly." copy="Every view is designed to turn complex career signals into one confident next action." />
        <div className="mt-24 space-y-32">
          {showcases.map((item, index) => (
            <div key={item.title} className="grid items-center gap-12 lg:grid-cols-12">
              <motion.div {...reveal} className={`${index % 2 ? "lg:order-2" : ""} lg:col-span-4`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{item.eyebrow}</p>
                <h3 className="mt-5 font-display text-4xl leading-[1.05] text-zinc-950 sm:text-5xl">{item.title}</h3>
                <p className="mt-5 text-base leading-7 text-zinc-600">{item.copy}</p>
                <Link href={dashboardHref} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950">Explore in HireFit <ArrowRight className="h-4 w-4" /></Link>
              </motion.div>
              <div className={`${index % 2 ? "lg:order-1" : ""} lg:col-span-7 ${index % 2 ? "lg:col-start-1" : "lg:col-start-6"}`}>
                <ProductPanel mode={item.mode} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const reasons = [
  ["AI-powered recommendations", BrainCircuit],
  ["ATS optimization", Target],
  ["Interview preparation", Bot],
  ["Career insights", BarChart3],
  ["Resume improvement", WandSparkles],
  ["Recruiter-friendly formatting", FileText],
] as const

function WhySection() {
  return (
    <section className="min-h-screen border-y border-black/5 bg-white/35 py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-8 md:px-16 lg:px-20">
        <SectionHeading eyebrow="Why HireFit AI" title="Intelligence with a point of view." copy="Not another score with no explanation. HireFit shows what matters, why it matters, and how to improve it." />
        <div className="mt-20 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {reasons.map(([title, Icon], index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: index % 2 ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="flex items-center justify-between border-b border-black/10 py-7"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-brand-green"><Icon className="h-4 w-4" /></span>
                <h3 className="font-display text-xl text-zinc-950">{title}</h3>
              </div>
              <Check className="h-5 w-5 text-zinc-400" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const testimonials = [
  { quote: "HireFit showed me why my resume was being filtered out. Two weeks later, I had three interview calls.", name: "Aarav Mehta", role: "Software Engineer" },
  { quote: "The interview coach felt surprisingly real. I walked into my panel with a structure for every answer.", name: "Maya Kapoor", role: "Product Manager" },
  { quote: "I stopped rewriting blindly. The ATS and role-match feedback made every edit intentional.", name: "Riya Shah", role: "Data Analyst" },
]

function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative min-h-screen overflow-hidden bg-zinc-950 py-28 text-white md:py-36">
      <div className="absolute -right-48 top-0 h-96 w-96 rounded-full bg-brand-green/10 blur-[100px]" />
      <div className="relative mx-auto max-w-7xl px-8 md:px-16 lg:px-20">
        <SectionHeading dark eyebrow="Real outcomes" title="Built for the moment opportunity knocks." copy="People use HireFit to replace uncertainty with preparation, and preparation with momentum." />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.figure
              key={item.name}
              initial={{ opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="flex min-h-96 flex-col justify-between rounded-[28px] border border-white/10 bg-white/[0.06] p-7 backdrop-blur-xl"
            >
              <Sparkles className="h-6 w-6 text-brand-green" />
              <blockquote className="mt-12 font-display text-2xl leading-9 text-zinc-100">“{item.quote}”</blockquote>
              <figcaption className="mt-10 border-t border-white/10 pt-5">
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

const faqs = [
  ["Will HireFit change my resume automatically?", "No. HireFit explains recommendations and lets you decide what to apply, so your resume stays authentic to your experience."],
  ["Can I analyze a resume for a specific job?", "Yes. Add the job description to receive role-specific keyword, skill, and experience alignment feedback."],
  ["Does it work for freshers?", "Yes. HireFit adapts its guidance for students, freshers, career switchers, and experienced professionals."],
  ["Is my resume data private?", "Your resume is used to provide the requested analysis. Review the product privacy policy for the exact retention and processing terms."],
  ["Can I practice interviews?", "Yes. The interview coach creates questions from your target role and resume, then gives structured feedback on each response."],
]

function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="relative min-h-screen py-28 md:py-36">
      <div className="mx-auto max-w-7xl px-8 md:px-16 lg:px-20">
        <div className="grid gap-16 lg:grid-cols-12">
          <motion.div {...reveal} className="lg:col-span-4">
            <SectionLabel>FAQ</SectionLabel>
            <h3 className="font-display text-5xl leading-[1.03] text-zinc-950">Questions, answered clearly.</h3>
          </motion.div>
          <div className="lg:col-span-7 lg:col-start-6">
            {faqs.map(([question, answer], index) => (
              <div key={question} className="border-b border-black/10">
                <button type="button" onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 py-6 text-left font-display text-xl text-zinc-950">
                  {question}
                  <motion.span animate={{ rotate: open === index ? 180 : 0 }}><ChevronDown className="h-5 w-5" /></motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === index ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="max-w-2xl pb-6 text-sm leading-7 text-zinc-600">{answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalSection() {
  const { isAuthenticated } = useAuth()
  const dashboardHref = isAuthenticated ? "/dashboard" : "/login?next=%2Fdashboard"

  return (
    <>
      <section id="blog" className="relative mx-4 overflow-hidden rounded-[36px] bg-zinc-950 px-6 py-28 text-white md:mx-8 md:py-36">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green/20 blur-[130px]" />
        <motion.div {...reveal} className="relative mx-auto max-w-5xl text-center">
          <SectionLabel>Your next move</SectionLabel>
          <h2 className="font-display text-5xl leading-[0.98] sm:text-7xl lg:text-8xl">Ready to land your dream job?</h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-400">Bring your resume. HireFit AI will show you the clearest path from application to interview.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href={dashboardHref} className="rounded-full bg-brand-green px-7 py-3.5 text-sm font-semibold text-black">Analyze Resume →</Link>
            <Link href={dashboardHref} className="rounded-full border border-white/15 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-xl">Launch HireFit AI</Link>
          </div>
        </motion.div>
      </section>

      <footer className="px-8 py-16 md:px-16 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-12 border-b border-black/10 pb-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 font-display text-2xl font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-950 text-sm text-brand-green">H</span>HireFit AI</div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-600">Your AI career copilot for stronger resumes, smarter interviews, and faster career growth.</p>
          </div>
          {[
            ["Company", "About", "Careers", "Contact"],
            ["Product", "Features", "AI Coach", "Dashboard"],
            ["Resources", "Blog", "Guides", "Help Center"],
            ["Legal", "Privacy", "Terms", "Security"],
          ].map(([title, ...links]) => (
            <div key={title} className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</p>
              <div className="mt-5 space-y-3">{links.map((link) => <span key={link} className="block text-sm text-zinc-500">{link}</span>)}</div>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 pt-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 HireFit AI. Built for ambitious careers.</p>
          <div className="flex gap-5"><span>LinkedIn</span><span>X</span><span>YouTube</span></div>
        </div>
      </footer>
    </>
  )
}

export function LandingSections() {
  const { isAuthenticated } = useAuth()
  const dashboardHref = isAuthenticated ? "/dashboard" : "/login?next=%2Fdashboard"

  return (
    <div className="bg-bg-base">
      <TrustSection />
      <FeaturesSection />
      <HowSection />
      <ShowcaseSection dashboardHref={dashboardHref} />
      <WhySection />
      <TestimonialsSection />
      <FaqSection />
      <FinalSection />
    </div>
  )
}
