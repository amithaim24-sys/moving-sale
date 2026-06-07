-- CreateTable
CREATE TABLE "StoreMembership" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "displayName" TEXT,
    "whatsappPhone" TEXT,
    "city" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreMembership_storeId_userId_key" ON "StoreMembership"("storeId", "userId");
CREATE INDEX "StoreMembership_storeId_createdAt_idx" ON "StoreMembership"("storeId", "createdAt");
CREATE INDEX "StoreMembership_userId_idx" ON "StoreMembership"("userId");

-- AddForeignKey
ALTER TABLE "StoreMembership" ADD CONSTRAINT "StoreMembership_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreMembership" ADD CONSTRAINT "StoreMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: per-store visit attribution
ALTER TABLE "Visit" ADD COLUMN "storeId" TEXT;
CREATE INDEX "Visit_storeId_createdAt_idx" ON "Visit"("storeId", "createdAt");

-- Backfill: every existing store owner becomes an ADMIN member of their own store.
INSERT INTO "StoreMembership" ("id", "storeId", "userId", "role", "banned", "createdAt")
SELECT gen_random_uuid()::text, s."id", s."ownerId", 'ADMIN', false, CURRENT_TIMESTAMP
FROM "Store" s;
