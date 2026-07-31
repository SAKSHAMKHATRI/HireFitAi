import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotificationsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Notifications</h1>
        <p className="text-muted-foreground text-lg">Updates about resume scans, interviews, and career insights.</p>
      </div>

      <Card className="glass-card max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">Coming Soon</CardTitle>
          <CardDescription>Notification preferences are not live yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">There are no notifications to show right now.</p>
        </CardContent>
      </Card>
    </div>
  )
}
