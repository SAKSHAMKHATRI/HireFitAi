"use client"

import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  Users as UsersIcon,
} from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { RoleBadge } from "@/components/admin/role-badge"
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
import { useAuth } from "@/components/auth/auth-provider"
import { useAdminData } from "@/hooks/use-admin-data"
import { setUserRole, type UserRecord, type UserRole } from "@/lib/firebase-firestore"
import { formatRelativeTime, formatEventTimestamp } from "@/lib/analytics"

const pageSize = 10

type SortKey = "name" | "created" | "lastActive"
type RoleFilter = "all" | "user" | "admin"

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const { users, roles, analyses, loading, error, reload } = useAdminData()

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("created")
  const [page, setPage] = useState(1)

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: UserRecord; role: UserRole } | null>(null)
  const [changingRole, setChangingRole] = useState(false)

  const analysesByUser = useMemo(() => {
    const counts = new Map<string, number>()
    analyses.forEach((analysis) => {
      counts.set(analysis.userId, (counts.get(analysis.userId) ?? 0) + 1)
    })
    return counts
  }, [analyses])

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = users
      .filter((record) => {
        if (roleFilter !== "all" && (roles[record.uid] ?? "user") !== roleFilter) return false
        if (!query) return true
        return (
          String(record.name ?? "").toLowerCase().includes(query) ||
          String(record.email ?? "").toLowerCase().includes(query)
        )
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "name":
            return String(a.name ?? "").localeCompare(String(b.name ?? ""))
          case "lastActive":
            return (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0)
          case "created":
          default:
            return (b.createdAt ?? 0) - (a.createdAt ?? 0)
        }
      })
    return filtered.map((record) => ({
      record,
      role: roles[record.uid] ?? ("user" as UserRole),
      analysesCount: analysesByUser.get(record.uid) ?? 0,
    }))
  }, [users, roles, analysesByUser, search, roleFilter, sortKey])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return
    const { user: target, role } = pendingRoleChange
    setChangingRole(true)
    try {
      await setUserRole(target.uid, role, currentUser?.uid ?? "")
      toast({
        title: "Role updated",
        description: `${String(target.name ?? target.email)} is now ${role === "admin" ? "an admin" : "a regular user"}.`,
      })
      reload()
    } catch (changeError) {
      const code = (changeError as { code?: string })?.code ?? ""
      toast({
        title: "Role update failed",
        description:
          code === "permission-denied"
            ? "Firestore rejected this change — the account may not have admin rights or the security rules are not deployed."
            : "Something went wrong. Please try again.",
      })
    } finally {
      setChangingRole(false)
      setPendingRoleChange(null)
    }
  }

  const userAnalyses = useMemo(
    () => (selectedUser ? analyses.filter((analysis) => analysis.userId === selectedUser.uid) : []),
    [selectedUser, analyses]
  )

  const isSelf = (uid: string) => uid === currentUser?.uid

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <AdminPageHeader
        title="Users"
        description="Manage accounts, roles, and review user activity."
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
            placeholder="Search by name or email..."
            className="h-10 border-foreground/10 bg-background/50 pl-9"
            aria-label="Search users"
            name="user-search"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value as RoleFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-40 border-foreground/10 bg-background/50">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortKey}
            onValueChange={(value) => {
              setSortKey(value as SortKey)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-10 w-44 border-foreground/10 bg-background/50">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Newest first</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="lastActive">Recently active</SelectItem>
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
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 bg-background/40 p-12 text-center">
            <UsersIcon className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="font-headline text-base font-medium">No users found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {search || roleFilter !== "all"
                ? "Try adjusting the search or role filter."
                : "No accounts have registered yet. New signups appear here automatically."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12">User</TableHead>
                <TableHead className="h-12">Role</TableHead>
                <TableHead className="h-12">Created</TableHead>
                <TableHead className="h-12">Last Active</TableHead>
                <TableHead className="h-12 text-right">Analyses</TableHead>
                <TableHead className="h-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(({ record, role, analysesCount }) => {
                const self = isSelf(record.uid)
                const name = String(record.name ?? "Unknown")
                return (
                  <TableRow key={record.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(name.trim()[0] ?? "?").toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{name}</span>
                            {self ? (
                              <Badge variant="outline" className="shrink-0 border-foreground/15 text-muted-foreground">You</Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{String(record.email ?? "")}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={role} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {typeof record.createdAt === "number" ? formatRelativeTime(record.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {typeof record.lastActiveAt === "number" ? formatRelativeTime(record.lastActiveAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">{analysesCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedUser(record)}>
                          <Eye className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                          View
                        </Button>
                        <Select
                          value={role}
                          disabled={self}
                          onValueChange={(value) => setPendingRoleChange({ user: record, role: value as UserRole })}
                        >
                          <SelectTrigger
                            className="h-8 w-24 border-foreground/10 bg-background/50"
                            title={self ? "You cannot change your own role" : "Change role"}
                            aria-label={`Change role for ${name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
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
            Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)}</span> of <span className="font-medium text-foreground">{rows.length}</span> users
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

      <Dialog open={selectedUser !== null} onOpenChange={(open) => { if (!open) setSelectedUser(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {(String(selectedUser?.name ?? "?").trim()[0] ?? "?").toUpperCase()}
              </span>
              <span className="truncate">{String(selectedUser?.name ?? "Unknown")}</span>
            </DialogTitle>
            <DialogDescription>
              {String(selectedUser?.email ?? "")}
              {selectedUser && typeof selectedUser.createdAt === "number" ? ` · ${formatEventTimestamp(selectedUser.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedUser ? (
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Role</p>
                  <div className="mt-1.5"><RoleBadge role={roles[selectedUser.uid] ?? "user"} /></div>
                </div>
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Created</p>
                  <p className="mt-1.5 text-sm">{typeof selectedUser.createdAt === "number" ? formatEventTimestamp(selectedUser.createdAt) : "—"}</p>
                </div>
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Last active</p>
                  <p className="mt-1.5 text-sm">{typeof selectedUser.lastActiveAt === "number" ? formatRelativeTime(selectedUser.lastActiveAt) : "—"}</p>
                </div>
                <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                  <p className="text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Analyses</p>
                  <p className="mt-1.5 font-mono text-sm tabular-nums">{userAnalyses.length}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-headline uppercase tracking-widest text-muted-foreground">Analysis history</p>
                {userAnalyses.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-foreground/10 p-6 text-center text-sm text-muted-foreground">
                    This user has no recorded analyses yet.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {userAnalyses.map((analysis) => (
                      <li key={analysis.id} className="flex items-center justify-between gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{analysis.fileName || analysis.type}</p>
                          <p className="truncate text-xs text-muted-foreground">{formatEventTimestamp(analysis.createdAt ?? 0)}</p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {analysis.atsScore !== undefined ? (
                            <Badge variant="outline" className="border-primary/30 text-primary">ATS {analysis.atsScore}%</Badge>
                          ) : null}
                          {analysis.matchScore !== undefined ? (
                            <Badge variant="outline" className="border-primary/30 text-primary">Match {analysis.matchScore}%</Badge>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingRoleChange !== null} onOpenChange={(open) => { if (!open) setPendingRoleChange(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role to {pendingRoleChange?.role === "admin" ? "Admin" : "User"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange?.role === "admin" ? (
                <>
                  <span className="font-medium text-foreground">{String(pendingRoleChange?.user.name ?? pendingRoleChange?.user.email)}</span> will gain full access to the admin console, user management, and all analysis records.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">{String(pendingRoleChange?.user.name ?? pendingRoleChange?.user.email)}</span> will lose admin access and become a regular user.
                </>
              )}{" "}
              This takes effect immediately and is enforced by Firestore security rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRoleChange()} disabled={changingRole}>
              {changingRole ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
