"use client"

import Link from "next/link"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { computeTrendSeries, type AnalyticsEvent } from "@/lib/analytics"

const chartConfig = {
  readiness: { label: "Readiness", color: "var(--color-brand-green)" },
  resume: { label: "Resume Score", color: "#38bdf8" },
  interview: { label: "Interview Score", color: "#a78bfa" },
} satisfies ChartConfig

export function PerformanceTrends({ events }: { events: AnalyticsEvent[] }) {
  const series = computeTrendSeries(events).filter(
    (point) => point.readiness !== null || point.resume !== null || point.interview !== null
  )

  return (
    <Card className="glass-card h-full">
      <CardHeader>
        <CardTitle className="text-sm font-headline tracking-widest uppercase">Performance Trends</CardTitle>
        <CardDescription>Resume score, interview score, and overall readiness across your module runs.</CardDescription>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-foreground/[0.03]">
              <BarChart3 className="h-7 w-7 text-muted-foreground/50" strokeWidth={1} />
            </div>
            <h3 className="mt-4 font-headline text-base font-medium">No trends to chart yet</h3>
            <p className="mt-1.5 max-w-[38ch] text-sm leading-6 text-muted-foreground">
              Complete a Resume Analysis, Job Match, or AI Interview and your scores will be tracked here over time.
            </p>
            <Link href="/analyzer" className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10">
              Run Resume Analyzer
            </Link>
          </div>
        ) : (
          <div className="h-[280px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart data={series} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillReadiness" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-readiness)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-readiness)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillResume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-resume)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-resume)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillInterview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-interview)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-interview)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}`} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area dataKey="readiness" type="monotone" stroke="var(--color-readiness)" strokeWidth={2} fill="url(#fillReadiness)" connectNulls />
                <Area dataKey="resume" type="monotone" stroke="var(--color-resume)" strokeWidth={1.5} fill="url(#fillResume)" connectNulls />
                <Area dataKey="interview" type="monotone" stroke="var(--color-interview)" strokeWidth={1.5} fill="url(#fillInterview)" connectNulls />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
