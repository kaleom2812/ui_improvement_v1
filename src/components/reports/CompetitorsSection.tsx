"use client";

import { Info } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { EmptyState, Callout } from "@/components/primitives";
import { ScoreDial } from "@/components/charts";

export default function CompetitorsSection({ vm }: { vm: ViewModel }) {
  const c = vm.competitors;

  if (!c.has) {
    return (
      <>
        <DashHead title="Competitors & Share of Voice" lede="Who models name instead of you." />
        <EmptyState title="No competitor set">
          The backend returned no competitors in <code className="rounded bg-subtle px-1 py-0.5 text-2xs">company_profile.competitors</code> for
          this audit.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead
        title="Competitors & Share of Voice"
        lede={c.brandShareOfVoice == null
          ? `Share of voice was not measured against the ${c.list.length} tracked competitors.`
          : `${vm.brand} holds ${c.brandShareOfVoice.toFixed(1)}% of the AI conversation about its category, against ${c.list.length} tracked competitors.`}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_1fr]">
        <Panel title="Your share of voice" className="flex flex-col items-center text-center">
          {c.brandShareOfVoice == null
            ? <EmptyState title="Not measured" />
            : <ScoreDial value={Math.round(c.brandShareOfVoice)} max={100} size={180} label="Share of voice" showValue />}
          <p className="mt-2 text-2xs uppercase tracking-[0.08em] text-ink-3">of category AI answers</p>
        </Panel>

        <Panel title="Tracked competitors">
          <ul className="divide-y divide-line">
            {c.list.map((comp) => (
              <li key={comp.name} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{comp.name}</p>
                  {comp.domain && (
                    <a href={`https://${comp.domain.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer" className="text-2xs text-brand-dark hover:underline">
                      {comp.domain}
                    </a>
                  )}
                </div>
                {comp.reason && <p className="mt-0.5 text-2xs text-ink-3">{comp.reason}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4">
        <Callout icon={Info} tone="neutral" title="Per-competitor metrics">
          This view shows the tracked competitor set and available share-of-voice evidence from the sampled AI responses.
        </Callout>
      </div>
    </>
  );
}
