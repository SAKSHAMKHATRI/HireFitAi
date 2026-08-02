import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  className?: string
  trend?: {
    value: string
    positive: boolean
  }
  /** When true, renders an actionable empty state instead of the value. */
  empty?: boolean
  actionHref?: string
  actionLabel?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  className,
  trend,
  empty = false,
  actionHref,
  actionLabel,
}: MetricCardProps) {
  return (
    <Card className={cn("glass-card overflow-hidden relative", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-headline uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex flex-col gap-2">
            <div className="text-2xl font-headline font-bold text-muted-foreground/30">—</div>
            {actionHref && actionLabel ? (
              <Link
                href={actionHref}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-headline font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                {actionLabel}
                <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">{actionLabel}</p>
            )}
          </div>
        ) : (
          <>
            <div className="text-2xl font-headline font-bold">{value}</div>
            <div className="mt-1 flex items-center gap-2">
              {description && (
                <p className="text-xs text-muted-foreground">
                  {description}
                </p>
              )}
              {trend && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                  trend.positive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {trend.value}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
