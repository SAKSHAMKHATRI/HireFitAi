
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
}

export function MetricCard({ title, value, description, icon: Icon, className, trend }: MetricCardProps) {
  return (
    <Card className={cn("glass-card overflow-hidden relative", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-headline uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
