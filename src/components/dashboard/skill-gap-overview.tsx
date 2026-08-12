"use client"

import Link from "next/link"
import { ArrowRight, Gauge, ListChecks, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { computeSkillGap, type AnalyticsEvent } from "@/lib/analytics"

export function SkillGapOverview({ events }: { events: AnalyticsEvent[] }) {
  const gap = computeSkillGap(events)

  return (
    <Card className="glass-card h-full">
      <CardHeader>
        <CardTitle className="text-sm font-headline tracking-widest uppercase">Skill Gap Overview</CardTitle>
        <CardDescription>Missing skills, priority targets, and learning progress from your module results.</CardDescription>
      </CardHeader>
      <CardContent>
        {!gap ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-foreground/[0.03]">
              <Gauge className="h-7 w-7 text-muted-foreground/50" strokeWidth={1} />
            </div>
            <h3 className="mt-4 font-headline text-base font-medium">No skill gap data yet</h3>
            <p className="mt-1.5 max-w-[38ch] text-sm leading-6 text-muted-foreground">
              Run AI Match to surface missing keywords, or generate a Career Roadmap for a structured skill plan.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link href="/match" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                Run AI Match
              </Link>
              <Link href="/roadmap" className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground">
                Generate Roadmap
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {gap.prioritySkills.length > 0 ? (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[10px] font-headline uppercase tracking-widest text-muted-foreground">
                  <Target className="h-3 w-3" strokeWidth={1.5} />
                  Priority Skills
                </p>
                <div className="grid gap-3">
                  {gap.prioritySkills.map((item) => (
                    <div key={item.skill} className="rounded-xl border border-foreground/5 bg-foreground/[0.03] p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{item.skill}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.currentLevel}% → {item.requiredLevel}%
                        </span>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">Now</span>
                          <Progress value={item.currentLevel} className="h-1 bg-foreground/5 [&>div]:bg-muted-foreground/60" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-7 shrink-0 text-[9px] uppercase tracking-wider text-primary">Goal</span>
                          <Progress value={item.requiredLevel} className="h-1 bg-foreground/5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {gap.missingSkills.length > 0 ? (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-[10px] font-headline uppercase tracking-widest text-muted-foreground">
                  <ListChecks className="h-3 w-3" strokeWidth={1.5} />
                  Top Missing Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {gap.missingSkills.map((skill) => (
                    <span key={skill} className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-2.5 py-1 text-xs text-yellow-400">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {gap.learningProgress !== null ? (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[10px] font-headline uppercase tracking-widest text-muted-foreground">
                  <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                  Learning Progress
                </p>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Toward roadmap targets</p>
                    <span className="shrink-0 font-headline text-sm font-bold text-primary">{gap.learningProgress}%</span>
                  </div>
                  <Progress value={gap.learningProgress} className="mt-2.5 h-1.5 bg-foreground/5" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
