-- Speed up free-text catalog search. The catalog search filter is a case-insensitive
-- "contains" on title/description, which Postgres executes as ILIKE '%q%'. The leading
-- wildcard means no btree index can serve it, so every search is a sequential scan that
-- grows with the catalog. pg_trgm GIN indexes accelerate exactly this pattern, so the
-- existing Prisma query becomes index-backed with no query change.
--
-- Plain CREATE INDEX (not CONCURRENTLY) because Prisma runs each migration inside a
-- transaction, where CONCURRENTLY is not allowed. The brief lock is acceptable at the
-- current catalog size.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Item_title_trgm_idx" ON "Item" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Item_description_trgm_idx" ON "Item" USING gin ("description" gin_trgm_ops);
