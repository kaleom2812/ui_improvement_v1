"use client";

import { useMemo, useState } from "react";
import { CaretDown, Quotes, Export } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { outcomeMeta, type OutcomeKey } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { Badge, Pill, EmptyState } from "@/components/primitives";
import { usePrinting } from "./print-context";

const FILTERS: { key: "all" | OutcomeKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "absent", label: "Not mentioned" },
  { key: "weak", label: "Weak" },
];

function Card({ e, open, onToggle }: { e: ViewModel["prompts"]["list"][number]; open: boolean; onToggle: () => void }) {
  const om = e.outcome === "cited" ? outcomeMeta.present : outcomeMeta[e.outcome];
  return (
    <div className="card">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left hover:bg-subtle/40">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={om.tone}>{om.label}</Badge>
            <span className="text-2xs uppercase tracking-[0.05em] text-ink-3">
              {e.model}
              {e.position != null ? ` · position ${e.position}` : ""}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">&ldquo;{e.prompt}&rdquo;</p>
        </div>
        <CaretDown size={16} weight="bold" className={`mt-1 shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-line p-4">
          <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">The AI answer</p>
          <blockquote className="mt-1.5 whitespace-pre-line border-l-2 border-line-2 pl-3 text-sm italic leading-relaxed text-ink-2">
            {e.response || "No response text captured."}
          </blockquote>
          {e.error && <p className="mt-3 text-2xs text-neg">Provider error: {e.error}</p>}
        </div>
      )}
    </div>
  );
}

export default function PromptEvidenceSection({ vm }: { vm: ViewModel }) {
  const printing = usePrinting();
  const [filter, setFilter] = useState<"all" | OutcomeKey>("all");
  const [openId, setOpenId] = useState<string | null>(vm.prompts.list[0]?.id ?? null);

  const list = useMemo(
    () => (filter === "all" ? vm.prompts.list : vm.prompts.list.filter((e) => e.outcome === filter)),
    [filter, vm.prompts.list]
  );
  const shown = printing ? vm.prompts.list : list;

  function exportCsv() {
    const rows = [
      ["Prompt", "Model", "Mentioned", "Position"],
      ...vm.prompts.list.map((q) => [q.prompt, q.model, String(q.isMentioned), q.position ?? ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `geo-prompts-${vm.domain || "audit"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (!vm.prompts.has) {
    return (
      <>
        <DashHead title="Prompt Evidence" lede="The actual AI answers captured during the audit." />
        <EmptyState title="No prompt responses">
          The backend&apos;s <code className="rounded bg-subtle px-1 py-0.5 text-2xs">execution_batch.responses</code> was empty, so no
          per-prompt evidence is available.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead
        title="Prompt Evidence"
        lede={`${vm.prompts.list.length} AI answers captured · ${vm.prompts.absentCount} did not mention ${vm.brand}.`}
        action={
          !printing && (
            <button type="button" onClick={exportCsv} className="btn-ghost h-9 px-3 text-2xs uppercase tracking-[0.06em]">
              <Export size={14} weight="bold" /> Export CSV
            </button>
          )
        }
      />

      {!printing && (
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Pill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </Pill>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {shown.map((e) => (
          <Card key={e.id} e={e} open={printing || openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} />
        ))}
        {shown.length === 0 && <p className="py-8 text-center text-sm text-ink-3">No prompts match this filter.</p>}
      </div>

      <Panel title="How to read this" className="mt-5">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
          <Quotes size={14} weight="fill" className="mt-1 shrink-0 text-brand-dark" />
          Each card is a real answer a buyer could receive today. Expand one to inspect the full response.
          &ldquo;Not mentioned&rdquo; prompts are your highest-value content targets.
        </p>
      </Panel>
    </>
  );
}
