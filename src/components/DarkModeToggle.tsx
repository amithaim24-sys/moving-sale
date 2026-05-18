"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? null;
    const initial: Theme =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("theme", next);
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={mounted ? isDark : undefined}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-slate-300 bg-slate-200 transition-colors hover:bg-slate-300 dark:border-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
    >
      {/* sliding knob */}
      <span
        className={`absolute top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-300 transition-all dark:bg-slate-900 dark:ring-slate-600 ${
          isDark ? "start-[calc(100%-2rem)]" : "start-1"
        }`}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-300" fill="currentColor" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="currentColor" aria-hidden="true">
            <path d="M12 4a1 1 0 011 1v2a1 1 0 11-2 0V5a1 1 0 011-1zm0 12a4 4 0 100-8 4 4 0 000 8zm7-5a1 1 0 110 2h-2a1 1 0 110-2h2zM7 12a1 1 0 11-2 0H3a1 1 0 110-2h2a1 1 0 012 0v2zm10.66 5.66a1 1 0 11-1.42 1.42l-1.41-1.41a1 1 0 011.41-1.42l1.42 1.41zM7.17 6.34a1 1 0 11-1.41 1.42L4.34 6.34a1 1 0 011.42-1.41l1.41 1.41zm10.49-1.41a1 1 0 010 1.41l-1.42 1.41a1 1 0 11-1.41-1.41l1.41-1.41a1 1 0 011.42 0zM7.17 17.66l-1.41 1.42a1 1 0 11-1.42-1.42l1.41-1.41a1 1 0 011.42 1.41zM12 17a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z" />
          </svg>
        )}
      </span>
      {/* background icons (peek out from behind the knob) */}
      <span className="pointer-events-none ms-2 text-amber-500 opacity-70" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M12 4a1 1 0 011 1v2a1 1 0 11-2 0V5a1 1 0 011-1zm0 12a4 4 0 100-8 4 4 0 000 8zm7-5a1 1 0 110 2h-2a1 1 0 110-2h2zM7 12a1 1 0 11-2 0H3a1 1 0 110-2h2a1 1 0 012 0v2z" />
        </svg>
      </span>
      <span className="pointer-events-none ms-auto me-2 text-slate-500 opacity-70 dark:text-slate-300" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      </span>
    </button>
  );
}
