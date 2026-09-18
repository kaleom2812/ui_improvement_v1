"use client";

// Light / dark toggle. Visual reference: GEO-UI-Version-4 src/components/ThemeToggle.jsx.
// Wired into the production Nav in Phase 2.

import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // Avoid a hydration mismatch: the server renders with the default ("light"),
  // the client may resolve to "dark" from localStorage. Render a stable icon
  // until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Dark theme" : "Light theme"}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-line-2 text-ink-2 transition-colors hover:border-brand hover:text-brand ${className}`}
    >
      <Icon size={16} weight="bold" />
    </button>
  );
}
