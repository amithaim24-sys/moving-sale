# Seller Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SELLER role so only designated users can create and edit items; all other signed-in users are buyers (view-only).

**Architecture:** `role` is already a plain `String` column (no Prisma enum), so no DDL is needed — only a data backfill migration to promote existing item owners to SELLER. TypeScript types and all route/page guards gain a new `isSeller()` check. The admin users dashboard gains granular promote/demote buttons for the full 4-role hierarchy (USER → SELLER → ADMIN).

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma 5 / PostgreSQL, NextAuth (database sessions), next-intl

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Update role comment |
| `prisma/migrations/20260615000000_seller_role_backfill/migration.sql` | Create | Backfill existing item owners to SELLER |
| `src/lib/types.ts` | Modify | Add SELLER to Role type, add `isSeller()` helper |
| `src/lib/guards.ts` | Modify | Add `requireSeller()` redirect guard |
| `src/app/api/items/route.ts` | Modify | Gate POST on SELLER+ |
| `src/app/api/items/[id]/route.ts` | Modify | Gate owner PATCH/DELETE on SELLER+ |
| `src/app/api/admin/users/[id]/route.ts` | Modify | Accept SELLER in role PATCH; invalidate sessions on demotion |
| `src/app/[locale]/my/items/new/page.tsx` | Modify | Redirect buyers to home |
| `src/app/[locale]/my/collaborators/page.tsx` | Modify | Redirect buyers to home |
| `src/app/[locale]/my/items/page.tsx` | Modify | Hide "New Item" + "Collaborators" buttons for buyers |
| `src/app/[locale]/admin/users/AdminUserRow.tsx` | Modify | 4-role promote/demote UI |
| `src/app/[locale]/admin/users/page.tsx` | Modify | Pass new labels to AdminUserRow |
| `messages/en.json` | Modify | Add makeSeller / makeBuyer / sellerBadge keys |
| `messages/he.json` | Modify | Add Hebrew translations for new keys |

---

### Task 1: Backfill migration — promote existing item owners to SELLER

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260615000000_seller_role_backfill/migration.sql`

- [ ] **Step 1: Update the role comment in schema.prisma**

On line 17 of `prisma/schema.prisma`, change:
```
// Role: "USER" | "ADMIN" | "OWNER"
```
to:
```
// Role: "USER" | "SELLER" | "ADMIN" | "OWNER"
```

- [ ] **Step 2: Create the migration SQL file**

Create the directory and file `prisma/migrations/20260615000000_seller_role_backfill/migration.sql`:
```sql
-- Promote existing USERs who own at least one item to SELLER.
-- New sign-ups default to USER (buyer); admins promote them to SELLER manually.
UPDATE "User"
SET role = 'SELLER'
WHERE role = 'USER'
  AND id IN (SELECT DISTINCT "ownerId" FROM "Item");
```

- [ ] **Step 3: Apply the migration**

```bash
npx prisma migrate deploy
```

Expected output includes: `1 migration applied.`

- [ ] **Step 4: Verify the backfill ran**

```bash
npx prisma studio
```

Open the User table. Any user who owned an item before should now have `role = SELLER`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add SELLER role backfill migration"
```

---

### Task 2: Add SELLER to types and add isSeller() helper

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update types.ts**

Replace lines 1–18 in `src/lib/types.ts` with:
```typescript
// Platform roles (the global account role, distinct from per-store membership roles):
// - OWNER: the main owner / super-admin. Full access, incl. bugs/issues (logs),
//   stores, and site-requests. There is always at least one.
// - ADMIN: a delegated admin who controls Users, Items and Analytics only.
// - SELLER: can create and edit their own items.
// - USER: a normal user (buyer). View-only — can like, contact, sign up for give-if-unsold.
export type Role = "USER" | "SELLER" | "ADMIN" | "OWNER";

// Has elevated platform powers used across the app (view hidden/draft listings,
// edit/delete any item, contact any seller, see an admin panel). Both the owner and
// a delegated admin qualify.
export function isPlatformAdmin(role?: string | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// The main owner / super-admin only (bugs & issues, stores, site-requests).
export function isOwner(role?: string | null): boolean {
  return role === "OWNER";
}

// Can create and edit their own items (SELLER, ADMIN, or OWNER).
export function isSeller(role?: string | null): boolean {
  return role === "SELLER" || role === "ADMIN" || role === "OWNER";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add SELLER to Role type and isSeller() helper"
```

---

### Task 3: Add requireSeller() guard

**Files:**
- Modify: `src/lib/guards.ts`

- [ ] **Step 1: Update the import from ./types**

In `src/lib/guards.ts`, replace:
```typescript
import { isOwner, isPlatformAdmin } from "./types";
```
with:
```typescript
import { isOwner, isPlatformAdmin, isSeller } from "./types";
```

- [ ] **Step 2: Add requireSeller() after requireAdmin()**

After the closing brace of `requireAdmin()`, add:
```typescript
// Can create/edit own items (SELLER, ADMIN, or OWNER). Gates /my/items/new
// and /my/collaborators.
export async function requireSeller() {
  const user = await requireUser();
  if (!isSeller(user.role)) {
    const locale = await currentLocale();
    redirect(`/${locale}`);
  }
  return user;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/guards.ts
git commit -m "feat: add requireSeller() guard"
```

---

### Task 4: Gate POST /api/items on SELLER+

**Files:**
- Modify: `src/app/api/items/route.ts`

- [ ] **Step 1: Add isSeller import**

At the top of `src/app/api/items/route.ts`, add to the existing imports:
```typescript
import { isSeller } from "@/lib/types";
```

- [ ] **Step 2: Add role check after the ban check**

After this line (currently around line 22):
```typescript
  if (!me || me.banned || session.user.banned) return new NextResponse("Forbidden", { status: 403 });
```

Add:
```typescript
  if (!isSeller(session.user.role)) return new NextResponse("Forbidden", { status: 403 });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/items/route.ts
git commit -m "feat: gate POST /api/items on SELLER+ role"
```

---

### Task 5: Gate item owner PATCH/DELETE on SELLER+

**Files:**
- Modify: `src/app/api/items/[id]/route.ts`

- [ ] **Step 1: Update the types import**

Replace:
```typescript
import { isPlatformAdmin } from "@/lib/types";
```
with:
```typescript
import { isPlatformAdmin, isSeller } from "@/lib/types";
```

- [ ] **Step 2: Update loadEditable to accept and check seller status**

Replace the existing `loadEditable` function (lines 15–25):
```typescript
async function loadEditable(id: string, userId: string, isAdmin: boolean, userIsSeller: boolean) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!item) return null;
  const isFullEditor = await canEditOwner(userId, item.ownerId);
  // Owners must be SELLER+ to edit/delete their own items.
  // Collaborators retain edit access regardless of their own role (per design spec).
  if (isFullEditor && item.ownerId === userId && !userIsSeller && !isAdmin) return null;
  if (!isFullEditor && !isAdmin) return null;
  return { item, isFullEditor };
}
```

- [ ] **Step 3: Update the PATCH call site**

In the PATCH handler, replace:
```typescript
  const loaded = await loadEditable(id, session.user.id, isPlatformAdmin(session.user.role));
```
with:
```typescript
  const loaded = await loadEditable(id, session.user.id, isPlatformAdmin(session.user.role), isSeller(session.user.role));
```

- [ ] **Step 4: Update the DELETE call site**

In the DELETE handler, replace:
```typescript
  const loaded = await loadEditable(id, session.user.id, isPlatformAdmin(session.user.role));
```
with:
```typescript
  const loaded = await loadEditable(id, session.user.id, isPlatformAdmin(session.user.role), isSeller(session.user.role));
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/items/[id]/route.ts
git commit -m "feat: gate item owner PATCH/DELETE on SELLER+ role"
```

---

### Task 6: Update admin users API to accept SELLER role

**Files:**
- Modify: `src/app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Allow SELLER in the role whitelist**

Replace:
```typescript
  if (body.role === "USER" || body.role === "ADMIN") data.role = body.role;
```
with:
```typescript
  if (body.role === "USER" || body.role === "SELLER" || body.role === "ADMIN") data.role = body.role;
```

- [ ] **Step 2: Invalidate sessions when demoting to SELLER**

Replace:
```typescript
  if (data.banned === true || data.role === "USER") {
```
with:
```typescript
  if (data.banned === true || data.role === "USER" || data.role === "SELLER") {
```

This forces a re-login when an ADMIN is demoted to SELLER, so their active session stops carrying ADMIN privileges immediately.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/users/[id]/route.ts
git commit -m "feat: allow SELLER role in admin users PATCH endpoint"
```

---

### Task 7: Gate /my/items/new page on SELLER+

**Files:**
- Modify: `src/app/[locale]/my/items/new/page.tsx`

- [ ] **Step 1: Swap requireUser for requireSeller**

Replace:
```typescript
import { requireUser } from "@/lib/guards";
```
with:
```typescript
import { requireSeller } from "@/lib/guards";
```

Replace:
```typescript
  const user = await requireUser();
```
with:
```typescript
  const user = await requireSeller();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/my/items/new/page.tsx"
git commit -m "feat: redirect buyers away from new item page"
```

---

### Task 8: Gate /my/collaborators page on SELLER+

**Files:**
- Modify: `src/app/[locale]/my/collaborators/page.tsx`

- [ ] **Step 1: Swap requireUser for requireSeller**

Replace:
```typescript
import { requireUser } from "@/lib/guards";
```
with:
```typescript
import { requireSeller } from "@/lib/guards";
```

Replace:
```typescript
  const user = await requireUser();
```
with:
```typescript
  const user = await requireSeller();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/my/collaborators/page.tsx"
git commit -m "feat: redirect buyers away from collaborators page"
```

---

### Task 9: Hide seller-only buttons in /my/items for buyers

**Files:**
- Modify: `src/app/[locale]/my/items/page.tsx`

- [ ] **Step 1: Add isSeller import**

Add to the imports block in `src/app/[locale]/my/items/page.tsx`:
```typescript
import { isSeller } from "@/lib/types";
```

- [ ] **Step 2: Derive userIsSeller after the requireUser call**

After:
```typescript
  const user = await requireUser();
```

Add:
```typescript
  const userIsSeller = isSeller(user.role);
```

- [ ] **Step 3: Conditionally render the seller-only buttons**

Find this JSX block (around lines 108–113):
```tsx
          <Link href={`/${locale}/my/collaborators`} className="btn-secondary text-sm">
            {t("collab.manage")}
          </Link>
          <Link href={`/${locale}/my/items/new`} className="btn-primary text-sm">
            + {t("nav.newItem")}
          </Link>
```

Replace with:
```tsx
          {userIsSeller && (
            <Link href={`/${locale}/my/collaborators`} className="btn-secondary text-sm">
              {t("collab.manage")}
            </Link>
          )}
          {userIsSeller && (
            <Link href={`/${locale}/my/items/new`} className="btn-primary text-sm">
              + {t("nav.newItem")}
            </Link>
          )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/my/items/page.tsx"
git commit -m "feat: hide new item and collaborators buttons for buyers"
```

---

### Task 10: Add i18n keys for new role labels

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/he.json`

- [ ] **Step 1: Add keys to en.json**

Open `messages/en.json`. Find the `admin` section. Add these three keys alongside the existing `promote`, `demote`, `ban`, etc.:
```json
"makeSeller": "Make Seller",
"makeBuyer": "Make Buyer",
"sellerBadge": "SELLER"
```

- [ ] **Step 2: Add keys to he.json**

Open `messages/he.json`. Find the `admin` section. Add:
```json
"makeSeller": "הפוך למוכר",
"makeBuyer": "הפוך לקונה",
"sellerBadge": "מוכר"
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/he.json
git commit -m "feat: add i18n keys for SELLER role labels"
```

---

### Task 11: Update admin users UI for 4-role hierarchy

**Files:**
- Modify: `src/app/[locale]/admin/users/AdminUserRow.tsx`
- Modify: `src/app/[locale]/admin/users/page.tsx`

- [ ] **Step 1: Replace AdminUserRow.tsx**

Replace the entire file content:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminUserRow({
  user,
  viewerIsOwner,
  labels,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "SELLER" | "ADMIN" | "OWNER";
    banned: boolean;
    itemCount: number;
  };
  viewerIsOwner: boolean;
  labels: {
    promote: string;
    demote: string;
    makeSeller: string;
    makeBuyer: string;
    ban: string;
    unban: string;
    owner: string;
    sellerBadge: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(patch: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    router.refresh();
  }

  const isOwnerRow = user.role === "OWNER";
  // Only the owner can change roles, and never the owner role itself.
  const canChangeRole = viewerIsOwner && !isOwnerRow;
  const canBan = viewerIsOwner || !isOwnerRow;

  const roleBadgeClass =
    isOwnerRow
      ? "bg-amber-500 text-white"
      : user.role === "ADMIN"
        ? "bg-brand text-white"
        : user.role === "SELLER"
          ? "bg-emerald-600 text-white"
          : "bg-slate-200";

  const roleLabel =
    isOwnerRow
      ? labels.owner
      : user.role === "SELLER"
        ? labels.sellerBadge
        : user.role;

  return (
    <tr className="border-t">
      <td className="px-3 py-2">{user.email}</td>
      <td className="px-3 py-2">{user.name ?? "—"}</td>
      <td className="px-3 py-2">
        <span className={`rounded px-2 py-0.5 text-xs ${roleBadgeClass}`}>
          {roleLabel}
        </span>
        {user.banned && (
          <span className="ms-2 rounded bg-red-200 px-2 py-0.5 text-xs">banned</span>
        )}
      </td>
      <td className="px-3 py-2">{user.itemCount}</td>
      <td className="px-3 py-2 space-x-2 space-y-1">
        {/* USER → make them a Seller */}
        {canChangeRole && user.role === "USER" && (
          <button
            disabled={busy}
            onClick={() => update({ role: "SELLER" })}
            className="btn-secondary text-xs"
          >
            {labels.makeSeller}
          </button>
        )}
        {/* SELLER → promote to Admin OR demote to Buyer */}
        {canChangeRole && user.role === "SELLER" && (
          <>
            <button
              disabled={busy}
              onClick={() => update({ role: "ADMIN" })}
              className="btn-secondary text-xs"
            >
              {labels.promote}
            </button>
            <button
              disabled={busy}
              onClick={() => update({ role: "USER" })}
              className="btn-secondary text-xs"
            >
              {labels.makeBuyer}
            </button>
          </>
        )}
        {/* ADMIN → demote to Seller */}
        {canChangeRole && user.role === "ADMIN" && (
          <button
            disabled={busy}
            onClick={() => update({ role: "SELLER" })}
            className="btn-secondary text-xs"
          >
            {labels.demote}
          </button>
        )}
        {canBan && (
          <button
            disabled={busy}
            onClick={() => update({ banned: !user.banned })}
            className="btn-secondary text-xs"
          >
            {user.banned ? labels.unban : labels.ban}
          </button>
        )}
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Update page.tsx labels and role cast**

In `src/app/[locale]/admin/users/page.tsx`, replace the `labels` prop on `AdminUserRow`:
```tsx
                labels={{
                  promote: t("promote"),
                  demote: t("demote"),
                  makeSeller: t("makeSeller"),
                  makeBuyer: t("makeBuyer"),
                  ban: t("ban"),
                  unban: t("unban"),
                  owner: t("ownerBadge"),
                  sellerBadge: t("sellerBadge"),
                }}
```

Also update the `role` type cast on the `user` prop:
```tsx
                user={{ id: u.id, name: u.name, email: u.email, role: u.role as "USER" | "SELLER" | "ADMIN" | "OWNER", banned: u.banned, itemCount: u._count.items }}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/admin/users/AdminUserRow.tsx" "src/app/[locale]/admin/users/page.tsx"
git commit -m "feat: update admin users UI for 4-role hierarchy (USER/SELLER/ADMIN/OWNER)"
```

---

### Task 12: End-to-end verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify buyer (USER role) is blocked from creating items**

Sign in with a USER-role account (one with no items). Navigate to `/my/items` — confirm "New Item" and "Collaborators" buttons are absent. Navigate directly to `/en/my/items/new` — confirm redirect to home (`/en`).

- [ ] **Step 3: Verify buyer cannot call the API directly**

```bash
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -b "<your-session-cookie>" \
  -d '{"title":"test","type":"SELL","description":"test"}'
```

Expected response: `403 Forbidden`.

- [ ] **Step 4: Verify admin can promote USER → SELLER**

Sign in as OWNER. Go to `/en/admin/users`. Find the USER-role account. Click "Make Seller". Confirm the badge changes to green "SELLER" and the row now shows "Make Admin" + "Make Buyer" buttons.

- [ ] **Step 5: Verify SELLER can create items**

Sign in with the newly promoted SELLER account. Navigate to `/en/my/items` — confirm "New Item" button is visible. Create an item — confirm it saves and appears in the catalog.

- [ ] **Step 6: Verify admin promote/demote chain**

In `/admin/users`:
- USER row: shows only "Make Seller"
- SELLER row: shows "Make Admin" + "Make Buyer"
- ADMIN row: shows "Demote" (→ SELLER)
- OWNER row: no role-change buttons

- [ ] **Step 7: Verify collaborator access is unaffected**

Promote User A to SELLER. Sign in as User A and go to `/my/collaborators`. Invite User B (a USER/buyer). Sign out. Sign in as User B. Confirm User B sees User A's items in `/my/items` under "shared items" and can access the edit page. Confirm User B cannot access `/my/collaborators` directly (redirect to home).
