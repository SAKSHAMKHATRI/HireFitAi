import { PublicPageLayout } from "@/components/public-page-layout"

export default function TermsPage() {
  return (
    <PublicPageLayout
      eyebrow="Legal"
      title="Terms of Service"
      intro="Last updated: August 2026. These terms cover your use of the HireFit AI application."
    >
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">1. The service</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            HireFit AI provides resume analysis, job matching, interview practice, career roadmaps, coaching, and cover letter
            generation. Results are produced by AI (Google Gemini) from the content you provide and are for guidance only.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">2. Your responsibilities</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            You are responsible for the accuracy of the content you provide. Do not upload documents containing personal data of
            other people without their consent. You may use the service for lawful, non-infringing purposes only.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">3. No guarantees</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            AI output can be imperfect. HireFit AI does not guarantee job offers, interview outcomes, or that any score or
            recommendation will produce a specific result. Decisions you make based on the service are your own.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">4. No liability</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            To the maximum extent permitted by law, HireFit AI is provided &quot;as is&quot; without warranties of any kind, and we
            are not liable for indirect or consequential damages arising from your use of the service.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
          <h2 className="font-display text-2xl font-semibold text-zinc-950">5. Changes & contact</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            We may update these terms as the product evolves; the &quot;Last updated&quot; date reflects the latest version. Questions
            about these terms can be sent to legal@hirefit.ai.
          </p>
        </section>
      </div>
    </PublicPageLayout>
  )
}
