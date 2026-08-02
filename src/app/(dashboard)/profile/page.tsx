"use client"

import { useEffect, useState } from "react"
import {
  AtSign,
  Briefcase,
  CheckCircle2,
  Github,
  Globe,
  Linkedin,
  MapPin,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/auth-provider"
import { toast } from "@/hooks/use-toast"
import { defaultProfile, loadProfile, saveProfile, type ProfileData } from "@/lib/settings"

export default function ProfilePage() {
  const { user, signIn } = useAuth()
  const [profile, setProfile] = useState<ProfileData>(defaultProfile)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = loadProfile()
    const hasSavedProfile = window.localStorage.getItem("hirefit_profile") !== null
    setProfile(
      hasSavedProfile
        ? saved
        : {
            ...saved,
            name: user?.name ?? "",
            avatar: user?.avatar ?? "",
          }
    )
    setLoaded(true)
  }, [user])

  const update = (patch: Partial<ProfileData>) => {
    setProfile((current) => ({ ...current, ...patch }))
  }

  const handleSave = () => {
    const name = profile.name.trim() || (user?.name ?? "")
    const nextProfile = { ...profile, name }
    saveProfile(nextProfile)
    setProfile(nextProfile)
    if (user) {
      // Keep the sidebar identity in sync with the edited profile.
      signIn({ name, email: user.email, avatar: profile.avatar.trim() || user.avatar })
    }
    toast({ title: "Profile saved", description: "Your profile details were updated on this device." })
  }

  const handleDiscard = () => {
    const saved = loadProfile()
    const hasSavedProfile = window.localStorage.getItem("hirefit_profile") !== null
    setProfile(
      hasSavedProfile
        ? saved
        : {
            ...saved,
            name: user?.name ?? "",
            avatar: user?.avatar ?? "",
          }
    )
    toast({ title: "Changes discarded", description: "Your profile was restored to the last saved state." })
  }

  const initials =
    profile.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G"

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Profile</h1>
        <p className="text-muted-foreground text-lg">Your HireFit AI identity — edit it any time and it saves to this device.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Identity</CardTitle>
              <CardDescription>Shown in the sidebar and on your saved work.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
              <Avatar className="h-24 w-24 rounded-2xl border border-white/10">
                {profile.avatar.trim() ? <AvatarImage src={profile.avatar.trim()} alt={profile.name || "Profile"} /> : null}
                <AvatarFallback className="rounded-2xl bg-primary/10 text-3xl font-bold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-headline text-lg font-semibold">{profile.name || "Your name"}</p>
                <p className="text-sm text-muted-foreground">{profile.headline || "Add a headline"}</p>
                {profile.location.trim() ? (
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" strokeWidth={1.5} />
                    {profile.location}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {profile.linkedin.trim() ? (
                  <a href={profile.linkedin.trim()} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <Linkedin className="h-3.5 w-3.5" strokeWidth={1.5} />
                    LinkedIn
                  </a>
                ) : null}
                {profile.github.trim() ? (
                  <a href={profile.github.trim()} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <Github className="h-3.5 w-3.5" strokeWidth={1.5} />
                    GitHub
                  </a>
                ) : null}
                {profile.website.trim() ? (
                  <a href={profile.website.trim()} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Website
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-7">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-headline tracking-widest uppercase">Edit Profile</CardTitle>
              <CardDescription>Fill in what you&apos;d like — everything stays on this device.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Full name</label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <Input value={profile.name} onChange={(event) => update({ name: event.target.value })} placeholder="e.g. Alex Johnson" className="h-11 border-white/10 bg-background/50 pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Headline</label>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <Input value={profile.headline} onChange={(event) => update({ headline: event.target.value })} placeholder="e.g. Senior Frontend Engineer" className="h-11 border-white/10 bg-background/50 pl-9" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Location</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input value={profile.location} onChange={(event) => update({ location: event.target.value })} placeholder="e.g. San Francisco, CA" className="h-11 border-white/10 bg-background/50 pl-9" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Bio</label>
                <Textarea value={profile.bio} onChange={(event) => update({ bio: event.target.value })} placeholder="A short summary of who you are and what you're looking for." className="min-h-[120px] resize-y border-white/10 bg-background/50 text-sm leading-relaxed" />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">LinkedIn</label>
                  <div className="relative">
                    <Linkedin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <Input value={profile.linkedin} onChange={(event) => update({ linkedin: event.target.value })} placeholder="https://linkedin.com/in/..." className="h-11 border-white/10 bg-background/50 pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">GitHub</label>
                  <div className="relative">
                    <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <Input value={profile.github} onChange={(event) => update({ github: event.target.value })} placeholder="https://github.com/..." className="h-11 border-white/10 bg-background/50 pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Website</label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                    <Input value={profile.website} onChange={(event) => update({ website: event.target.value })} placeholder="https://..." className="h-11 border-white/10 bg-background/50 pl-9" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-headline uppercase tracking-widest text-muted-foreground">Avatar image URL</label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input value={profile.avatar} onChange={(event) => update({ avatar: event.target.value })} placeholder="https://.../avatar.png (optional)" className="h-11 border-white/10 bg-background/50 pl-9" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">Changes save locally and apply immediately.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleDiscard} disabled={!loaded} className="border-white/10 hover:bg-white/5">
                    <RotateCcw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Discard
                  </Button>
                  <Button type="button" size="sm" onClick={handleSave} disabled={!loaded} className="font-headline">
                    <Save className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Save Profile
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                Your profile is stored locally in this browser only — no server database.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
