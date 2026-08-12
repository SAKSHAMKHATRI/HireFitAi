/**
 * Read-only verification for the additive backfill.
 *
 * Reads the Firestore `users/{uid}` documents for the two previously-affected
 * accounts and prints their fields, then compares against the Auth export so we
 * can confirm: (a) the missing fields are now present, (b) they match Auth
 * (no overwrites — existing fields unchanged), (c) no documents were deleted.
 *
 * Usage:
 *   node scripts/verify-backfill.mjs --auth-file auth-users.json
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
if (!authFile) {
  console.error("Missing --auth-file <path>")
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

async function getDoc(name) {
  const res = await fetch(`${BASE}/${name}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`get ${name}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.fields ?? {}
}

// Decode Firestore value objects into plain JS values.
function decode(value) {
  if (value === null || value === undefined) return undefined
  if ("stringValue" in value) return value.stringValue
  if ("integerValue" in value) return Number(value.integerValue)
  if ("doubleValue" in value) return Number(value.doubleValue)
  if ("booleanValue" in value) return value.booleanValue
  if ("nullValue" in value) return null
  if ("timestampValue" in value) return value.timestampValue
  if ("arrayValue" in value) return (value.arrayValue?.values ?? []).map(decode)
  if ("mapValue" in value) {
    const out = {}
    for (const [k, v] of Object.entries(value.mapValue?.fields ?? {})) out[k] = decode(v)
    return out
  }
  return JSON.stringify(value)
}

const main = async () => {
  const authData = JSON.parse(readFileSync(authFile, "utf8"))
  const authUsers = new Map(
    (authData.users ?? []).map((u) => [
      u.localId,
      { email: u.email, name: u.displayName, createdAt: u.createdAt },
    ])
  )

  const affectedUids = [
    "2XWLZbpFuJa8NehWkUwKrnj37v03", // was missing email + createdAt
    "gwwvo6ZIATekR3kgnpSaXjE6N7z1", // was missing createdAt
  ]

  for (const uid of affectedUids) {
    console.log(`\n=== users/${uid} ===`)
    const fields = await getDoc(`users/${uid}`)
    const auth = authUsers.get(uid)
    if (!auth) {
      console.log("  !! no matching Auth account in export (skipped comparison)")
      continue
    }
    const decoded = {}
    for (const [key, value] of Object.entries(fields)) decoded[key] = decode(value)

    const keys = Object.keys(decoded).sort()
    console.log(`  fields: ${keys.join(", ")}`)

    for (const [field, expected] of Object.entries({
      email: auth.email,
      name: auth.name,
      createdAt: auth.createdAt,
    })) {
      if (expected === undefined || expected === null) continue
      const actual = decoded[field]
      const present = actual !== undefined
      const matches = present && String(actual) === String(expected)
      if (present && matches) {
        console.log(`  ✔ ${field} = ${actual}  (matches Auth)`)
      } else if (present) {
        console.log(`  ⚠ ${field} = ${actual}  (present, Auth says ${expected})`)
      } else {
        console.log(`  ✗ ${field} MISSING (Auth says ${expected})`)
      }
    }
    if (!("name" in decoded) && !("email" in decoded) && !("createdAt" in decoded)) {
      console.log("  !! document appears empty or was removed")
    }
  }

  console.log("\nAll checks complete. No writes were performed by this script.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
