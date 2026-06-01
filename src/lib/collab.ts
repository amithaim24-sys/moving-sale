import { prisma } from "./prisma";

// Account-level collaboration: a user may be invited by other account owners to
// co-manage ("edit old and new") all of that owner's items. These helpers answer
// "which accounts can this user edit on behalf of?" and "can this user edit this item?".

// IDs of the accounts that have granted `userId` collaborator access.
export async function getCollaboratorOwnerIds(userId: string): Promise<string[]> {
  const rows = await prisma.collaborator.findMany({
    where: { collaboratorId: userId },
    select: { ownerId: true },
  });
  return rows.map((r) => r.ownerId);
}

// True when `userId` may edit items owned by `ownerId` — either they ARE the owner
// or the owner has added them as a collaborator.
export async function canEditOwner(userId: string, ownerId: string): Promise<boolean> {
  if (userId === ownerId) return true;
  const row = await prisma.collaborator.findUnique({
    where: { ownerId_collaboratorId: { ownerId, collaboratorId: userId } },
    select: { id: true },
  });
  return !!row;
}
