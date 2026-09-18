"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Theme context — light default + `.dark` class on <html>.
//
// Visual system migrated from the GEO-UI-Version-4 reference. Follows the same
// minimal client-context pattern as AuditFlowProvider (src/state/audit-flow.tsx)
// and reuses the production `usePersistentState` helper (src/lib/hooks.ts) — no
// new dependency, no V4 state architecture.
//
// The persisted value is also read by a tiny pre-paint script in
// src/app/layout.tsx so the correct class is on <html> before first paint.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect } from "react";
import { usePersistentState } from "@/lib/hooks";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "phazeai:theme";

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>(THEME_STORAGE_KEY, "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const value: ThemeValue = {
    theme,
    setTheme,
    toggle: () => setTheme((prev: Theme) => (prev === "dark" ? "light" : "dark")),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
