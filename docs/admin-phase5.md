# Phase 5 — Admin Role & Admin Dashboard

HireFit AI now ships a full admin role system and admin console. This document
covers how it works, how to provision the first admin, how to deploy the
security rules, and how to verify everything.

---

## 1. How the admin role works

There are two roles: **`user`** (default) and **`admin`** (explicitly granted).

- New accounts are automatically treated as `user`.
- Existing accounts without a role document are treated as `user`.
- Only accounts with an `admin` role document at `roles/{uid}` are admins.

### Firestore data model (additions)

| Path                     | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `roles/{uid}`            | Role document: `{ role: "user"\|"admin", updatedAt, updatedBy }`. Missing = user. |
| `users/{uid}`            | Existing profile doc now also acts as the account record (`name`, `email`, `createdAt`, `lastActiveAt`), created lazily at sign-in. |
| `analyses/{id}`          | Normalized module-activity records (resume analyses, matches, interviews, …) written whenever a module completes. |

### Where the enforcement happens

1. **Client routing** — `AdminRoute` (`src/components/auth/admin-route.tsx`):
   - Not signed in → redirect to `/login?next=…`
   - Signed-in non-admin → redirect to `/dashboard`
   - Admin → render the console
2. **Server-side security** — `firestore.rules`:
   - Only admins can read the `roles` collection or all `users` docs.
   - Normal users can never write to `roles/{uid}` (no self-promotion).
   - Users create analysis records scoped to their own `userId`; only owners
     and admins can read them; only admins can delete them.
   - Hiding UI is never the security boundary — Firestore rejects admin-only
     reads/writes at the rules layer.

### Client integration

- `AuthProvider` resolves `role` / `isAdmin` from Firestore on every
  sign-in/refresh (defaulting to `user` on any failure).
- Admin entry points (sidebar user-menu item, dashboard header badge) only
  render for admins.
- Module completion now mirrors analytics events into `analyses` in
  Firestore, so the admin console shows real, current data.

---

## 2. Create the first admin account

No code changes are required — this is a one-time database step.

1. Deploy the new rules (see below) with:

   ```bash
   firebase deploy --only firestore:rules
   ```

2. Open the **Firebase Console** → your project (`hirefit-ai`) →
   **Authentication** and copy the target user's **UID** (the user must have
   signed up at least once).

3. Go to **Firestore Database** → **Start collection**:

   - Collection ID: `roles`
   - Document ID: paste the **UID** above
   - Fields:
     - `role` → `"admin"`
     - `updatedBy` → `"console"` (string)
     - `updatedAt` → a number, e.g. the current `Date.now()` value

4. Save, then refresh the app (or re-login). The account now has admin
   access at `/admin`. Every additional admin can be granted from
   Admin → Users, or by adding another `roles/{uid}` document.

> The Admin Settings page (`/admin/settings`) shows the signed-in user's UID
> and repeats these steps, so provisioning never requires editing source code.

---

## 3. Firestore security rules

`firestore.rules` (project root) now contains:

- `isAdmin()` — checks `roles/{auth.uid}.role == "admin"` via `get()`.
- `roles/{uid}` — read: self or admin; write: **admin only**.
- `analyses/{id}` — create by owner (userId must match caller), read by owner
  or admin, delete by admin, update denied.
- `users/{userId}` — read by owner or admin; create/update by owner; delete by
  admin. Subcollections (`settings`, `saved`) remain **owner-only** as before.
- Everything else remains denied.

Deploy with:

```bash
firebase deploy --only firestore:rules
```

> ⚠️ The admin console depends on these rules. Until they are deployed,
> admin data reads will fail with `permission-denied` and the console shows a
> clear error with a retry button. Normal user functionality is unaffected.

---

## 4. Testing checklist

1. **Normal user** signs in → lands on `/dashboard`, sees no admin links.
2. **Normal user** types `/admin` → redirected to `/dashboard`.
3. **Admin** signs in → `Admin` badge appears; opens `/admin`, sees Overview
   statistics from real Firestore data.
4. **Admin → Users**: real accounts are listed with search, role filter,
   sort, pagination, and per-user analysis history. Role changes show a
   confirmation dialog; the admin's **own** role select is disabled.
5. **Admin → Resume Analyses**: real records with type/file/date/scores;
   details dialog; deletion requires confirmation.
6. **Refresh `/admin`** → role is re-resolved from Firestore and access is
   preserved (or correctly revoked if the role doc changed).
7. **Logout** → admin pages redirect to login; visiting `/admin` again
   redirects to login.
8. **Theme** → toggle dark/light (Settings → Appearance or the admin header);
   the admin console renders correctly in both.
9. **Normal user** attempts role escalation (custom Firestore write to
   `roles/{uid}`) → rejected by security rules.

---

## 5. Known limitations

- **Historical data**: the admin stats/charts are computed from the `analyses`
  collection, which starts filling as users run modules after this phase
  ships. Existing per-browser `localStorage` analytics are not visible to
  admins.
- **Scale**: admin screens load full collections and paginate client-side.
  For very large installs this should move to server-side pagination/Cloud
  Functions.
- **Last active**: updated on sign-in and module activity, not on every page
  view.
- **Audit trail**: `roles/{uid}` records `updatedBy`/`updatedAt` for role
  changes; no separate audit log is kept.
