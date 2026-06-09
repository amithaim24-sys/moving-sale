import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/eventLog";

// Record a single public item view: bump the aggregate counter AND append a
// timestamped view event for the trend chart. The two writes are independent, so
// we run them together and — crucially — log the reason if either fails instead of
// swallowing it. That way the aggregate `viewCount` and the `ItemView` log can't
// drift apart invisibly (which would silently skew admin CTR/trend numbers).
//
// Meant to be invoked from `after()` so it runs after the response is sent and
// never adds write latency to the item-page render.
export async function recordView(itemId: string, viewerId: string | null): Promise<void> {
  const results = await Promise.allSettled([
    // Aggregate counter (includes anonymous visitors).
    prisma.item.update({ where: { id: itemId }, data: { viewCount: { increment: 1 } } }),
    // Timestamped view event for the analytics trend — recorded for EVERY view.
    // userId is null for anonymous visitors; the "who viewed what" admin log filters
    // those out, but the views-over-time chart counts them all.
    prisma.itemView.create({ data: { itemId, userId: viewerId } }),
  ]);

  const reasons = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));
  if (reasons.length) {
    void logEvent({
      event: "item_view",
      outcome: "error",
      level: "WARN",
      itemId,
      userId: viewerId,
      message: reasons.join("; "),
    });
  }
}
