import type { ReactNode } from "react";

/** Shared "browser chrome" wrapper for product-UI mockups on the marketing
 *  site (hero preview, the 01/Understand story visual) — a lightweight stand-in
 *  for a real screenshot of the product. */
export function MockupFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
      <div className="flex items-center gap-2 border-b border-line bg-subtle/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-neg/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-pos/60" />
        <span className="ml-2 truncate text-2xs font-medium text-ink-3">{label}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
