-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "event" TEXT NOT NULL,
    "outcome" TEXT,
    "message" TEXT,
    "itemId" TEXT,
    "userId" TEXT,
    "path" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");
CREATE INDEX "EventLog_event_createdAt_idx" ON "EventLog"("event", "createdAt");
CREATE INDEX "EventLog_level_createdAt_idx" ON "EventLog"("level", "createdAt");
