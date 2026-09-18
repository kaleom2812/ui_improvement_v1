"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, ArrowLeft } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

// Chrome for the audit + checkout journey.
//
// Slim progress-bar treatment from GEO-UI-Version-4 (audit/AuditLayout.jsx),
// replacing the previous five-chip stepper. The step → route mapping and the
// derived progress percentage are unchanged. The special case where /audit/[id]
// bypasses this chrome is handled upstream in src/app/audit/layout.tsx.

export const FLOW_STEPS = [
  { key: "setup", label: "Set up", match: ["/audit"] },
  { key: "analyze", label: "Analyze", match: ["/audit/processing"] },
  { key: "results", label: "Free results", match: ["/audit/results"] },
  { key: "report", label: "Report", match: ["/audit/report"] },
  { key: "checkout", label: "Checkout", match: ["/checkout", "/checkout/success"] },
];

// Audit-flow pages that get a "Back" control in the header. /audit already has
// its own in-wizard Back (step 2 → step 1); /checkout/success is excluded (no
// going back after payment).
const BACK_ENABLED = ["/audit/processing", "/audit/results", "/audit/report", "/checkout"];

// Pages whose Back must go to a fixed step, not browser history — otherwise
// arriving at /audit/report from the dashboard would send Back to the dashboard.
const BACK_TARGET: Record<string, string> = {
  "/audit/results": "/audit",
  "/audit/report": "/audit/results",
};

export function AuditStepper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = FLOW_STEPS.findIndex((s) => s.match.includes(pathname));
  const pct = activeIndex >= 0 ? ((activeIndex + 1) / FLOW_STEPS.length) * 100 : 0;
  const currentLabel = activeIndex >= 0 ? FLOW_STEPS[activeIndex].label : "";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-3 z-overlay rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="site-container flex h-14 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-3">
            {BACK_ENABLED.includes(pathname) && (
              <button
                type="button"
                onClick={() => {
                  const target = BACK_TARGET[pathname];
                  if (target) router.push(target);
                  else router.back();
                }}
                className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
              >
                <ArrowLeft size={13} weight="bold" /> Back
              </button>
            )}
            {currentLabel && (
              <span className="hidden text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3 sm:inline">
                {currentLabel}
              </span>
            )}
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
            >
              <X size={13} weight="bold" /> Exit
            </Link>
          </div>
        </div>
        <div className="h-1 w-full bg-line">
          <div
            className="h-1 rounded-r-full bg-brand transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
