
"use client"

import { MetricCard } from "@/components/dashboard/metric-card"
import { 
  ShieldCheck, 
  BarChart3, 
  Target, 
  Search, 
  Activity, 
  Layers, 
  Cpu, 
  TrendingUp 
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Command Center</h1>
        <p className="text-muted-foreground text-lg">Real-time analysis of your professional profile ecosystem.</p>
      </div>

      <div className="bento-grid">
        <MetricCard
          title="Application Readiness"
          value="84/100"
          description="Across 12 targeted roles"
          icon={ShieldCheck}
          className="col-span-2 lg:col-span-1"
          trend={{ value: "+4.2%", positive: true }}
        />
        <MetricCard
          title="Recruiter Shortlist"
          value="High"
          description="Top 12% of applicants"
          icon={Target}
          trend={{ value: "Steady", positive: true }}
        />
        <MetricCard
          title="Keyword Coverage"
          value="92%"
          description="Industry alignment score"
          icon={Search}
          trend={{ value: "+12%", positive: true }}
        />
        <MetricCard
          title="Achievement Strength"
          value="7.8/10"
          description="Contextual impact score"
          icon={Activity}
          trend={{ value: "-0.5%", positive: false }}
        />

        <Card className="col-span-2 lg:col-span-3 glass-card">
          <CardHeader>
            <CardTitle className="font-headline">Resume Health Dashboard</CardTitle>
            <CardDescription>Visualizing your core performance metrics across industry cohorts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground uppercase font-headline tracking-widest text-xs">ATS Compatibility</span>
                    <span className="font-bold">96%</span>
                  </div>
                  <Progress value={96} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground uppercase font-headline tracking-widest text-xs">Technical Alignment</span>
                    <span className="font-bold">78%</span>
                  </div>
                  <Progress value={78} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground uppercase font-headline tracking-widest text-xs">Soft Skill Variance</span>
                    <span className="font-bold">88%</span>
                  </div>
                  <Progress value={88} className="h-1.5" />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 border rounded-xl border-white/5 bg-white/[0.02]">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1} />
                <p className="text-center text-sm text-muted-foreground">
                  You are performing <span className="text-white font-bold">18% better</span> than candidates in the <span className="underline decoration-muted-foreground/30">Software Engineering</span> cohort this month.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1 glass-card">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <button className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/[0.05] transition-all text-sm text-left group">
              <Cpu className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Run H.I.R.E. Scan</p>
                <p className="text-xs text-muted-foreground">Detailed match analysis</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/[0.05] transition-all text-sm text-left group">
              <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Optimize Bullets</p>
                <p className="text-xs text-muted-foreground">Refine your achievements</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/[0.05] transition-all text-sm text-left group">
              <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Version Compare</p>
                <p className="text-xs text-muted-foreground">Track score improvements</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
