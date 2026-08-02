import Link from "next/link"
import { PublicPageLayout } from "@/components/public-page-layout"

export default function AboutPage() {
  return (
    <PublicPageLayout
      eyebrow="About"
      title="HireFit AI is your AI career copilot."
      intro="We built one focused workspace for the decisions between finding a role and signing the offer — resume intelligence, ATS guidance, and interview preparation."
    >
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">What we do</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-600">
            <p>
              Hiring is noisy. Applicants are filtered out for reasons they never see, and most advice is generic. HireFit AI
              replaces guesswork with a clear sequence: analyze your resume, match it against real job requirements, practice
              interviews, and build a roadmap to your target career.
            </p>
            <p>
              Every module is powered by Gemini and follows one hard rule: <strong className="font-semibold text-zinc-950">never fabricate</strong>.
              Scores, skills, and recommendations are grounded strictly in the content you provide.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">The intelligence suite</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-zinc-600 sm:grid-cols-2">
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">Resume Analyzer</span> — Gemini ATS analysis of your PDF.</li>
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">AI Match</span> — resume-to-job compatibility with keyword coverage.</li>
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">H.I.R.E Evaluator</span> — deep match reasoning against a role.</li>
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">Bullet Optimizer</span> — passive lines into measurable achievements.</li>
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">AI Interview</span> — realistic mock interviews with full reports.</li>
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">Career Roadmap</span> — a structured plan from here to hired.</li>
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">Career Coach</span> — a mentor grounded in your real data.</li>
            <li className="flex gap-2"><span className="font-semibold text-zinc-950">Cover Letter</span> — tailored letters with a quality check.</li>
          </ul>
        </div>

        <div id="careers" className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">Careers</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-600">
            We&apos;re a small team obsessed with making job seeking fairer and faster. If you care about AI, careers, and
            thoughtful product work, we&apos;d love to hear from you.
          </p>
          <Link
            href="mailto:careers@hirefit.ai?subject=HireFit%20AI%20careers"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            careers@hirefit.ai →
          </Link>
        </div>
      </section>
    </PublicPageLayout>
  )
}
