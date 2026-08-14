import { test } from "node:test"
import assert from "node:assert/strict"
import {
  removeJobDescription,
  savedJobDescriptionLimits,
  upsertJobDescription,
  validateJobDescriptionInput,
  type SavedJobDescription,
} from "../src/lib/job-description-library"

function item(id: string, overrides: Partial<SavedJobDescription> = {}): SavedJobDescription {
  return {
    id,
    title: `Job ${id}`,
    jobDescription: "Senior engineer role description.",
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

test("validate rejects empty title", () => {
  const result = validateJobDescriptionInput({ title: "  ", jobDescription: "Some JD" })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /name/i)
})

test("validate rejects empty job description", () => {
  const result = validateJobDescriptionInput({ title: "Role", jobDescription: "   " })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /job description/i)
})

test("validate rejects oversized job description", () => {
  const result = validateJobDescriptionInput({
    title: "Role",
    jobDescription: "x".repeat(savedJobDescriptionLimits.maxJobDescriptionLength + 1),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /too large/i)
})

test("validate trims input", () => {
  const result = validateJobDescriptionInput({
    title: "  Senior Frontend  ",
    jobDescription: "  Role text.  ",
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.title, "Senior Frontend")
    assert.equal(result.jobDescription, "Role text.")
  }
})

test("upsert creates a new entry with id + timestamps and prepends it", () => {
  const before = [item("a", { updatedAt: 2000 }), item("b", { updatedAt: 3000 })]
  const result = upsertJobDescription(before, { title: "New role", jobDescription: "Fresh JD" })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.list.length, 3)
    assert.equal(result.list[0].id, result.item.id)
    assert.ok(result.item.id.length > 0)
    assert.ok(result.item.createdAt > 0)
    assert.equal(result.item.updatedAt, result.item.createdAt)
    assert.equal(result.list[0].title, "New role")
  }
})

test("upsert updates an existing entry by id and keeps its createdAt", () => {
  const existing = item("a", { createdAt: 500, updatedAt: 500, jobDescription: "Old JD" })
  const result = upsertJobDescription([existing], {
    id: "a",
    title: "Renamed role",
    jobDescription: "Updated JD",
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.list.length, 1)
    assert.equal(result.list[0].id, "a")
    assert.equal(result.list[0].title, "Renamed role")
    assert.equal(result.list[0].jobDescription, "Updated JD")
    assert.equal(result.list[0].createdAt, 500)
    assert.ok(result.list[0].updatedAt >= 500)
    assert.equal(result.item.id, "a")
  }
})

test("upsert with an unknown id reports an error", () => {
  const result = upsertJobDescription([item("a")], {
    id: "missing",
    title: "Role",
    jobDescription: "JD",
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /no longer exists/i)
})

test("upsert caps the list at maxItems, dropping the oldest entry", () => {
  // The store always keeps the list sorted newest-first (by updatedAt), so
  // the oldest entry sits at the end and is the one dropped by the cap.
  const many = Array.from({ length: savedJobDescriptionLimits.maxItems }, (_, i) =>
    item(`jd-${i}`, { updatedAt: savedJobDescriptionLimits.maxItems - 1 - i })
  )
  const result = upsertJobDescription(many, { title: "Newest", jobDescription: "JD" })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.list.length, savedJobDescriptionLimits.maxItems)
    assert.equal(result.list[0].title, "Newest")
    // The oldest entry (updatedAt 0, id jd-49) was dropped.
    assert.ok(!result.list.some((entry) => entry.id === "jd-49"))
    assert.ok(result.list.some((entry) => entry.id === "jd-0"))
  }
})

test("remove deletes only the matching id", () => {
  const list = [item("a"), item("b"), item("c")]
  const next = removeJobDescription(list, "b")
  assert.deepEqual(next.map((entry) => entry.id), ["a", "c"])
})

test("remove with a missing id leaves the list unchanged", () => {
  const list = [item("a")]
  const next = removeJobDescription(list, "nope")
  assert.equal(next.length, 1)
  assert.equal(next[0].id, "a")
})
