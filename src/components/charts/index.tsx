"use client";

// Hand-built SVG chart kit — ported from GEO-UI-Version-5/src/components/charts/index.jsx.
// No charting library. Entrance animation is CSS-driven (keyed off useInView),
// replacing the prototype's framer-motion usage. Same export names / prop shapes.

import { useId, useState, type ReactNode } from "react";
import { useInView, useReducedMotion } from "@/lib/hooks";

// Colours resolve to the `--c-*` theme tokens (src/app/globals.css) so charts
// retheme with light / dark without a re-render.
const C = {
  brand: "rgb(var(--c-brand))",
  brandDim: "rgb(var(--c-brand-dim))",
  ink: "rgb(var(--c-ink))",
  line: "rgb(var(--c-line))",
  line2: "rgb(var(--c-line-2))",
  mut: "rgb(var(--c-ink-3))",
  pos: "rgb(var(--c-pos))",
  warn: "rgb(var(--c-warn))",
  neg: "rgb(var(--c-neg))",
};
const EASE = "cubic-bezier(0.16,1,0.3,1)";

/** Round SVG coordinates so server and client render byte-identical strings
 *  (avoids float-precision hydration mismatches). */
const r2 = (n: number) => Math.round(n * 1000) / 1000;

function scoreColor(n: number) {
  return n >= 70 ? C.pos : n >= 50 ? C.warn : C.neg;
}

/** Display a score to at most 1 decimal place, without forcing a trailing
 *  ".0" on whole numbers (66.8 -> "66.8", 70 -> "70"). */
function formatScoreValue(n: number): string {
  return String(Number(n.toFixed(1)));
}

/* ---------------- ScoreDial ---------------- */
export function ScoreDial({
  value,
  max = 100,
  size = 200,
  label = "GEO score",
  grade,
  showValue = true,
  displayValue,
  secondaryText,
  active = true,
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  grade?: string;
  showValue?: boolean;
  displayValue?: string;
  secondaryText?: string;
  active?: boolean;
}) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const stroke = Math.round(size * 0.075);
  const r = size / 2 - stroke - 4;
  const cx = size / 2;
  const cy = size / 2;
  const start = 135;
  const sweep = 270;
  const frac = Math.max(0, Math.min(1, value / max));
  const polar = (deg: number, rr = r): [number, number] => [
    r2(cx + rr * Math.sin((deg * Math.PI) / 180)),
    r2(cy - rr * Math.cos((deg * Math.PI) / 180)),
  ];
  const arcPath = (f: number) => {
    const [x0, y0] = polar(start);
    const [x1, y1] = polar(start + sweep * f);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${sweep * f > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const col = scoreColor(value);
  const on = inView || reduced;

  return (
    <figure
      ref={ref}
      className="relative mx-auto"
      style={{ maxWidth: size }}
      role="img"
      aria-label={displayValue
        ? `${label}: ${displayValue}; ${secondaryText || `${formatScoreValue(value)} out of ${max}`}`
        : `${label}: ${formatScoreValue(value)} out of ${max}${grade ? `, grade ${grade}` : ""}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full" aria-hidden="true">
        <path d={arcPath(1)} fill="none" stroke={C.line} strokeWidth={stroke} strokeLinecap="round" />
        {Array.from({ length: 11 }).map((_, i) => {
          const a = start + (sweep * i) / 10;
          const [xa, ya] = polar(a, r - stroke / 2 - 3);
          const [xb, yb] = polar(a, r - stroke / 2 - 9);
          return <line key={i} x1={xa} y1={ya} x2={xb} y2={yb} stroke={C.line2} strokeWidth={1} />;
        })}
        {active && <path
          d={arcPath(frac)}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          style={{
            strokeDashoffset: on ? 0 : 1,
            transition: reduced ? "none" : `stroke-dashoffset 1.1s ${EASE}`,
          }}
        />}
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 text-center">
          <span className="data-fig font-semibold leading-none text-ink" style={{ fontSize: displayValue ? size * 0.13 : size * 0.28 }}>
            {displayValue ?? (on ? formatScoreValue(value) : 0)}
          </span>
          <span className="mt-1 text-2xs font-medium uppercase tracking-[0.1em] text-ink-3">
            {secondaryText ?? <>
              / {max}
              {grade ? ` · ${grade}` : ""}
            </>}
          </span>
        </div>
      )}
    </figure>
  );
}

/* ---------------- Meter ---------------- */
export function Meter({
  value,
  max = 100,
  height = 8,
  showScoreColor = true,
  colorOverride,
}: {
  value: number;
  max?: number;
  height?: number;
  showScoreColor?: boolean;
  colorOverride?: string;
}) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const w = Math.max(0, Math.min(1, value / max)) * 100;
  const color = colorOverride || (showScoreColor ? scoreColor(value) : C.brand);
  const on = inView || reduced;
  return (
    <span ref={ref} className="relative block w-full overflow-hidden rounded-full bg-line" style={{ height }}>
      <span
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: color,
          width: on ? `${w}%` : 0,
          transition: reduced ? "none" : `width 0.8s ${EASE}`,
        }}
      />
    </span>
  );
}

/* ---------------- BarList ---------------- */
export function BarList({
  items,
  max,
  unit = "%",
  valueFmt,
  labelWidth = "9rem",
}: {
  items: Array<{ name: string; value: number; self?: boolean }>;
  max?: number;
  unit?: string;
  valueFmt?: (v: number) => ReactNode;
  labelWidth?: string;
}) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const top = max ?? Math.max(1, ...items.map((d) => d.value));
  const on = inView || reduced;
  return (
    <ul
      ref={ref}
      className="flex flex-col gap-2.5"
      role="img"
      aria-label={items.map((d) => `${d.name}: ${valueFmt ? "" : d.value + unit}`).join(", ")}
    >
      {items.map((d, i) => (
        <li key={d.name + i} className="grid items-center gap-3" style={{ gridTemplateColumns: `${labelWidth} 1fr 3rem` }}>
          <span className={`truncate text-sm ${d.self ? "font-semibold text-brand-dark" : "text-ink-2"}`}>{d.name}</span>
          <span className="relative block h-2.5 rounded-full bg-line">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: d.self ? C.brand : C.brandDim,
                width: on ? `${(d.value / top) * 100}%` : 0,
                transition: reduced ? "none" : `width 0.7s ${EASE} ${i * 0.04}s`,
              }}
            />
          </span>
          <span className={`data-fig text-right text-sm ${d.self ? "text-brand-dark" : "text-ink"}`}>
            {valueFmt ? valueFmt(d.value) : `${d.value}${unit}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- LineTrend ---------------- */
export function LineTrend({
  series,
  height = 190,
  yMax = 100,
  unit = "",
  yTicks = [0, 25, 50, 75, 100],
}: {
  series: Array<{ name: string; color?: string; dashed?: boolean; points: Array<{ x: string; y: number }> }>;
  height?: number;
  yMax?: number;
  unit?: string;
  yTicks?: number[];
}) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [hover, setHover] = useState<number | null>(null);
  const w = 560;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const xs = series[0].points.map((p) => p.x);
  const X = (i: number) => r2(padL + (i / Math.max(1, xs.length - 1)) * (w - padL - padR));
  const Y = (v: number) => r2(padT + (1 - v / yMax) * (height - padT - padB));
  const line = (pts: Array<{ x: string; y: number }>) => pts.map((p, i) => `${i ? "L" : "M"} ${X(i)} ${Y(p.y)}`).join(" ");
  const on = inView || reduced;

  return (
    <figure ref={ref} role="img" aria-label={series.map((s) => s.name).join(", ")}>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" onMouseLeave={() => setHover(null)}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke={C.line} strokeWidth={1} />
            <text x={padL - 6} y={Y(t) + 3} textAnchor="end" fill={C.mut} style={{ font: "500 9px var(--font-geist-mono, monospace)" }}>
              {t}
            </text>
          </g>
        ))}
        {xs.map((x, i) => (
          <text key={x + i} x={X(i)} y={height - 6} textAnchor="middle" fill={C.mut} style={{ font: "500 9px var(--font-geist-mono, monospace)" }}>
            {x}
          </text>
        ))}
        {series.map((s, si) => (
          <g key={s.name}>
            {si === 0 && (
              <path d={`${line(s.points)} L ${X(s.points.length - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`} fill={C.brand} fillOpacity={0.08} />
            )}
            <path
              d={line(s.points)}
              fill="none"
              stroke={s.color || (si === 0 ? C.brand : C.mut)}
              strokeWidth={si === 0 ? 2.2 : 1.5}
              strokeDasharray={s.dashed ? "4 4" : "1"}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{
                strokeDashoffset: on ? 0 : 1,
                transition: reduced ? "none" : `stroke-dashoffset 1s ease-in-out ${si * 0.1}s`,
              }}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={X(i)} cy={Y(p.y)} r={2.5} fill={s.color || (si === 0 ? C.brand : C.mut)} />
            ))}
          </g>
        ))}
        {xs.map((x, i) => (
          <rect
            key={i}
            x={X(i) - 16}
            y={0}
            width={32}
            height={height}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${x}: ${series.map((s) => `${s.name} ${s.points[i].y}${unit}`).join(", ")}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          />
        ))}
        {hover != null && (
          <g pointerEvents="none">
            <line x1={X(hover)} x2={X(hover)} y1={padT} y2={height - padB} stroke={C.line2} strokeDasharray="3 3" />
            {series.map((s) => (
              <circle key={s.name} cx={X(hover)} cy={Y(s.points[hover].y)} r={4} fill="rgb(var(--c-surface))" stroke={s.color || C.brand} strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover != null && (
        <p className="mt-1 text-center text-2xs text-ink-2">
          {xs[hover]} —{" "}
          {series.map((s, i) => (
            <span key={s.name}>
              {i ? " · " : ""}
              {s.name} <strong className="text-ink">{s.points[hover].y}{unit}</strong>
            </span>
          ))}
        </p>
      )}
    </figure>
  );
}

/* ---------------- RadarChart ---------------- */
export function RadarChart({
  axes,
  series,
  size = 300,
}: {
  axes: string[];
  series: Array<{ name: string; color?: string; values: number[] }>;
  size?: number;
}) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 58;
  const n = axes.length;
  const pt = (i: number, f: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [r2(cx + r * f * Math.cos(a)), r2(cy + r * f * Math.sin(a))];
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(",")).join(" ");
  const on = inView || reduced;
  return (
    <figure ref={ref} role="img" aria-label={series.map((s) => s.name).join(", ")}>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[340px]">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <polygon key={g} points={poly(axes.map(() => g))} fill="none" stroke={C.line} strokeWidth={1} />
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 1);
          const [lx, ly] = pt(i, 1.2);
          return (
            <g key={a + i}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={C.line} strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                textAnchor={Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end"}
                dominantBaseline="middle"
                fill={C.mut}
                style={{ font: "500 9px var(--font-geist-sans, sans-serif)" }}
              >
                {a}
              </text>
            </g>
          );
        })}
        {series.map((s, si) => (
          <polygon
            key={s.name}
            points={poly(s.values)}
            fill={s.color || C.brand}
            fillOpacity={si === 0 ? 0.14 : 0.05}
            stroke={s.color || (si === 0 ? C.brand : C.mut)}
            strokeWidth={2}
            strokeDasharray={si === 0 ? undefined : "4 3"}
            style={{
              opacity: on ? 1 : 0,
              transform: on ? "scale(1)" : "scale(0.85)",
              transformOrigin: "center",
              transition: reduced ? "none" : `opacity 0.6s ${EASE} ${si * 0.12}s, transform 0.6s ${EASE} ${si * 0.12}s`,
            }}
          />
        ))}
      </svg>
    </figure>
  );
}

/* ---------------- DonutChart ---------------- */
export function DonutChart({
  items,
  unit = "%",
  centerLabel,
}: {
  items: Array<{ name: string; value: number; self?: boolean }>;
  unit?: string;
  centerLabel?: { value: ReactNode; label: ReactNode };
}) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const gid = useId();
  const size = 200;
  const stroke = 24;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const total = Math.max(1, items.reduce((s, d) => s + d.value, 0));
  let offset = 0;
  // Categorical ramp — warm amber/neutral mid-tones that read on light and dark.
  const palette = ["#A8631A", "#C98A3E", "#D9AD6B", "#8A7A63", "#B4A38A", "#6B5A44", "#E3D3B8"];
  const on = inView || reduced;
  return (
    <figure
      ref={ref}
      className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7"
      role="img"
      aria-label={items.map((d) => `${d.name}: ${((d.value / total) * 100).toFixed(0)}${unit}`).join(", ")}
    >
      <div className="relative shrink-0" style={{ width: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full -rotate-90">
          <defs>
            <pattern id={`${gid}-self`} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="rgb(var(--c-brand))" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--c-canvas))" strokeWidth="2.5" />
            </pattern>
          </defs>
          {items.map((d, i) => {
            const dash = r2((d.value / total) * c);
            const node = (
              <circle
                key={d.name + i}
                cx={size / 2}
                cy={size / 2}
                r={r2(r)}
                fill="none"
                stroke={d.self ? `url(#${gid}-self)` : palette[i % palette.length]}
                strokeWidth={active === i ? stroke + 4 : stroke}
                strokeDasharray={`${dash} ${r2(c - dash)}`}
                strokeDashoffset={r2(-offset)}
                style={{ opacity: on ? 1 : 0, transition: reduced ? "none" : `opacity 0.4s ${i * 0.05}s, stroke-width .18s` }}
              />
            );
            offset += dash;
            return node;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="data-fig text-xl font-semibold text-ink">
            {active != null ? `${((items[active].value / total) * 100).toFixed(0)}%` : centerLabel?.value}
          </span>
          <span className="max-w-[6rem] text-2xs uppercase leading-tight tracking-wide text-ink-3">
            {active != null ? items[active].name : centerLabel?.label}
          </span>
        </div>
      </div>
      <ul className="grid w-full gap-1 text-sm">
        {items.map((d, i) => (
          <li key={d.name + i}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="flex w-full items-center gap-2.5 rounded px-1.5 py-1 text-left hover:bg-subtle focus-visible:bg-subtle"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: d.self ? "rgb(var(--c-brand))" : palette[i % palette.length], outline: d.self ? "1px solid rgb(var(--c-ink))" : "none" }}
              />
              <span className={`flex-1 ${d.self ? "font-semibold text-brand-dark" : "text-ink-2"}`}>{d.name}</span>
              <span className="data-fig text-ink">
                {((d.value / total) * 100).toFixed(0)}
                {unit}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ---------------- QuadrantChart (impact / effort) ---------------- */
export function QuadrantChart({
  items,
}: {
  items: Array<{ id: number; title: string; impact: number; effort: number; type: string }>;
}) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const size = 400;
  const pad = 42;
  const X = (v: number) => r2(pad + ((v - 0.5) / 5) * (size - pad * 1.2));
  const Y = (v: number) => r2(size - pad - ((v - 0.5) / 5) * (size - pad * 1.4));
  const on = inView || reduced;
  return (
    <figure ref={ref} role="img" aria-label={items.map((d) => `${d.title}: impact ${d.impact}, effort ${d.effort}`).join(". ")}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full">
        <rect x={pad} y={pad * 0.4} width={X(3) - pad} height={Y(3) - pad * 0.4} fill="rgb(var(--c-brand-soft))" opacity={0.6} />
        {[1, 2, 3, 4, 5].map((g) => (
          <g key={g}>
            <line x1={X(g)} y1={pad * 0.4} x2={X(g)} y2={size - pad} stroke="rgb(var(--c-line))" strokeWidth={0.75} />
            <line x1={pad} y1={Y(g)} x2={size - pad * 0.4} y2={Y(g)} stroke="rgb(var(--c-line))" strokeWidth={0.75} />
          </g>
        ))}
        <line x1={X(3)} y1={pad * 0.4} x2={X(3)} y2={size - pad} stroke="rgb(var(--c-line-2))" strokeDasharray="4 4" />
        <line x1={pad} y1={Y(3)} x2={size - pad * 0.4} y2={Y(3)} stroke="rgb(var(--c-line-2))" strokeDasharray="4 4" />
        <text x={X(0.7)} y={Y(4.7)} fill="rgb(var(--c-brand-dark))" style={{ font: "600 10px var(--font-geist-sans, sans-serif)" }}>Quick wins</text>
        <text x={X(3.3)} y={Y(4.7)} fill="rgb(var(--c-ink-3))" style={{ font: "600 10px var(--font-geist-sans, sans-serif)" }}>Major projects</text>
        <text x={X(0.5)} y={size - pad + 15} fill="rgb(var(--c-ink-3))" style={{ font: "500 9px var(--font-geist-mono, monospace)" }}>effort →</text>
        <text x={pad - 8} y={Y(4.9)} textAnchor="end" fill="rgb(var(--c-ink-3))" style={{ font: "500 9px var(--font-geist-mono, monospace)" }}>impact</text>
        {items.map((d, i) => {
          const j = ((i % 3) - 1) * 5;
          return (
            <g
              key={d.id}
              style={{
                opacity: on ? 1 : 0,
                transform: on ? "scale(1)" : "scale(0)",
                transformOrigin: `${X(d.effort) + j}px ${Y(d.impact) + j}px`,
                transition: reduced ? "none" : `opacity 0.4s ${i * 0.04}s, transform 0.4s ${EASE} ${i * 0.04}s`,
              }}
            >
              <circle
                cx={X(d.effort) + j}
                cy={Y(d.impact) + j}
                r={active === d.id ? 12 : 9}
                fill={d.type === "Quick win" ? "rgb(var(--c-brand))" : "rgb(var(--c-ink))"}
                fillOpacity={active === d.id ? 1 : 0.85}
                tabIndex={0}
                role="button"
                aria-label={`${d.title}. Impact ${d.impact} of 5, effort ${d.effort} of 5.`}
                onMouseEnter={() => setActive(d.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(d.id)}
                onBlur={() => setActive(null)}
                style={{ cursor: "pointer", transition: "r .15s" }}
              />
              <text
                x={X(d.effort) + j}
                y={Y(d.impact) + j + 3}
                textAnchor="middle"
                fill="rgb(var(--c-surface))"
                style={{ font: "700 9px var(--font-geist-mono, monospace)", pointerEvents: "none" }}
              >
                {d.id}
              </text>
            </g>
          );
        })}
      </svg>
      {active != null && (
        <div className="mt-2 rounded-lg border border-line bg-surface p-3 text-sm shadow-card">
          <span className="data-fig mr-2 text-ink-3">#{active}</span>
          {items.find((d) => d.id === active)?.title}
        </div>
      )}
    </figure>
  );
}

/* ---------------- SegmentBar ---------------- */
export function SegmentBar({ groups }: { groups: Array<{ label: string; count: number; tone: "pos" | "warn" | "neg" }> }) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const total = Math.max(1, groups.reduce((s, g) => s + g.count, 0));
  const colr: Record<string, string> = { pos: C.pos, warn: C.warn, neg: C.neg };
  const on = inView || reduced;
  return (
    <figure ref={ref} role="img" aria-label={groups.map((g) => `${g.label}: ${g.count}`).join(", ")}>
      <div className="flex h-8 w-full overflow-hidden rounded-lg border border-line">
        {groups.map((g, i) => (
          <div
            key={g.label}
            className="flex items-center justify-center"
            style={{
              background: colr[g.tone],
              flexGrow: on ? g.count : 0,
              transition: reduced ? "none" : `flex-grow 0.7s ${EASE} ${i * 0.08}s`,
            }}
          >
            {g.count > 0 && <span className="data-fig text-xs font-bold text-canvas">{g.count}</span>}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {groups.map((g) => (
          <li key={g.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colr[g.tone] }} />
            <span className="text-ink-2">
              {g.label} <span className="data-fig text-ink">{g.count}</span>
              <span className="text-ink-3"> / {total}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ---------------- DeltaBar (from -> to) ---------------- */
export function DeltaBar({
  label,
  from,
  to,
  max = 100,
}: {
  label: string;
  from: string | number;
  to: string | number;
  max?: number;
}) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const parse = (v: string | number) => (typeof v === "string" ? parseFloat(v) : v);
  const f = parse(from);
  const t = parse(to);
  const on = inView || reduced;
  return (
    <div ref={ref} className="text-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-ink-2">{label}</span>
        <span className="data-fig text-ink">
          {from} <span className="text-ink-3">→</span> <span className="text-pos">{to}</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-line-2" style={{ width: `${(f / max) * 100}%` }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand"
          style={{
            width: on ? `${(t / max) * 100}%` : `${(f / max) * 100}%`,
            transition: reduced ? "none" : `width 0.9s ${EASE}`,
          }}
        />
      </div>
    </div>
  );
}

/* ---------------- Gauge (half-circle, e.g. mention rate) ---------------- */
export function Gauge({ value, size = 190, unit = "%" }: { value: number; size?: number; unit?: string }) {
  const [ref, inView] = useInView();
  const reduced = useReducedMotion();
  const on = inView || reduced;
  const v = Math.max(0, Math.min(100, value));
  return (
    <figure ref={ref} className="relative mx-auto" style={{ width: size, height: size * 0.62 }} role="img" aria-label={`${value}${unit}`}>
      <svg width={size} height={size * 0.62} viewBox="0 0 200 124">
        <path d="M 16 116 A 84 84 0 0 1 184 116" stroke={C.line} strokeWidth="16" fill="none" strokeLinecap="round" />
        <path
          d="M 16 116 A 84 84 0 0 1 184 116"
          stroke="url(#gaugeGrad)"
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ strokeDashoffset: on ? 1 - v / 100 : 1, transition: reduced ? "none" : `stroke-dashoffset 1s ${EASE}` }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "rgb(var(--c-brand-dim))" }} />
            <stop offset="100%" style={{ stopColor: "rgb(var(--c-brand))" }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="data-fig text-2xl font-bold text-ink">
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
    </figure>
  );
}
