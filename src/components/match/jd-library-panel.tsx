"use client"

import { useEffect, useState } from "react"
import {
  Bookmark,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  deleteSavedJobDescription,
  fetchSavedJobDescriptions,
  saveJobDescription,
} from "@/lib/job-description-library-store"
import {
  savedJobDescriptionLimits,
  validateJobDescriptionInput,
  type SavedJobDescription,
} from "@/lib/job-description-library"

type JdLibraryPanelProps = {
  /** The analyzer's current job description textarea content. */
  currentJobDescription: string
  /** Called when the user loads a saved JD — populates the textarea only. */
  onLoad: (jobDescription: string) => void
  /** Disable interactions while a resume analysis is running. */
  disabled?: boolean
}

export function JdLibraryPanel({
  currentJobDescription,
  onLoad,
  disabled = false,
}: JdLibraryPanelProps) {
  const [items, setItems] = useState<SavedJobDescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  /** Id of the entry currently being edited (loaded into the textarea). */
  const [editingId, setEditingId] = useState<string | null>(null)
  /** Two-step delete: the id awaiting confirmation. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")

  const loadLibrary = async () => {
    setLoading(true)
    setError("")
    try {
      setItems(await fetchSavedJobDescriptions())
    } catch {
      setError("Could not load your saved job descriptions. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSavedJobDescriptions()
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your saved job descriptions. Please try again.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const clearPendingDelete = () => setPendingDeleteId(null)

  const handleLoad = (item: SavedJobDescription) => {
    onLoad(item.jobDescription)
    setEditingId(item.id)
    setTitle(item.title)
    setNotice(`Loaded "${item.title}" into the job description field.`)
    clearPendingDelete()
  }

  const handleSave = async () => {
    if (disabled || saving) return
    // Fast client-side validation before any Firestore call.
    const validated = validateJobDescriptionInput({
      id: editingId ?? undefined,
      title,
      jobDescription: currentJobDescription,
    })
    if (!validated.ok) {
      setError(validated.error)
      return
    }
    setSaving(true)
    setError("")
    try {
      const next = await saveJobDescription({
        id: editingId ?? undefined,
        title,
        jobDescription: currentJobDescription,
      })
      setItems(next)
      setNotice(
        editingId
          ? `Updated "${validated.title}".`
          : `Saved "${validated.title}" to your library.`
      )
    } catch (saveError) {
      const message =
        saveError instanceof Error && saveError.message
          ? saveError.message
          : "Could not save this job description. Please try again."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: SavedJobDescription) => {
    if (disabled || saving) return
    if (pendingDeleteId !== item.id) {
      setPendingDeleteId(item.id)
      return
    }
    setSaving(true)
    setError("")
    try {
      const next = await deleteSavedJobDescription(item.id)
      setItems(next)
      if (editingId === item.id) {
        setEditingId(null)
        setTitle("")
      }
      setNotice(`Deleted "${item.title}".`)
      clearPendingDelete()
    } catch {
      setError("Could not delete this job description. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const clearEditing = () => {
    setEditingId(null)
    setTitle("")
    setError("")
  }

  const canSave = Boolean(title.trim()) && Boolean(currentJobDescription.trim())

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-headline tracking-widest uppercase">
            <Bookmark className="h-4 w-4 text-primary" strokeWidth={1.5} />
            Saved Job Descriptions
          </CardTitle>
          <CardDescription>
            Reuse job descriptions you have saved to your account. Loading one only fills the
            textarea — it will not run AI Match automatically.
          </CardDescription>
        </div>
        {notice ? (
          <p className="max-w-[240px] text-right text-xs text-green-500">{notice}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <p>{error}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadLibrary}
              className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Retry
            </Button>
          </div>
        ) : null}

        {/* Save / update row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setError("")
            }}
            placeholder={editingId ? "Update the name of this saved job..." : "Name this job description (e.g. Senior Frontend Engineer)"}
            maxLength={savedJobDescriptionLimits.maxTitleLength}
            disabled={disabled || saving || loading}
            className="flex-1 border-foreground/10 bg-background/50"
            aria-label="Job description name"
            name="jd-library-title"
          />
          {editingId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearEditing}
              disabled={disabled || saving}
              className="border-foreground/10 hover:bg-foreground/5"
            >
              <X className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              New entry
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={disabled || saving || loading || !canSave}
            className="font-headline"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            )}
            {editingId ? "Update saved" : "Save to library"}
          </Button>
        </div>
        {!currentJobDescription.trim() ? (
          <p className="text-xs text-muted-foreground">
            Paste a job description in the field above to save it here.
          </p>
        ) : null}

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-foreground/5 bg-foreground/[0.02] p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
            Loading your saved job descriptions...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/10 p-6 text-center">
            <Bookmark className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" strokeWidth={1} />
            <p className="text-sm font-medium">No saved job descriptions yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
              Save a job description here to reuse it across future AI Match runs.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {items.map((item) => {
              const confirming = pendingDeleteId === item.id
              const editing = editingId === item.id
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                    editing
                      ? "border-primary/30 bg-primary/5"
                      : "border-foreground/5 bg-foreground/[0.02]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      {editing ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-headline uppercase tracking-wider text-primary">
                          Editing
                        </span>
                      ) : null}
                      <p className="truncate text-sm font-medium">{item.title}</p>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{item.jobDescription}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                      Saved {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoad(item)}
                      disabled={disabled || saving}
                      className="border-foreground/10 hover:bg-foreground/5"
                    >
                      {editing ? "Reload" : "Load"}
                    </Button>
                    <Button
                      type="button"
                      variant={confirming ? "destructive" : "ghost"}
                      size="sm"
                      onClick={() => void handleDelete(item)}
                      disabled={disabled || saving}
                      className={confirming ? "" : "text-red-400 hover:bg-red-500/10 hover:text-red-400"}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                      {confirming ? "Confirm" : "Delete"}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
