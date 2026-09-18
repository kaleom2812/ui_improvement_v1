"use client";

import { WarningCircle } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { KeyValueList, Callout, EmptyState } from "@/components/primitives";

export default function MethodologySection({ vm }: { vm: ViewModel }) {
  return (
    <>
      <DashHead
        title="Methodology"
        lede="GEO Tool measures how large language models perceive and represent your brand. It combines live model probing with a technical website crawl."
      />

      {vm.methodology.length > 0 ? (
        <Panel title="How this audit was run">
          <KeyValueList rows={vm.methodology} />
        </Panel>
      ) : (
        <EmptyState title="No run details">The backend returned no methodology metadata for this audit.</EmptyState>
      )}

      <div className="mt-4">
        <Callout icon={WarningCircle} tone="warn" title="Limitations">
          <ul className="list-inside list-disc space-y-1.5">
            <li>AI model outputs are non-deterministic and change frequently; presence rates carry a model-variance band.</li>
            <li>Observed AI visibility reflects the sampled prompts and providers used in this audit.</li>
            <li>Sentiment is assigned by a classifier and is approximate.</li>
          </ul>
        </Callout>
      </div>

      {vm.auditId && (
        <p className="mt-6 text-2xs uppercase tracking-[0.1em] text-ink-3">
          {vm.auditId}
          {vm.generatedAt ? ` · generated ${vm.generatedAt}` : ""}
        </p>
      )}
    </>
  );
}
