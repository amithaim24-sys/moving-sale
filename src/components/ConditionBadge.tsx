import { useTranslations } from "next-intl";

type Condition = "NEW" | "LIKE_NEW" | "USED";

// NEW is the headline state — buyers care most about it, so it gets a louder,
// solid, attention-grabbing treatment. LIKE_NEW and USED stay quiet and neutral.
const STYLES: Record<Condition, string> = {
  NEW: "bg-emerald-600 text-white ring-1 ring-emerald-700 shadow-sm dark:bg-emerald-500 dark:ring-emerald-400",
  LIKE_NEW:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800",
  USED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

export default function ConditionBadge({ condition }: { condition: string }) {
  const t = useTranslations("item");
  const key = (["NEW", "LIKE_NEW", "USED"].includes(condition) ? condition : "USED") as Condition;
  const isNew = key === "NEW";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[key]}`}
    >
      {isNew && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.8l1.2-6.6L2.5 9l6.6-.9L12 2z" />
        </svg>
      )}
      {t(`condition.${key}`)}
    </span>
  );
}
