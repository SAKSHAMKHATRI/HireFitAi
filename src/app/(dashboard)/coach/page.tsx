"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  BrainCircuit,
  Check,
  ClipboardCopy,
  Compass,
  FileText,
  GraduationCap,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic2,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  User,
  Wand2,
} from "lucide-react"

import {
  careerCoachChat,
  type ChatMessage as FlowChatMessage,
  type ModuleContext,
} from "@/ai/flows/career-coach-chat"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { friendlyErrorMessage, withTimeout } from "@/lib/resume-upload"

const chatTimeoutMs = 120000
const historyStorageKey = "hirefit_coach_history"
const maxHistoryToSend = 20

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const suggestedPrompts = [
  "Which skill should I learn next?",
  "Am I ready for internships?",
  "Which projects should I build?",
  "Should I learn React or Next.js first?",
  "Should I focus on DSA or Development?",
  "How can I improve my resume?",
  "What companies should I target?",
]

const quickActions = [
  { label: "Improve my resume", prompt: "How can I improve my resume?", icon: FileText },
  { label: "Suggest projects", prompt: "Which projects should I build next?", icon: BookOpen },
  { label: "Create study plan", prompt: "Create a study plan for me.", icon: Wand2 },
  { label: "Interview tips", prompt: "Give me interview tips.", icon: Mic2 },
  { label: "Career advice", prompt: "Give me honest career advice.", icon: Compass },
]

const contextSources: { key: keyof ModuleContext; label: string; hint: string; icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { key: "resumeAnalysis", label: "Resume Analysis", hint: "Run the Resume Analyzer", icon: FileText },
  { key: "jobMatch", label: "Job Match", hint: "Run the Job Match engine", icon: Target },
  { key: "careerRoadmap", label: "Career Roadmap", hint: "Generate a Career Roadmap", icon: GraduationCap },
  { key: "interviewFeedback", label: "Interview Feedback", hint: "Complete an AI Interview", icon: Mic2 },
]

function loadSmartContext(): ModuleContext {
  if (typeof window === "undefined") return {}
  const context: ModuleContext = {}
  try {
    // Interview progress is the only module data currently persisted locally.
    const raw = window.localStorage.getItem("hirefit_interview_progress")
    if (raw) {
      const parsed = JSON.parse(raw) as {
        setup?: { targetRole?: string; experienceLevel?: string; interviewType?: string }
        questions?: { question: string }[]
        answers?: string[]
      }
      if (parsed?.setup?.targetRole) {
        const answered = (parsed.answers ?? []).filter((a) => a && a.trim().length > 0).length
        context.interviewFeedback = `Mock interview for ${parsed.setup.targetRole} (${parsed.setup.experienceLevel ?? "unknown level"}, ${parsed.setup.interviewType ?? "mixed"}) with ${parsed.questions?.length ?? 0} questions, ${answered} answered so far. No scored feedback yet — the report is generated only after submission.`
      }
    }
  } catch {
    // ignore storage failures
  }
  return context
}

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(historyStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
  } catch {
    return []
  }
}

function saveHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(historyStorageKey, JSON.stringify(messages.slice(-60)))
  } catch {
    // ignore storage failures
  }
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-label="Coach is typing">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${dot * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast({ title: "Copied", description: `${label} copied to your clipboard.` }))
    .catch(() => toast({ title: "Could not copy", description: "Your browser blocked clipboard access.", variant: "destructive" }))
}

function MarkdownBlock({ content }: { content: string }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopyCode = (code: string) => {
    copyToClipboard(code, "Code block")
    setCopiedCode(code)
    window.setTimeout(() => setCopiedCode(null), 1500)
  }

  return (
    <div className="space-y-3 text-sm leading-7 text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-4 mb-2 font-headline text-lg font-semibold text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-4 mb-2 font-headline text-base font-semibold text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 mb-1.5 font-headline text-sm font-semibold text-foreground">{children}</h3>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
              {children}
            </a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-") || String(children).includes("\n")
            if (!isBlock) {
              return (
                <code className="rounded-md bg-white/10 border border-white/10 px-1.5 py-0.5 font-mono text-[12.5px] text-primary">
                  {children}
                </code>
              )
            }
            const code = String(children).replace(/\n$/, "")
            return (
              <div className="group relative my-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {className?.match(/language-(\w+)/)?.[1] ?? "code"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(code)}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    {copiedCode === code ? <Check className="h-3 w-3 text-green-500" /> : <ClipboardCopy className="h-3 w-3" />}
                    {copiedCode === code ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-x-auto p-3.5 font-mono text-[12.5px] leading-relaxed text-zinc-100">
                  <code>{code}</code>
                </pre>
              </div>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-4 text-muted-foreground italic">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function CareerCoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [smartContext, setSmartContext] = useState<ModuleContext>({})
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load saved conversation + smart context after mount to avoid hydration mismatches.
  useEffect(() => {
    setMessages(loadHistory())
    setSmartContext(loadSmartContext())
    setHistoryLoaded(true)
  }, [])

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (!historyLoaded) return
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
  }, [messages, isLoading, historyLoaded])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return
      setInput("")
      setError("")
      const userMessage: ChatMessage = { role: "user", content: trimmed }
      setMessages([...messages, userMessage])
      setIsLoading(true)
      window.requestAnimationFrame(() => textareaRef.current?.focus())
      try {
        const history: FlowChatMessage[] = messages.slice(-maxHistoryToSend).map((m) => ({ role: m.role, content: m.content }))
        const output = await withTimeout(
          careerCoachChat({
            message: trimmed,
            history,
            context: smartContext,
          }),
          chatTimeoutMs,
          "The Career Coach took too long to respond. Please try again."
        )
        setMessages((current) => [...current, { role: "assistant", content: output.reply }])
      } catch (sendError) {
        setError(friendlyErrorMessage(sendError, "The Career Coach could not respond. Please try again."))
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, smartContext]
  )

  const regenerate = useCallback(async () => {
    if (isLoading) return
    // Regenerate the reply to the LAST user question. If the conversation ends
    // with a user message (e.g. a failed send), there is nothing to regenerate yet.
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user")
    if (lastUserIndex < 0 || lastUserIndex === messages.length - 1) return
    const lastUser = messages[lastUserIndex]
    const prior = messages.slice(0, lastUserIndex)
    setMessages(prior)
    setError("")
    setIsLoading(true)
    try {
      const history: FlowChatMessage[] = prior.slice(-maxHistoryToSend).map((m) => ({ role: m.role, content: m.content }))
      const output = await withTimeout(
        careerCoachChat({
          message: lastUser.content,
          history,
          context: smartContext,
        }),
        chatTimeoutMs,
        "The Career Coach took too long to respond. Please try again."
      )
      setMessages((current) => [...current, { role: "assistant", content: output.reply }])
    } catch (regenerateError) {
      setError(friendlyErrorMessage(regenerateError, "Could not regenerate the answer. Please try again."))
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, smartContext])

  const clearChat = () => {
    setMessages([])
    saveHistory([])
    toast({ title: "Conversation cleared", description: "Started a fresh conversation with your Career Coach." })
  }

  // Persist conversation once the initial load has settled.
  useEffect(() => {
    if (historyLoaded) saveHistory(messages)
  }, [messages, historyLoaded])

  const availableContextCount = useMemo(
    () => contextSources.filter((source) => Boolean(smartContext[source.key])).length,
    [smartContext]
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Career Coach</h1>
        <p className="text-muted-foreground text-lg">Your personal AI mentor. Ask anything about skills, projects, resumes, interviews, or your career path.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Chat column */}
        <div className="space-y-4 xl:col-span-9">
          <Card className="glass-card">
            <CardContent className="flex flex-col gap-0 p-0">
              {/* Chat header */}
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10">
                    <BrainCircuit className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-headline text-sm font-semibold">HireFit Career Coach</p>
                    <p className="text-xs text-muted-foreground">
                      {isLoading ? "Thinking as your mentor..." : "Online · ready to help"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    Gemini 2.5 Flash
                  </Badge>
                  <Button type="button" variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0 || isLoading} className="border-white/10 hover:bg-white/5">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex h-[520px] flex-col gap-5 overflow-y-auto px-5 py-5 lg:h-[560px]">
                {!historyLoaded ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 && !isLoading ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10">
                      <Sparkles className="h-8 w-8 text-primary" strokeWidth={1} />
                    </div>
                    <div className="max-w-md">
                      <h3 className="font-headline text-xl font-medium">Ask me anything about your career</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        I'll ground my advice in your HireFit data when it's available — and tell you honestly when it isn't.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {suggestedPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          disabled={isLoading}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const isUser = message.role === "user"
                      return (
                        <div key={`${index}-${message.role}`} className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                            {isUser ? (
                              <AvatarFallback className="bg-secondary text-xs font-bold text-muted-foreground">
                                <User className="h-4 w-4" strokeWidth={1.5} />
                              </AvatarFallback>
                            ) : (
                              <AvatarFallback className="bg-primary/15 text-primary">
                                <BrainCircuit className="h-4 w-4" strokeWidth={1.5} />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className={`flex max-w-[85%] flex-col gap-1.5 sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isUser
                                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                                  : "rounded-tl-sm border border-white/10 bg-white/[0.04]"
                              }`}
                            >
                              {isUser ? (
                                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                              ) : (
                                <MarkdownBlock content={message.content} />
                              )}
                            </div>
                            {!isUser ? (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(message.content, "Answer")}
                                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-all hover:bg-white/10 hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                                aria-label="Copy answer"
                              >
                                <ClipboardCopy className="h-3 w-3" />
                                Copy
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}

                    {isLoading ? (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                          <AvatarFallback className="bg-primary/15 text-primary">
                            <BrainCircuit className="h-4 w-4" strokeWidth={1.5} />
                          </AvatarFallback>
                        </Avatar>
                        <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-4 py-2.5">
                          <TypingDots />
                        </div>
                      </div>
                    ) : null}

                    {messages.length > 0 && !isLoading ? (
                      <div className="flex justify-center pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={regenerate}
                          disabled={
                            messages.map((m) => m.role).lastIndexOf("assistant") <= 0 ||
                            messages.map((m) => m.role).lastIndexOf("user") < 0 ||
                            messages.map((m) => m.role).lastIndexOf("user") === messages.length - 1
                          }
                          className="border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        >
                          <RefreshCw className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                          Regenerate last answer
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Error banner */}
              {error ? (
                <div className="mx-5 mb-2 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              ) : null}

              {/* Input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex gap-2.5">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        sendMessage(input)
                      }
                    }}
                    placeholder="Ask your mentor anything… (Enter to send, Shift+Enter for a new line)"
                    className="max-h-40 min-h-[52px] flex-1 resize-none bg-background/50 border-white/10 text-sm leading-relaxed"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="h-[52px] w-[52px] shrink-0 rounded-xl font-headline"
                    aria-label="Send message"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2} />}
                  </Button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[10px] uppercase tracking-widest text-muted-foreground">Quick actions</span>
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => sendMessage(action.prompt)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                    >
                      <action.icon className="h-3 w-3" strokeWidth={1.5} />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart context column */}
        <div className="space-y-4 xl:col-span-3">
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-headline text-sm font-semibold uppercase tracking-widest">Smart Context</p>
                <Badge variant="outline" className="border-white/10 text-muted-foreground">
                  {availableContextCount} / {contextSources.length}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                The coach automatically uses your HireFit module results when they're available — and never guesses when they aren't.
              </p>
              <div className="mt-4 space-y-2.5">
                {contextSources.map((source) => {
                  const available = Boolean(smartContext[source.key])
                  return (
                    <div key={source.key} className={`flex items-start gap-2.5 rounded-xl border p-3 ${available ? "border-primary/30 bg-primary/5" : "border-white/5 bg-white/[0.02]"}`}>
                      <source.icon className={`mt-0.5 h-4 w-4 shrink-0 ${available ? "text-primary" : "text-muted-foreground/60"}`} strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${available ? "text-primary" : "text-muted-foreground"}`}>{source.label}</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground/70">
                          {available ? "Available — used in answers" : source.hint}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <p className="font-headline text-sm font-semibold uppercase tracking-widest">Mentor Principles</p>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                <li className="flex gap-2"><MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={1.5} /> Honest, practical, and specific — like a real mentor.</li>
                <li className="flex gap-2"><Target className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={1.5} /> Grounded in your real HireFit data, never fabricated.</li>
                <li className="flex gap-2"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={1.5} /> If a detail is unavailable, I'll tell you exactly what's missing.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
