-- AlterTable
ALTER TABLE "Item" ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ItemClick" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'CONTACT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemClick_itemId_createdAt_idx" ON "ItemClick"("itemId", "createdAt");
CREATE INDEX "ItemClick_kind_createdAt_idx" ON "ItemClick"("kind", "createdAt");
CREATE INDEX "ItemClick_createdAt_idx" ON "ItemClick"("createdAt");
CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");
CREATE INDEX "Visit_visitorId_createdAt_idx" ON "Visit"("visitorId", "createdAt");

-- AddForeignKey
ALTER TABLE "ItemClick" ADD CONSTRAINT "ItemClick_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
