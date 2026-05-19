import Link from "next/link";

export default function EmptyState({
  emoji,
  title,
  description,
  cta,
}: {
  emoji: string;
  title: string;
  description?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <div className="text-5xl" aria-hidden="true">{emoji}</div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {cta && (
        <Link href={cta.href} className="btn-primary mt-2">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
