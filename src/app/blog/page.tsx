import Link from "next/link"
import { PublicPageLayout } from "@/components/public-page-layout"

const modules = [
  "Resume Analyzer",
  "AI Match",
  "H.I.R.E Evaluator",
  "Recruiter Mode",
  "Bullet Optimizer",
  "AI Interview",
  "Career Roadmap",
  "Career Coach",
  "Cover Letter Generator",
  "Analytics Dashboard",
]

export default function BlogPage() {
  return (
    <PublicPageLayout
      eyebrow="Blog"
      title="Product updates, built in the open."
      intro="HireFit AI publishes its progress here. No hype, no fabricated numbers — just what is actually in the product."
    >
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">Latest update</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-600">
            The analytics-driven Command Center is the newest addition to the suite. It compiles your real module results —
            readiness, keyword coverage, achievement strength, and recruiter shortlist — into one dashboard.
          </p>
          <Link
            href="/version-history"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Read the full Product Updates →
          </Link>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">What&apos;s live today</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-zinc-600 sm:grid-cols-2">
            {modules.map((module) => (
              <li key={module} className="flex gap-2">
                <span className="font-semibold text-zinc-950">{module}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PublicPageLayout>
  )
}
