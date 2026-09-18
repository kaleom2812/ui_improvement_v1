"use client";

// Ported from GEO-UI-Version-5/src/components/primitives.jsx (typed).
// Animation is CSS-driven (see globals.css .reveal) instead of framer-motion.

import { useState, type ReactNode, type ElementType } from "react";
import { CaretDown, Info } from "@phosphor-icons/react";
import { useInView } from "@/lib/hooks";
import { tone as toneMap, type Tone } from "@/lib/format";

/* ---------- Reveal ---------- */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
}) {
  const [ref, inView] = useInView();
  const Comp = Tag as ElementType;
  return (
    <Comp
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Comp>
  );
}

/* ---------- Badge / Chip ---------- */
export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.04em] ${t.bg} ${t.border} ${t.text} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}

export function Pill({
  children,
  active = false,
  ...rest
}: { children: ReactNode; active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-brand bg-brand-soft text-brand-dark"
          : "border-line-2 bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------- Section heading ---------- */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  id,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  id?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      id={id}
      className={`${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} scroll-mt-24 ${className}`}
    >
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {lede && <p className="mt-3 text-[0.975rem] leading-relaxed text-ink-2">{lede}</p>}
    </header>
  );
}

/* ---------- Stat ---------- */
export function Stat({
  value,
  label,
  sub,
  tone = "neutral",
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <div>
      <p className={`data-fig text-2xl font-semibold ${tone === "neutral" ? "text-ink" : t.text}`}>{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-2">{label}</p>
      {sub && <p className="mt-0.5 text-2xs text-ink-3">{sub}</p>}
    </div>
  );
}

/* ---------- Callout ---------- */
export function Callout({
  icon: Icon,
  title,
  tone = "brand",
  children,
}: {
  icon?: ElementType;
  title?: ReactNode;
  tone?: Tone;
  children: ReactNode;
}) {
  const t = toneMap[tone] || toneMap.brand;
  return (
    <aside className={`rounded-lg border p-4 ${t.bg} ${t.border}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <span className={`mt-0.5 shrink-0 ${t.text}`}>
            <Icon size={18} weight="bold" />
          </span>
        )}
        <div>
          {title && <p className={`text-sm font-semibold ${t.text}`}>{title}</p>}
          <div className="mt-0.5 text-sm leading-relaxed text-ink-2">{children}</div>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Story arc: Problem -> Evidence -> Impact -> Recommendation -> Action ---------- */
const STAGE_TONE: Record<string, string> = {
  Problem: "text-neg",
  Evidence: "text-ink",
  Impact: "text-warn",
  Recommendation: "text-brand-dark",
  Action: "text-pos",
};
export function StoryArc({
  stages,
  compact = false,
}: {
  stages: Array<{ stage: string; text: ReactNode }>;
  compact?: boolean;
}) {
  return (
    <ol className="relative space-y-4 border-l border-line-2 pl-5">
      {stages.map((s, i) => (
        <li key={i} className="relative">
          <span aria-hidden="true" className="absolute -left-[27px] top-1 h-2 w-2 border border-canvas bg-signal" />
          <p className={`eyebrow ${STAGE_TONE[s.stage] || "text-ink-3"}`}>{s.stage}</p>
          <p className={`mt-1 leading-relaxed text-ink-2 ${compact ? "text-sm" : "text-[0.95rem]"}`}>{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Disclose (accordion) — CSS grid height transition ---------- */
export function Disclose({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-ink hover:bg-subtle"
      >
        {summary}
        <span className={`shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`}>
          <CaretDown size={16} weight="bold" />
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line px-4 py-4 text-sm leading-relaxed text-ink-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Key/value list ---------- */
export function KeyValueList({ rows }: { rows: Array<{ label: ReactNode; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[13rem_1fr] sm:gap-6">
          <dt className="text-sm text-ink-3">{r.label}</dt>
          <dd className="text-sm text-ink-2">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Data table ---------- */
export interface Column<T> {
  key: string;
  label: ReactNode;
  align?: "right";
  mono?: boolean;
  render?: (row: T) => ReactNode;
}
export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  caption?: ReactNode;
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        {caption && (
          <caption className="border-b border-line bg-subtle px-3 py-2 text-left text-xs font-medium text-ink-3">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="border-b border-line bg-subtle/60">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 ${
                  c.align === "right" ? "text-right" : ""
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i} className="align-top transition-colors hover:bg-subtle/50">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2.5 ${c.align === "right" ? "text-right" : ""} ${
                    c.mono ? "data-fig text-ink" : "text-ink-2"
                  } ${row.self && c.key === columns[0].key ? "font-semibold text-brand-dark" : ""}`}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Code block ---------- */
export function CodeBlock({ code, label }: { code: string; label?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line-2 bg-[#0E1B25]">
      {label && (
        <div className="border-b border-white/10 px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-white/50">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[0.78rem] leading-relaxed text-[#DCE6EA]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ---------- EmptyState — shown when the backend has not (yet) supplied a field ---------- */
export function EmptyState({
  title,
  children,
  icon: Icon = Info,
}: {
  title: ReactNode;
  children?: ReactNode;
  icon?: ElementType;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-2 bg-surface/40 px-6 py-10 text-center">
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-full border border-line-2 text-ink-3">
        <Icon size={16} weight="bold" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-ink-3">{children}</p>}
    </div>
  );
}
