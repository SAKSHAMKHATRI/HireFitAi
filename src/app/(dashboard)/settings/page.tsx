"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  Database,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  clearAllLocalData,
  targetRoles,
  experienceLevels,
  coverLetterTones,
  roadmapTimeCommitments,
  type HireFitSettings,
} from "@/lib/settings"

function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<HireFitSettings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setLoaded(true)
  }, [])

  // Keep the reduce-motion preference live on <html>.
  useEffect(() => {
    if (!loaded) return
    document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion)
  }, [settings.reduceMotion, loaded])

  const update = (patch: Partial<HireFitSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      saveSettings(next)
      return next
    })
  }

  const handleClearData = () => {
    if (!confirmingClear) {
      setConfirmingClear(true)
      window.setTimeout(() => setConfirmingClear(false), 4000)
      return
    }
    clearAllLocalData()
    setConfirmingClear(false)
    toast({ title: "Local data cleared", description: "Analytics, profile, and saved module data were removed from this browser." })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Settings</h1>
        <p className="text-muted-foreground text-lg">Personalization and workspace preferences, saved locally on this device.</p>
      </div>

      <Card className="glass-card max-w-3xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <SlidersHorizontal className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="font-headline">Career Defaults</CardTitle>
            <CardDescription>New sessions in your AI tools start from these choices. Change them any time.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Target Role</label>
            <Select value={settings.targetRole} onValueChange={(value) => update({ targetRole: value })}>
              <SelectTrigger className="h-11 border-white/10 bg-background/50 font-headline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetRoles.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used as the default for AI Interview setup.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Experience Level</label>
            <Select value={settings.experienceLevel} onValueChange={(value) => update({ experienceLevel: value })}>
              <SelectTrigger className="h-11 border-white/10 bg-background/50 font-headline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used as the default for AI Interview setup.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Cover Letter Tone</label>
            <Select value={settings.coverLetterTone} onValueChange={(value) => update({ coverLetterTone: value })}>
              <SelectTrigger className="h-11 border-white/10 bg-background/50 font-headline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coverLetterTones.map((tone) => (
                  <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Default tone for new cover letters.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Roadmap Time Commitment</label>
            <Select value={settings.roadmapTimeCommitment} onValueChange={(value) => update({ roadmapTimeCommitment: value })}>
              <SelectTrigger className="h-11 border-white/10 bg-background/50 font-headline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roadmapTimeCommitments.map((commitment) => (
                  <SelectItem key={commitment} value={commitment}>{commitment}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Default time commitment for new roadmaps.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card max-w-3xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="font-headline">Notifications</CardTitle>
            <CardDescription>Choose which updates appear in your notification inbox.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <PreferenceRow
            icon={Sparkles}
            title="Module activity"
            description="Notify me when a module finishes (resume analyzed, job matched, interview completed, etc.)."
          >
            <Switch
              checked={settings.notifyModuleActivity}
              onCheckedChange={(value) => update({ notifyModuleActivity: value })}
              aria-label="Module activity notifications"
            />
          </PreferenceRow>
          <PreferenceRow
            icon={RotateCcw}
            title="Reminders"
            description="Remind me about saved work, like an interview in progress or a saved cover letter."
          >
            <Switch
              checked={settings.notifyReminders}
              onCheckedChange={(value) => update({ notifyReminders: value })}
              aria-label="Reminder notifications"
            />
          </PreferenceRow>
        </CardContent>
      </Card>

      <Card className="glass-card max-w-3xl">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <Palette className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="font-headline">Appearance</CardTitle>
            <CardDescription>Interface preferences applied immediately.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <PreferenceRow
            icon={Palette}
            title="Reduce motion"
            description="Disable animations and transitions across the app for a calmer experience."
          >
            <Switch
              checked={settings.reduceMotion}
              onCheckedChange={(value) => update({ reduceMotion: value })}
              aria-label="Reduce motion"
            />
          </PreferenceRow>
        </CardContent>
      </Card>

      <Card className="glass-card max-w-3xl border-red-500/20">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10">
            <Database className="h-5 w-5 text-red-400" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="font-headline">Data</CardTitle>
            <CardDescription>Everything you generate is stored locally in this browser — nothing leaves your device except the Gemini requests you trigger.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Clear all local data</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Removes analytics, profile, settings, and saved module data from this browser. Your account stays signed in.
              </p>
            </div>
            <Button
              type="button"
              variant={confirmingClear ? "destructive" : "outline"}
              size="sm"
              onClick={handleClearData}
              className={confirmingClear ? "" : "border-white/10 hover:bg-white/5"}
            >
              <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {confirmingClear ? "Click again to confirm" : "Clear local data"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
