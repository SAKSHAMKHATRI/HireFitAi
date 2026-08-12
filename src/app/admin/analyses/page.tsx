"use client"

import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSearch,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useAdminData } from "@/hooks/use-admin-data"
import { deleteAnalysisRecord, type AnalysisRecord } from "@/lib/firebase-firestore"
import { analyticsModules, formatEventTimestamp } from "@/lib/analytics"

const pageSize = 10

type SortKey = "created" | "score"

function typeLabel(type: string): string {
  return analyticsModules.find((module) => module.eventType === type)?.label ?? type
}

export default function AdminAnalysesPage() {
  const { analyses, loading, error, reload } = useAdminData({ users: false, roles: false })

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("created")
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<AnalysisRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AnalysisRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const availableTypes = useMemo(() => {
    const seen = new Set<string>()
    analyses.forEach((analysis) => seen.add(analysis.type))
    return Array.from(seen)
  }, [analyses])

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return analyses
      .filter((analysis) => {
        if (typeFilter !== "all" && analysis.type !== typeFilter) return false
        if (!query) return true
        return (
          String(analysis.userName ?? "").toLowerCase().includes(query) ||
          String(analysis.userEmail ?? "").toLowerCase().includes(query) ||
          String(analysis.fileName ?? "").toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        if (sortKey === "score") {
          const scoreA = a.matchScore ?? a.atsCompatibility ?? a.atsScore ?? -1
          const scoreB = b.matchScore ?? b.atsCompatibility ?? b.atsScore ?? -1
          return scoreB - scoreA
        }
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      })
  }, [analyses, search, typeFilter, sortKey])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteAnalysisRecord(pendingDelete.id)
      toast({ title: "Analysis deleted", description: "The record was permanently removed." })
      reload()
    } catch (deleteError) {
      const code = (deleteError as { code?: string })?.code ?? ""
      toast({
        title: "Delete failed",
        description:
          code === "permission-denied"
            ? "Firestore rejected the deletion — this account may not have admin rights or the security rules are not deployed."
            : "Something went wrong. Please try again.",
      })
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const detailSections = useMemo(() => {
    if (!selected) return []
    const sections: { label: string; value: string }[] = []
    if (selected.fileName) sections.push({ label: "File", value: selected.fileName })
    if (selected.atsScore !== undefined) sections.push({ label: "ATS Score", value: `${selected.atsScore}%` })
    if (selected.matchScore !== undefined) sections.push({ label: "Match Score", value: `${selected.matchScore}%` })
    if (selected.atsCompatibility !== undefined) sections.push({ label: "ATS Compatibility", value: `${selected.atsCompatibility}%` })
    if (selected.overallScore !== undefined) sections.push({ label: "Overall Score", value: `${selected.overallScore}` })
    if (selected.shortlistProbability) sections.push({ label: "Shortlist Probability", value: selected.shortlistProbability })
    if (selected.targetCareer) sections.push({ label: "Target Career", value: selected.targetCareer })
    if (selected.tone) sections.push({ label: "Tone", value: selected.tone })
    if (selected.companyName) sections.push({ label: "Company", value: selected.companyName })
    return sections
  }, [selected])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AdminPageHeader
        title="Resume Analyses"
        description="Every module run across all users — search, inspect, and clean up records."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search by user, email, or file name..."
            className="h-10 border-foreground/10 bg-background/50 pl-9"
            aria-label="Search analyses"
            name="analysis-search"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-44 border-foreground/10 bg-background/50">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {availableTypes.map((type) => (
                <SelectItem key={type} value={type}>{typeLabel(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortKey}
            onValueChange={(value) => {
              setSortKey(value as SortKey)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-40 border-foreground/10 bg-background/50">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Newest first</SelectItem>
              <SelectItem value="score">Highest score</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={reload} className="h-10 border-foreground/10">
            <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-foreground/10">
        {error ? (
          <div className="flex flex-col items-center gap-3 bg-background/40 p-12 text-center">
            <ShieldAlert className="h-8 w-8 text-red-400" strokeWidth={1.5} />
            <p className="max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="grid gap-px bg-foreground/5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 bg-background p-4">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 bg-background/40 p-12 text-center">
            <FileSearch className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="font-headline text-base font-medium">No analyses found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {search || typeFilter !== "all"
                ? "Try adjusting the search or type filter."
                : "No module activity recorded yet. Records appear here as users run HireFit modules."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12">User</TableHead>
                <TableHead className="h-12">Type</TableHead>
                <TableHead className="h-12">File / Detail</TableHead>
                <TableHead className="h-12">Date</TableHead>
                <TableHead className="h-12 text-right">Score</TableHead>
                <TableHead className="h-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((analysis) => {
                const score =
                  analysis.matchScore ?? analysis.atsCompatibility ?? analysis.atsScore
                return (
                  <TableRow key={analysis.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{String(analysis.userName ?? "Unknown user")}</p>
                        <p className="truncate text-xs text-muted-foreground">{String(analysis.userEmail ?? "")}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary">{typeLabel(analysis.type)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate text-sm text-muted-foreground">{analysis.fileName || "—"}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatEventTimestamp(analysis.createdAt ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {score !== undefined ? (
                        <span className="font-mono text-sm font-semibold tabular-nums text-primary">{score}%</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(analysis)}>
                          <Eye className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => setPendingDelete(analysis)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!loading && !error && rows.length > pageSize ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)}</span> of <span className="font-medium text-foreground">{rows.length}</span> analyses
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              Previous
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">{page} / {totalPages}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" strokeWidth={1.5} />
              {selected ? typeLabel(selected.type) : "Analysis"}
            </DialogTitle>
            <DialogDescription>
              {selected ? formatEventTimestamp(selected.createdAt ?? 0) : ""} · by{" "}
              {String(selected?.userName ?? "")} ({String(selected?.userEmail ?? "")})
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {detailSections.map((section) => (
                  <div key={section.label} className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                    <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">{section.label}</p>
                    <p className="mt-1 truncate text-sm font-medium">{section.value}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Record ID</p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{selected.id}</p>
                </div>
              </div>
              {selected.skills && selected.skills.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Skills / Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.skills.slice(0, 24).map((skill) => (
                      <Badge key={skill} variant="outline" className="border-foreground/15 text-muted-foreground">{skill}</Badge>
                    ))}
                    {selected.skills.length > 24 ? (
                      <Badge variant="outline" className="text-muted-foreground">+{selected.skills.length - 24} more</Badge>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => {
                  const target = selected
                  setSelected(null)
                  setPendingDelete(target)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Delete record
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this analysis record?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the record for {String(pendingDelete?.userName ?? "")} ({pendingDelete ? typeLabel(pendingDelete.type) : ""}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
