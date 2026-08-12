import { ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function AdminPageHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">{title}</h1>
        <p className="text-muted-foreground text-lg">{description}</p>
      </div>
      <Badge className="w-fit shrink-0 gap-1 border-brand-green/40 bg-brand-green/10 text-brand-green">
        <ShieldCheck className="h-3 w-3" strokeWidth={2} />
        Admin
      </Badge>
    </div>
  )
}
