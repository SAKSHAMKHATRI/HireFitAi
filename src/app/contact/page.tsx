"use client"

import { useState, type FormEvent } from "react"
import { Mail, MessageSquareText, Send } from "lucide-react"
import { PublicPageLayout } from "@/components/public-page-layout"

const supportEmail = "support@hirefit.ai"

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const subject = encodeURIComponent(`HireFit AI support request from ${name.trim() || "a visitor"}`)
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <PublicPageLayout
      eyebrow="Contact"
      title="We'd love to hear from you."
      intro="Questions about your results, feature ideas, or anything else — reach out and a real person will get back to you."
    >
      <div className="rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl sm:p-9">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-brand-green">
            <MessageSquareText className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <h2 className="font-display text-2xl font-semibold text-zinc-950">Send us a message</h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-800">
              Your name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-800">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-zinc-800">
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              rows={5}
              className="mt-2 w-full resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-black/30 focus:ring-2 focus:ring-brand-green/40"
            />
          </label>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 sm:w-auto sm:px-8"
          >
            <Send className="h-4 w-4" />
            Send message
          </button>
          {sent ? (
            <p className="rounded-xl border border-brand-green/40 bg-brand-green/10 p-3 text-xs text-zinc-800">
              Your email app should have opened with your message ready to send. You can also write to us directly at {supportEmail}.
            </p>
          ) : null}
        </form>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/70 bg-white/55 p-7 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-brand-green">
            <Mail className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <h2 className="font-display text-2xl font-semibold text-zinc-950">Direct email</h2>
        </div>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Prefer email? Write to{" "}
          <a href={`mailto:${supportEmail}`} className="font-semibold text-zinc-950 underline decoration-brand-green decoration-2 underline-offset-4">
            {supportEmail}
          </a>
          . We typically reply within one business day.
        </p>
      </div>
    </PublicPageLayout>
  )
}
