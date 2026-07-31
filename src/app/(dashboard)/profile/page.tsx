"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Profile</h1>
        <p className="text-muted-foreground text-lg">Your HireFit AI account details.</p>
      </div>

      <Card className="glass-card max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-headline tracking-widest uppercase">Account</CardTitle>
          <CardDescription>Profile editing is coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
