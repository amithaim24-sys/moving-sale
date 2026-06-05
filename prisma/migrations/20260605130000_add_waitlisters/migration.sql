-- CreateTable
CREATE TABLE "Waitlister" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlister_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Waitlister_itemId_createdAt_idx" ON "Waitlister"("itemId", "createdAt");

-- AddForeignKey
ALTER TABLE "Waitlister" ADD CONSTRAINT "Waitlister_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
