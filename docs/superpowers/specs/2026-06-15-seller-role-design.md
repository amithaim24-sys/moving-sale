# Seller Role Design

**Date:** 2026-06-15
**Status:** Approved

## Overview

Add a `SELLER` role to distinguish between users who can list items and users who can only browse. Default new users are buyers (`USER` role — view, like, contact). Admins promote users to `SELLER` manually via the admin dashboard.

## Role Hierarchy

```
OWNER > ADMIN > SELLER > USER
```

| Role | Can view/like/contact | Can create items | Can edit own items | Can moderate all items |
|------|-----------------------|------------------|--------------------|------------------------|
| USER (buyer) | Yes | No | No | No |
| SELLER | Yes | Yes | Yes | No |
| ADMIN | Yes | Yes | Yes | Status-only on others |
| OWNER | Yes | Yes | Yes | Full |

## Data Model

Add `SELLER` to the `Role` enum in `prisma/schema.prisma`:

```prisma
enum Role {
  OWNER
  ADMIN
  SELLER
  USER
}
```

New users default to `USER`. The Prisma migration includes a SQL backfill:

```sql
UPDATE "User" SET role = 'SELLER'
WHERE role = 'USER'
  AND id IN (SELECT DISTINCT "ownerId" FROM "Item");
```

This ensures existing item owners are not locked out of their listings.

## API Enforcement

New `requireSeller()` guard added to `src/lib/guards.ts` — redirects to `/` if user role is `USER`.

| Route | New gate |
|-------|----------|
| `POST /api/items` | SELLER or higher |
| `PATCH /api/items/[id]` | owner must be SELLER+; collaborator/admin unchanged |
| `DELETE /api/items/[id]` | owner must be SELLER+; admin unchanged |

Collaborators (invited via `/my/collaborators`) retain edit access on the items they were invited to, regardless of their own role.

## UI Gating

- `/my/items/new` — server-redirects `USER` to home or a "contact admin" page
- "New Item" button — hidden for `USER` role
- `/my/items` — accessible but shows empty state with message if buyer (no items to show)
- `/my/collaborators` — gated to SELLER+

## Admin Dashboard

`/admin/users` role selector gains a `SELLER` option between `ADMIN` and `USER`. No new page required.

## Out of Scope

- Self-service seller request flow (admin-only promotion for now)
- Per-store seller roles (store membership roles are separate)
- Collaborator role restriction (invited collaborators keep edit access regardless of base role)
