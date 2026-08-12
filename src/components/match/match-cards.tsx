import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Shared presentational cards for AI Match results (used by both the
 * standalone /match page and the Resume Analyzer's AI Match panel so the
 * two surfaces stay visually identical).
 */

export function ListCard({
  title,
  description,
  items,
  tone = "primary",
}: {
  title: string
  description: string
  items: string[]
  tone?: "primary" | "yellow"
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm font-headline tracking-widest uppercase">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Badge
              key={item}
              variant={tone === "yellow" ? "outline" : "default"}
              className={tone === "yellow" ? "border-yellow-500/30 text-yellow-400" : "bg-primary/10 text-primary hover:bg-primary/20"}
            >
              {item}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Unavailable from the provided resume and job description.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function NumberedCard({
  title,
  description,
  items,
  tone = "primary",
}: {
  title: string
  description: string
  items: string[]
  tone?: "primary" | "yellow"
}) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm font-headline tracking-widest uppercase">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={item} className="flex gap-4 rounded-xl border border-foreground/5 bg-foreground/[0.03] p-4">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone === "yellow" ? "bg-yellow-500/10 text-yellow-400" : "bg-primary/10 text-primary"}`}>{index + 1}</span>
              <p className="text-sm leading-6 text-muted-foreground">{item}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Unavailable from the provided resume and job description.</p>
        )}
      </CardContent>
    </Card>
  )
}
