-- CreateTable
CREATE TABLE "WebsiteRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteRequest_status_createdAt_idx" ON "WebsiteRequest"("status", "createdAt");
CREATE INDEX "WebsiteRequest_createdAt_idx" ON "WebsiteRequest"("createdAt");
