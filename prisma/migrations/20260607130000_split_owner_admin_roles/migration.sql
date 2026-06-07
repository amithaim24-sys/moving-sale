-- Split the single platform admin role into OWNER (super-admin) and ADMIN
-- (delegated: users/items/analytics). Every existing admin is the main owner, so
-- promote them to OWNER. New delegated admins are granted the ADMIN role from the UI.
UPDATE "User" SET "role" = 'OWNER' WHERE "role" = 'ADMIN';
