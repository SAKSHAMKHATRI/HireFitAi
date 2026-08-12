/**
 * One-time, manual, IDEMPOTENT backfill for pre-existing `users/{uid}` docs.
 *
 * Background
 * ----------
 * The Phase 5 account record (`users/{uid}`, written by `ensureUserRecord`
 * in `src/lib/firebase-firestore.ts`) is created lazily on app sign-in and
 * sets `createdAt` only at creation time. Two pre-existing documents were
 * created before that flow shipped, so they are missing optional fields:
 *
 *   - 2XWLZbpFuJa8NehWkUwKrnj37v03  missing `email` and `createdAt`
 *   - gwwvo6ZIATekR3kgnpSaXjE6N7z1  missing `createdAt`
 *
 * This script reconciles those documents FROM the Firebase Authentication
 * export, and NEVER overwrites an existing value. It is safe to run any
 * number of times (idempotent) — on re-runs nothing changes.
 *
 * What it adds (per document, only when the field is absent):
 *   - email     <- auth export `email`
 *   - name      <- auth export `displayName` (only if doc has no name)
 *   - createdAt <- auth export `createdAt` (ms epoch integer)
 *
 * Requirements
 * ------------
 * 1. Firebase CLI logged in with a project-owner account
 *    (`npx firebase login:list`).
 * 2. An Auth export file:
 *      npx firebase auth:export auth-users.json --format json --project hirefit-ai
 *
 * Usage
 * -----
 *   # Dry run — prints exactly what WOULD be added, changes nothing.
 *   node scripts/backfill-user-docs.mjs --auth-file auth-users.json
 *
 *   # Apply — only after reviewing the dry run output.
 *   node scripts/backfill-user-docs.mjs --auth-file auth-users.json --apply
 *
 * Safety
 * ------
 *   - Defaults to DRY RUN; `--apply` is required to write.
 *   - Patches are built with `updateMask.fieldPaths` limited to the fields
 *     that are currently missing on each doc, so existing valid fields are
 *     never overwritten.
 *   - Uses the same OAuth token the Firebase CLI already stores (the
 *     project-owner login), scoped to the configured project.
 *   - No deletions. No document creation. Roles are untouched.
 */

import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const PROJECT = process.env.FIREBASE_PROJECT ?? "hirefit-ai"
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

function arg(name) {
  const idx = process.argv.indexOf(name)
  return idx === -1 ? null : process.argv[idx + 1]
}

const authFile = arg("--auth-file")
const apply = process.argv.includes("--apply")

if (!authFile) {
  console.error("Missing --auth-file <path> (exported via `firebase auth:export`)")
  process.exit(1)
}

function getToken() {
  const cfg = JSON.parse(
    readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8")
  )
  if (!cfg.tokens?.access_token) {
    throw new Error("No Firebase CLI OAuth token found — run `npx firebase login` first.")
  }
  return cfg.tokens.access_token
}

const token = getToken()

async function listCollection(name) {
  const res = await fetch(`${BASE}/${name}?pageSize=1000`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`list ${name}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.documents ?? []
}

/** PATCH with an updateMask limited to `fieldPaths`; merge semantics. */
async function patchUser(uid, fields, fieldPaths) {
  const mask = fieldPaths.map((f) => `updateMask.fieldPaths=${f}`).join("&")
  const res = await fetch(`${BASE}/users/${uid}?${mask}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`patch users/${uid}: ${res.status} ${await res.text()}`)
}

const main = async () => {
  const authData = JSON.parse(readFileSync(authFile, "utf8"))
  const authUsers = new Map(
    (authData.users ?? []).map((u) => [
      u.localId,
      { email: u.email, name: u.displayName, createdAt: u.createdAt },
    ])
  )

  const userDocs = await listCollection("users")
  console.log(`\nScanning ${userDocs.length} user doc(s) against ${authUsers.size} auth account(s)...`)

  let planned = 0
  for (const doc of userDocs) {
    const uid = doc.name.split("/").pop()
    const fields = doc.fields ?? {}
    const auth = authUsers.get(uid)
    if (!auth) {
      console.log(`- ${uid}: no matching auth account (skipped)`)
      continue
    }
    const patch = {}
    const mask = []
    if (!fields.email && auth.email) {
      patch.email = { stringValue: auth.email }
      mask.push("email")
    }
    if (!fields.name && auth.name) {
      patch.name = { stringValue: auth.name }
      mask.push("name")
    }
    if (!fields.createdAt && auth.createdAt) {
      patch.createdAt = { integerValue: String(auth.createdAt) }
      mask.push("createdAt")
    }
    if (mask.length === 0) {
      console.log(`- ${uid}: complete — nothing to add`)
      continue
    }
    planned++
    console.log(`- ${uid}: WOULD ADD ${mask.join(", ")}`)
    if (apply) {
      await patchUser(uid, patch, mask)
      console.log(`  ✔ patched`)
    }
  }

  console.log(`\n${apply ? "APPLIED" : "DRY RUN"}: ${planned} doc(s) would change.\n`)
  if (!apply) {
    console.log("Re-run with --apply to write. Nothing was modified.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
