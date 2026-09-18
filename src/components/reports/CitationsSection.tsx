"use client";

import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel, MetricTile } from "./shared";
import { BarList } from "@/components/charts";
import { EmptyState } from "@/components/primitives";
import { providerLabel } from "@/lib/format";

export default function CitationsSection({ vm }: { vm: ViewModel }) {
  const c = vm.citations;

  if (!c.has) {
    return (
      <>
        <DashHead title="Citation Visibility" lede="The sources models trust — and where your domain is missing." />
        <EmptyState title="No citation data">
          The backend returned no <code className="rounded bg-subtle px-1 py-0.5 text-2xs">citation_source_breakdown</code> for this audit.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead
        title="Citation Visibility"
        lede={
          c.total > 0
            ? `${vm.domain} earns ${(c.brandShare * 100).toFixed(1)}% of the ${c.total.toLocaleString()} category citations captured.`
            : "Where models source their answers about your category."
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {c.topDomains.length > 0 && (
          <Panel title="Most-cited domains in your category">
            <BarList
              items={c.topDomains.map((d) => ({ name: d.domain, value: Math.round(d.share * 100), self: d.self }))}
              max={Math.max(10, Math.round((c.topDomains[0]?.share ?? 0.1) * 100))}
              labelWidth="10rem"
            />
          </Panel>
        )}

        <Panel title="Your pages that get cited">
          {c.citedPages.length > 0 ? (
            <ul className="divide-y divide-line">
              {c.citedPages.map((p) => (
                <li key={p.page} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="data-fig mt-0.5 rounded bg-subtle px-1.5 py-0.5 text-2xs font-semibold text-ink-2">{p.count}</span>
                  <code className="text-sm text-ink">{p.page}</code>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No owned pages cited">
              None of the AI answers captured for this audit cited a page on {vm.domain}.
            </EmptyState>
          )}
        </Panel>
      </div>

      {c.byEngine.length > 0 && (
        <Panel title="Brand mentions by engine" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.byEngine.map((e) => (
              <MetricTile key={e.key} label={providerLabel(e.key)} value={e.value.toFixed(1)} sub="mention rate %" />
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
