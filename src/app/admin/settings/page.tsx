"use client"

import Link from "next/link"
import {
  ArrowRight,
  BookOpenCheck,
  Database,
  ExternalLink,
  KeyRound,
  ShieldCheck,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/auth-provider"

function SetupStep({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
        {step}
      </span>
      <div className="min-w-0 text-sm leading-6 text-muted-foreground">{children}</div>
    </li>
  )
}

export default function AdminSettingsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AdminPageHeader
        title="Admin Settings"
        description="Account details, admin provisioning, and console preferences."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green/10">
              <KeyRound className="h-5 w-5 text-brand-green" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="font-headline">Signed-in Admin</CardTitle>
              <CardDescription>The account currently using this console.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3.5">
                <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Name</p>
                <p className="mt-1 truncate text-sm font-medium">{user?.name ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3.5">
                <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Email</p>
                <p className="mt-1 truncate text-sm font-medium">{user?.email ?? "—"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3.5">
              <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">User ID (uid)</p>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{user?.uid ?? "—"}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Needed to provision new admins — find it here or in Firebase Console → Authentication.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge className="gap-1 border-brand-green/40 bg-brand-green/10 text-brand-green">
                <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                Admin access active
              </Badge>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                User settings
                <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
              <BookOpenCheck className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="font-headline">Provisioning the first admin</CardTitle>
              <CardDescription>Admin access is granted in the database, never in the app code.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-4">
              <SetupStep step={1}>
                Open <span className="font-medium text-foreground">Firebase Console</span> and select the{" "}
                <span className="font-medium text-foreground">hirefit-ai</span> project.
              </SetupStep>
              <SetupStep step={2}>
                Go to <span className="font-medium text-foreground">Firestore Database</span> and start a new collection
                named <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">roles</code>.
              </SetupStep>
              <SetupStep step={3}>
                Create a document whose <span className="font-medium text-foreground">ID is the user&apos;s uid</span> (from the
                Authentication page or the panel above) with fields:{" "}
                <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">role = &quot;admin&quot;</code>,{" "}
                <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">updatedBy = &quot;console&quot;</code>, and
                <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground"> updatedAt</code> (number, e.g. <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">Date.now()</code>).
              </SetupStep>
              <SetupStep step={4}>
                Deploy the updated <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground">firestore.rules</code>{" "}
                (<span className="font-medium text-foreground">firebase deploy --only firestore:rules</span>), then refresh the app. The
                account now has admin access — no code changes needed.
              </SetupStep>
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <Database className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="font-headline">Console Preferences</CardTitle>
            <CardDescription>Appearance settings for the admin console.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Switch between dark and light mode. Applies across the whole app and is remembered on this device.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
            <ExternalLink className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="font-headline">Data & Security Notes</CardTitle>
            <CardDescription>How the admin console stays safe.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <li>
              • Role changes are written to <code className="rounded bg-foreground/5 px-1.5 py-0.5 font-mono text-xs">roles/{"{uid}"}</code>{" "}
              and enforced by Firestore security rules — a normal user cannot write to that collection from any client.
            </li>
            <li>
              • Analysis records are created by the owning user and readable only by the owner and admins.
            </li>
            <li>
              • You cannot change your own role from the Users page, so an admin can&apos;t accidentally lock themselves out.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
