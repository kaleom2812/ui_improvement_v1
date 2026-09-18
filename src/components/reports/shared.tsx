import type { ReactNode } from "react";
import { tone as toneMap, type Tone } from "@/lib/format";

/** Section header used across every dashboard / report section. */
export function DashHead({ title, lede, action }: { title: ReactNode; lede?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
        {lede && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-2">{lede}</p>}
      </div>
      {action}
    </header>
  );
}

/** Instrument panel with an optional title / action bar. */
export function Panel({
  title,
  children,
  className = "",
  action,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-bold text-ink">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Big-number tile for the headline-metric row. */
export function MetricTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <div className="card p-4">
      <p className={`data-fig text-2xl font-semibold ${tone === "neutral" ? "text-ink" : t.text}`}>{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-2">{label}</p>
      {sub && <p className="mt-0.5 text-2xs text-ink-3">{sub}</p>}
    </div>
  );
}
