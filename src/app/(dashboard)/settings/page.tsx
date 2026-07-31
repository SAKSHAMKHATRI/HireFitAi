import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Settings</h1>
        <p className="text-muted-foreground text-lg">Personalization and workspace preferences.</p>
      </div>

      <Card className="glass-card max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">Coming Soon</CardTitle>
          <CardDescription>Settings controls will be available in a future update.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Your current dashboard and AI tools remain available from the sidebar.</p>
        </CardContent>
      </Card>
    </div>
  )
}
