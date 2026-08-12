import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/lib/firebase-firestore"

export function RoleBadge({ role }: { role: UserRole }) {
  if (role === "admin") {
    return (
      <Badge className="gap-1 border-brand-green/40 bg-brand-green/10 text-brand-green">
        Admin
      </Badge>
    )
  }
  return <Badge variant="outline" className="text-muted-foreground">User</Badge>
}
