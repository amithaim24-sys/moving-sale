-- CreateTable
CREATE TABLE "ItemLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemLike_userId_createdAt_idx" ON "ItemLike"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemLike_userId_itemId_key" ON "ItemLike"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "ItemLike" ADD CONSTRAINT "ItemLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLike" ADD CONSTRAINT "ItemLike_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
