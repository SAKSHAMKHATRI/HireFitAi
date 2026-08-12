"use client"

import Link from "next/link"
import { CheckCircle2, Circle, Flag, Rocket } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  computeCareerProgress,
  computeMilestones,
  type AnalyticsEvent,
} from "@/lib/analytics"

export function CareerProgress({ events }: { events: AnalyticsEvent[] }) {
  const progress = computeCareerProgress(events)
  const milestones = computeMilestones(events)
  const ringCircumference = 2 * Math.PI * 52
  const ringOffset = ringCircumference - (ringCircumference * progress.completionPct) / 100
  const reachedMilestones = milestones.filter((milestone) => milestone.reached).length

  return (
    <Card className="glass-card h-full">
      <CardHeader>
        <CardTitle className="text-sm font-headline tracking-widest uppercase">Career Progress</CardTitle>
        <CardDescription>Your journey across the HireFit intelligence suite.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-5">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90">
              <circle cx="56" cy="56" r="52" stroke="currentColor" strokeWidth="9" fill="transparent" className="text-foreground/5" />
              <circle
                cx="56"
                cy="56"
                r="52"
                stroke="currentColor"
                strokeWidth="9"
                fill="transparent"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                className="text-primary transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-headline font-bold">{progress.completionPct}%</span>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Complete</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {progress.completedModules} of {progress.totalModules} modules engaged
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {reachedMilestones} of {milestones.length} milestones reached
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {progress.modules.map((module) => (
            <Link
              key={module.key}
              href={module.href}
              title={module.label}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
                module.used
                  ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                  : "border-foreground/5 bg-foreground/[0.02] hover:bg-foreground/[0.05]"
              }`}
            >
              {module.used ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.5} />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              )}
              <span className={`truncate text-[11px] font-medium ${module.used ? "text-primary" : "text-muted-foreground"}`}>
                {module.shortLabel}
              </span>
            </Link>
          ))}
        </div>

        {progress.completedModules === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-6 text-center">
            <Rocket className="h-6 w-6 text-muted-foreground/50" strokeWidth={1} />
            <p className="mt-2.5 max-w-[26ch] text-sm leading-6 text-muted-foreground">
              Run any HireFit module to start tracking your career progress.
            </p>
            <Link href="/analyzer" className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10">
              Start with Resume Analyzer
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-headline uppercase tracking-widest text-muted-foreground">
              <Flag className="h-3 w-3" strokeWidth={1.5} />
              Milestones Reached
            </p>
            <div className="grid gap-1.5">
              {milestones.map((milestone) => (
                <div key={milestone.key} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${milestone.reached ? "bg-foreground/[0.03]" : ""}`}>
                  {milestone.reached ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" strokeWidth={1.5} />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" strokeWidth={1.5} />
                  )}
                  <span className={`text-xs ${milestone.reached ? "text-foreground" : "text-muted-foreground/60"}`}>
                    {milestone.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
