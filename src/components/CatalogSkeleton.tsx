// Streaming placeholder shown (via <Suspense>) while the catalog's data is
// fetched on the server. It mirrors the real CatalogView layout — a filter row
// plus the responsive card grid — so the page shell paints immediately and the
// grid swaps in without a layout shift.
export default function CatalogSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* search + filter chips */}
      <div className="flex flex-col gap-2">
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="flex gap-2">
          {[44, 56, 56].map((w, i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>

      {/* card grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
          >
            <div className="aspect-square w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
