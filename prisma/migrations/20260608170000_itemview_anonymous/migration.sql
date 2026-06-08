-- Record an ItemView row for EVERY counted view, including anonymous visitors, so
-- the admin "views over time" trend reflects all traffic (it previously logged only
-- signed-in viewers, leaving the chart flat while the total-views counter kept rising).
-- Make userId nullable (null = anonymous) and switch the FK to ON DELETE SET NULL so
-- a deleted user's views survive as anonymous instead of disappearing.
ALTER TABLE "ItemView" DROP CONSTRAINT "ItemView_userId_fkey";

ALTER TABLE "ItemView" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
