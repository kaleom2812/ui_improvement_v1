"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { EmptyState, Callout } from "@/components/primitives";
import { Info } from "@phosphor-icons/react";

export default function PagesSection({ vm }: { vm: ViewModel }) {
  const p = vm.pages;

  if (!p.has) {
    return (
      <>
        <DashHead title="Pages & Content" lede="Buyer-critical pages and the specific fix for each." />
        <EmptyState title="No page data">
          The backend returned no crawl details or key pages for this audit.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead
        title="Pages & Content"
        lede={p.totalCrawled ? `${p.totalCrawled} pages crawled. Key commercial pages and the issues found.` : "Key pages and the issues found."}
      />

      {p.keyPages.length > 0 && (
        <Panel title="Key pages">
          <ul className="divide-y divide-line">
            {p.keyPages.map((page) => (
              <li key={page.url} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{page.title || page.type}</p>
                  <p className="text-2xs uppercase tracking-[0.05em] text-ink-3">{page.type}</p>
                </div>
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 flex shrink-0 items-center gap-1 text-2xs text-brand-dark hover:underline"
                >
                  Open <ArrowSquareOut size={12} weight="bold" />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {p.affected.length > 0 && (
        <Panel title="Pages flagged by findings" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {p.affected.map((url) => (
              <li key={url}>
                <code className="rounded bg-subtle px-2 py-1 text-2xs text-ink-2">{url}</code>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {p.issues.length > 0 && (
        <Panel title="GEO readiness issues" className="mt-4">
          <ul className="space-y-2">
            {p.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                {issue}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-4">
        <Callout icon={Info} tone="neutral" title="Per-page GEO scores">
          A GEO score for every page requires the audit backend to emit page-level scoring. Today the crawl returns an
          overall readiness score plus the issues above (see FINAL-INTEGRATION.md § Data gaps).
        </Callout>
      </div>
    </>
  );
}
