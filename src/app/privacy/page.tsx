import { PublicPageLayout } from "@/components/public-page-layout"

export default function PrivacyPage() {
  return (
    <PublicPageLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Last updated: August 2026. HireFit AI is built to be honest about your data — here is exactly what happens with it."
    >
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">1. What stays on your device</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Your analytics, profile, settings, cover letters, coach conversations, and interview progress are stored locally in
            your browser&apos;s localStorage. There is no HireFit AI server database — nothing on this list is transmitted to us.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">2. What is processed by Gemini</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            When you run a module (resume analysis, job match, interview, roadmap, coach, cover letter), the content you provide —
            such as your resume text and job description — is sent to Google&apos;s Gemini API to generate results. This processing
            is governed by Google&apos;s terms and privacy policy. We do not store these inputs on any HireFit server.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">3. Authentication</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Sign-in is mock authentication: your name and email are stored only in your browser to personalize the experience.
            No credentials are sent to a server, and there is no password storage.
          </p>
        </section>

        <section id="security" className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">4. Security</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Because your data lives in your own browser, there is no central database to breach. Clear your browser storage or use
            Settings → Data → Clear local data to erase everything on this device at any time. If you believe a security issue has
            been found, contact us at security@hirefit.ai.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">5. Contact</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Privacy questions? Reach us at privacy@hirefit.ai and we&apos;ll respond within one business day.
          </p>
        </section>
      </div>
    </PublicPageLayout>
  )
}
