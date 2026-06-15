-- Promote existing USERs who own at least one item to SELLER.
-- New sign-ups default to USER (buyer); admins promote them to SELLER manually.
UPDATE "User"
SET role = 'SELLER'
WHERE role = 'USER'
  AND id IN (SELECT DISTINCT "ownerId" FROM "Item");
