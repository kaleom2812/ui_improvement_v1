"use client";

// Focus — the V4 "one thing at a time" dashboard home. Real ViewModel data only:
// the #1 action + a short checklist come from vm.actions (gap_report), the mini
// score from vm.score. No projected scores or phase KPIs (the backend does not
// provide them).

import { useState } from "react";
import { Target, CheckCircle, Circle, ArrowRight } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "@/components/reports/shared";
import { StoryArc, Badge, EmptyState } from "@/components/primitives";
import { Meter } from "@/components/charts";
import { tone as toneMap } from "@/lib/format";

export default function Focus({ vm, onNavigate }: { vm: ViewModel; onNavigate?: (id: string) => void }) {
  const week = vm.actions.list.slice(0, 3);
  const top = week[0];
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const progress = week.length ? Math.round((done.size / week.length) * 100) : 0;

  const toggle = (id: number) =>
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <DashHead
        title="Focus"
        lede={
          vm.headline ||
          "One thing at a time. Work this week's list and re-run the audit to see the score move."
        }
      />

      {top ? (
        <Panel className="border-2 border-brand">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
              <Target size={18} weight="bold" />
            </span>
            <div className="min-w-0">
              <p className="text-2xs font-bold uppercase tracking-[0.06em] text-brand-dark">Your #1 move</p>
              <h2 className="truncate text-lg font-bold text-ink">{top.title}</h2>
            </div>
            <Badge tone={top.type === "Quick win" ? "pos" : "neutral"} className="ml-auto shrink-0">
              {top.type}
            </Badge>
          </div>
          {top.detail && <p className="mt-3 text-sm text-ink-2">{top.detail}</p>}
          {(top.evidence || top.competitorAdvantage) && (
            <div className="mt-4">
              <StoryArc
                stages={[
                  ...(top.evidence ? [{ stage: "Evidence", text: top.evidence }] : []),
                  ...(top.competitorAdvantage ? [{ stage: "Impact", text: top.competitorAdvantage }] : []),
                  ...(top.detail ? [{ stage: "Action", text: top.detail }] : []),
                ]}
              />
            </div>
          )}
          <p className="mt-3 text-2xs uppercase tracking-[0.05em] text-ink-3">
            {top.dimension} · impact {top.impact}/5 · effort {top.effort}/5
            {top.effortLabel && top.effortLabel !== "—" ? ` · ${top.effortLabel}` : ""}
          </p>
        </Panel>
      ) : (
        <Panel>
          <EmptyState title="No open findings">This audit returned no prioritised actions.</EmptyState>
        </Panel>
      )}

      {week.length > 0 && (
        <Panel
          title="This week's checklist"
          className="mt-4"
          action={
            <span className="data-fig text-2xs text-ink-3">
              {done.size}/{week.length} done
            </span>
          }
        >
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-1.5 rounded-full bg-brand transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <ul className="divide-y divide-line">
            {week.map((a) => {
              const isDone = done.has(a.id);
              return (
                <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    aria-pressed={isDone}
                    aria-label={isDone ? `Undo: ${a.title}` : `Mark done: ${a.title}`}
                    className={`mt-0.5 shrink-0 ${isDone ? "text-pos" : "text-ink-3 hover:text-ink"}`}
                  >
                    {isDone ? <CheckCircle size={20} weight="fill" /> : <Circle size={20} />}
                  </button>
                  <div className={isDone ? "opacity-55" : ""}>
                    <p className={`text-sm font-semibold text-ink ${isDone ? "line-through" : ""}`}>{a.title}</p>
                    <p className="text-2xs uppercase tracking-[0.05em] text-ink-3">
                      {a.dimension} · impact {a.impact}/5 · effort {a.effort}/5
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => onNavigate?.("plan")}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark hover:underline"
          >
            See the full plan <ArrowRight size={14} weight="bold" />
          </button>
        </Panel>
      )}

      {vm.score.has && (
        <Panel
          title="Where you stand"
          className="mt-4"
          action={
            <button
              type="button"
              onClick={() => onNavigate?.("score")}
              className="text-2xs font-bold uppercase tracking-[0.05em] text-brand-dark hover:underline"
            >
              Details
            </button>
          }
        >
          <div className="flex items-center gap-4">
            <span className="data-fig text-2xl font-bold text-ink">{vm.score.rating}</span>
            <div className="flex-1">
              {vm.score.numericAvailable && <Meter value={vm.score.overall} />}
              {vm.score.numericAvailable && (
                <p className="mt-1 text-2xs text-ink-3">
                  Numeric GEO score {vm.score.overallExact.toFixed(1)}/100
                  {vm.dimensions.length ? ` · ${vm.dimensions.length} dimensions scored` : ""}
                </p>
              )}
              {vm.score.dataConfidence === "Limited" && (
                <p className="mt-1 text-2xs text-ink-3">Data confidence: Limited</p>
              )}
            </div>
          </div>
          {vm.headlineMetrics.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3">
              {vm.headlineMetrics.slice(0, 3).map((m) => (
                <div key={m.label}>
                  <p className={`data-fig text-lg font-semibold ${toneMap[m.tone].text}`}>{m.value}</p>
                  <p className="text-2xs text-ink-3">{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
