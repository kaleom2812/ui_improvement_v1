"use client";

import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { Badge, EmptyState } from "@/components/primitives";
import MarkdownReportViewer from "@/components/MarkdownReportViewer";

/**
 * The audit backend does not emit a structured phased roadmap — it lives inside
 * the `detailed_playbook` markdown. This section renders that document, plus a
 * horizon grouping derived from the action list as a fallback.
 */
export default function RoadmapSection({ vm }: { vm: ViewModel }) {
  const groups = [
    { label: "0–30 days", desc: "Machine access and quick structural fixes", items: vm.actions.list.filter((a) => a.type === "Quick win") },
    { label: "31–60 days", desc: "Answerability and entity", items: vm.actions.list.filter((a) => a.type === "Project" && a.effort <= 3) },
    { label: "61–90 days", desc: "Authority and share of voice", items: vm.actions.list.filter((a) => a.type === "Project" && a.effort > 3) },
  ].filter((g) => g.items.length > 0);

  if (!vm.roadmap.has && groups.length === 0) {
    return (
      <>
        <DashHead title="90-Day Roadmap" lede="A sequenced plan to raise your score." />
        <EmptyState title="No roadmap in this audit">
          The roadmap comes from the backend&apos;s <code className="rounded bg-subtle px-1 py-0.5 text-2xs">detailed_playbook</code>, which
          was not returned for this audit.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead title="90-Day Roadmap" lede="Sequenced by leverage: machine access first, then answerability, then authority." />

      {groups.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {groups.map((g) => (
            <Panel key={g.label} className="flex flex-col">
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">{g.label}</p>
              <h3 className="mt-1 text-base font-bold text-ink">{g.desc}</h3>
              <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                {g.items.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-ink-2">
                    <span className="data-fig text-xs text-ink-3">{String(a.id).padStart(2, "0")}</span>
                    {a.title}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {vm.roadmap.has && (
        <Panel title="Detailed playbook" className="mt-4" action={<Badge tone="neutral">from the audit backend</Badge>}>
          <MarkdownReportViewer detailedPlaybook={vm.roadmap.playbookMarkdown} stacked />
        </Panel>
      )}
    </>
  );
}
