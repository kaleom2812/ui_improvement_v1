"use client";

import { Info, ChartBar, ThumbsUp } from "@phosphor-icons/react";
import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel, MetricTile } from "./shared";
import { Gauge, BarList } from "@/components/charts";
import { EmptyState, Callout } from "@/components/primitives";
import {
  AI_MENTION_RATE_EXPLANATION,
  aiMetricPresentation,
} from "@/lib/aiMetricPresentation";

export default function AiVisibilitySection({ vm }: { vm: ViewModel }) {
  const v = vm.aiVisibility;
  const mention = aiMetricPresentation(v.mentionRate, v.sampleSize);
  const recommendation = aiMetricPresentation(v.recommendationRate, v.sampleSize);

  if (!v.has) {
    return (
      <>
        <DashHead title="AI Visibility" lede="Presence, mention rate and per-model breakdown." />
        <EmptyState title={mention.label}>
          {mention.explanation}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <DashHead
        title="AI Visibility"
        lede={v.mentionRate == null
          ? mention.explanation
          : `Mention rate ${v.mentionRate.toFixed(1)}% across ${v.promptsTested} prompts and ${v.providerRuns} provider runs.`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="AI Mention Rate" className="flex flex-col items-center">
          {v.mentionRate == null ? <EmptyState title={mention.label}>{mention.explanation}</EmptyState> : <Gauge value={v.mentionRate} />}
          {v.mentionRate != null && v.ciHigh > 0 && (
            <p className="mt-2 text-2xs text-ink-3">
              95% CI: {v.ciLow.toFixed(1)}% – {v.ciHigh.toFixed(1)}%
            </p>
          )}
        </Panel>
        <Panel title="AI Recommendation Rate">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <ThumbsUp size={14} className="text-ink-3" /> Explicitly recommended
          </div>
          <p className={`mt-2 data-fig text-3xl font-bold ${v.recommendationRate == null ? "text-ink-3" : v.recommendationRate >= 20 ? "text-pos" : "text-warn"}`}>
            {recommendation.label}
          </p>
          <p className="mt-2 text-2xs text-ink-3">
            {v.recommendationRate == null
              ? recommendation.explanation
              : `${v.recommendationCount} of ${v.sampleSize} answers recommended ${vm.brand}.`}
          </p>
        </Panel>
        <Panel title="Statistical validity">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <ChartBar size={14} className="text-ink-3" /> Sample
          </div>
          <p className="mt-2 data-fig text-3xl font-bold text-ink">{v.sampleSize}</p>
          <p className="mt-2 text-2xs text-ink-3">
            responses analysed across {v.promptsTested} unique prompts.
          </p>
        </Panel>
      </div>

      {v.models.length > 0 ? (
        <Panel title="Presence by model" className="mt-4">
          <BarList items={v.models.map((m) => ({ name: m.label, value: Math.round(m.presence) }))} max={100} labelWidth="9rem" />
          <p className="mt-4 flex items-start gap-1.5 text-2xs text-ink-3">
            <Info size={12} weight="bold" className="mt-0.5 shrink-0" />
            {AI_MENTION_RATE_EXPLANATION} Results are grouped by AI provider.
          </p>
        </Panel>
      ) : (
        <Panel title="Presence by model" className="mt-4">
          <EmptyState title="No per-model breakdown">
            Per-provider mention evidence was not available for this audit.
          </EmptyState>
        </Panel>
      )}

      {vm.searchDiscovery.has && vm.searchDiscovery.data && (
        <Panel title="Search discovery (AI Overviews)" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Queries run" value={vm.searchDiscovery.data.queries_run} />
            <MetricTile label="With AI Overview" value={vm.searchDiscovery.data.queries_with_ai_overview} />
            <MetricTile
              label="Brand in AI Overview"
              value={vm.searchDiscovery.data.brand_in_ai_overview_count}
              sub={`${(vm.searchDiscovery.data.ai_overview_brand_rate * 100).toFixed(0)}% rate`}
            />
            <MetricTile
              label="Knowledge panel"
              value={vm.searchDiscovery.data.brand_has_knowledge_panel ? "Yes" : "No"}
              tone={vm.searchDiscovery.data.brand_has_knowledge_panel ? "pos" : "warn"}
            />
          </div>
        </Panel>
      )}

      {v.mentionRate != null && v.mentionRate < 25 && (
        <div className="mt-4">
          <Callout icon={Info} tone="warn" title="Low mention rate">
            {vm.brand} appears in under a quarter of the AI answers tested for its category. The Action Center lists the
            fixes ranked by impact.
          </Callout>
        </div>
      )}
    </>
  );
}
