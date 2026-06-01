-- CreateTable
CREATE TABLE "ItemView" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemView_itemId_createdAt_idx" ON "ItemView"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemView_userId_createdAt_idx" ON "ItemView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemView_createdAt_idx" ON "ItemView"("createdAt");

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
