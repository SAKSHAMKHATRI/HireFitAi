import { type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
}: {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  loading?: boolean
}) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-headline uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-20" />
            {description ? <Skeleton className="mt-2 h-3 w-32" /> : null}
          </>
        ) : (
          <>
            <div className="text-3xl font-headline font-bold tabular-nums">{value}</div>
            {description ? (
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
