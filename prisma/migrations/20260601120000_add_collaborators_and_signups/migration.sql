-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveIfUnsoldSignup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveIfUnsoldSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collaborator_collaboratorId_idx" ON "Collaborator"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_ownerId_collaboratorId_key" ON "Collaborator"("ownerId", "collaboratorId");

-- CreateIndex
CREATE INDEX "GiveIfUnsoldSignup_itemId_createdAt_idx" ON "GiveIfUnsoldSignup"("itemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiveIfUnsoldSignup_itemId_userId_key" ON "GiveIfUnsoldSignup"("itemId", "userId");

-- AddForeignKey
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveIfUnsoldSignup" ADD CONSTRAINT "GiveIfUnsoldSignup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveIfUnsoldSignup" ADD CONSTRAINT "GiveIfUnsoldSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
