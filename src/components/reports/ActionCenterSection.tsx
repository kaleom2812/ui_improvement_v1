"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { QuadrantChart } from "@/components/charts";
import { Badge, Pill, EmptyState } from "@/components/primitives";
import { usePrinting } from "./print-context";

export default function ActionCenterSection({ vm }: { vm: ViewModel }) {
  const printing = usePrinting();
  const dims = useMemo(
    () => ["All", ...Array.from(new Set(vm.actions.list.map((a) => a.dimension)))],
    [vm.actions.list]
  );
  const [dim, setDim] = useState("All");
  const [done, setDone] = useState<Set<number>>(() => new Set());

  const list = printing || dim === "All" ? vm.actions.list : vm.actions.list.filter((a) => a.dimension === dim);
  const toggle = (id: number) =>
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (!vm.actions.has) {
    return (
      <>
        <DashHead title="Action Center" lede="Every recommendation, ranked by impact against effort." />
        <EmptyState title="No recommendations">
          This audit returned no gaps in <code className="rounded bg-subtle px-1 py-0.5 text-2xs">gap_report.gaps</code>.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead
        title="Action Center"
        lede={`${vm.actions.list.length} recommendations, ${vm.actions.quickWinCount} of them quick wins. ${done.size} marked done.`}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Panel title="Impact vs effort">
          <QuadrantChart items={vm.actions.quadrant.map((a) => ({ id: a.id, title: a.title, impact: a.impact, effort: a.effort, type: a.type }))} />
          <p className="mt-2 text-2xs text-ink-3">
            Teal points are quick wins (high impact, low effort). Numbers match the list. Impact is derived from severity,
            effort from the estimated-effort field.
          </p>
        </Panel>

        <Panel
          title="Prioritised list"
          action={
            !printing && (
              <div className="flex flex-wrap gap-1.5">
                {dims.map((d) => (
                  <Pill key={d} active={dim === d} onClick={() => setDim(d)}>
                    {d}
                  </Pill>
                ))}
              </div>
            )
          }
        >
          <ol className="divide-y divide-line">
            {list.map((a) => {
              const isDone = done.has(a.id);
              return (
                <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    aria-pressed={isDone}
                    aria-label={isDone ? `Mark "${a.title}" not done` : `Mark "${a.title}" done`}
                    className={`mt-0.5 shrink-0 ${isDone ? "text-pos" : "text-ink-3 hover:text-ink"}`}
                  >
                    {isDone ? <CheckCircle size={20} weight="fill" /> : <Circle size={20} />}
                  </button>
                  <div className={isDone ? "opacity-55" : ""}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold text-ink ${isDone ? "line-through" : ""}`}>{a.title}</p>
                      <Badge tone={a.type === "Quick win" ? "pos" : "neutral"}>{a.type}</Badge>
                      {a.priority && <Badge tone="brand">Top priority</Badge>}
                    </div>
                    {a.detail && <p className="mt-1 text-sm text-ink-2">{a.detail}</p>}
                    {a.evidence && <p className="mt-1 text-2xs italic text-ink-3">Evidence: {a.evidence}</p>}
                    <p className="mt-1.5 text-2xs uppercase tracking-[0.05em] text-ink-3">
                      {a.dimension} · impact {a.impact}/5 · effort {a.effort}/5 ({a.effortLabel})
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
    </>
  );
}
