"use client";

// Free audit results. Visual direction from GEO-UI-Version-4 (audit/FreeResults.jsx):
// opens on one focal insight (the score), then reveals more free value on scroll,
// then the paywall. All data is the live AuditReport via buildViewModel(); every
// status branch (hydration, no-audit, still-processing, failed) is preserved.

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowDown, Target, TrendDown, WarningCircle, CircleNotch, LockSimple } from "@phosphor-icons/react";
import { useAuditFlow } from "@/state/audit-flow";
import { useAuditReport } from "@/lib/use-audit-report";
import { buildViewModel, outcomeMeta } from "@/lib/adapter";
import { ScoreDial, Meter } from "@/components/charts";
import { Reveal, Badge, SectionHeading, StoryArc, EmptyState } from "@/components/primitives";
import { tone as toneMap, toneOfScore } from "@/lib/format";
import { FullPageLoading } from "@/components/Loading";
import { formatGeoScore } from "@/lib/geoRating";

const LOCKED_INCLUDES = [
  "Every AI answer, with the fix for each",
  "Full competitor set and share of voice",
  "Citation breakdown and page-level findings",
  "Technical GEO with copy-paste robots.txt, llms.txt and schema",
  "Prioritised action plan and phased roadmap",
];

export default function FreeResultsPage() {
  return (
    <Suspense fallback={<FullPageLoading label="Loading results…" />}>
      <FreeResults />
    </Suspense>
  );
}

function FreeResults() {
  const router = useRouter();
  const params = useSearchParams();
  const { lastAudit, hydrated } = useAuditFlow();
  const auditId = params.get("id") || lastAudit?.id || "";

  const { status, report, error } = useAuditReport(auditId, { poll: false });
  const vm = useMemo(() => buildViewModel(report, status, lastAudit?.domain), [report, status, lastAudit?.domain]);

  if (!hydrated && !params.get("id")) {
    return <FullPageLoading label="Loading results…" />;
  }

  if (!auditId) {
    return (
      <div className="site-container max-w-lg py-16 text-center">
        <EmptyState title="No recent audit">Start a new audit to see your results.</EmptyState>
        <Link href="/audit" className="btn-primary mx-auto mt-6">
          Run a free audit <ArrowRight size={15} weight="bold" />
        </Link>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="site-container flex max-w-lg flex-col items-center py-24 text-center">
        <span className="animate-spin360 text-brand">
          <CircleNotch size={32} weight="bold" />
        </span>
        <p className="mt-4 text-sm text-ink-2">Loading your results…</p>
        <Link href="/audit/processing" className="mt-3 text-2xs font-semibold uppercase tracking-[0.06em] text-brand-dark hover:underline">
          View live status
        </Link>
      </div>
    );
  }

  if (status === "failed" || !vm.hasReport) {
    return (
      <div className="site-container max-w-lg py-16">
        <div className="flex flex-col items-start gap-4 rounded-xl border border-neg/30 bg-neg-soft p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-neg">
            <WarningCircle size={18} weight="bold" /> Results unavailable
          </p>
          <p className="text-sm text-ink-2">{error || "The audit report could not be loaded."}</p>
          <button type="button" onClick={() => router.push("/audit")} className="btn-primary h-9 px-4 text-sm">
            Start a new audit
          </button>
        </div>
      </div>
    );
  }

  const sorted = [...vm.dimensions].sort((a, b) => b.score - a.score);
  const weaknesses = sorted.slice(-3).reverse();
  const topAction = vm.actions.list[0];
  const evidence = vm.prompts.list.slice(0, 2);

  return (
    <div className="site-container max-w-flow py-12 sm:py-16">
      {/* 1. Focal — the rating; the numeric score remains secondary. */}
      <div className="text-center">
        <p className="eyebrow">Overall GEO Rating{vm.auditId ? ` · ${vm.auditId}` : ""}</p>
        <div className="mx-auto mt-4">
          <ScoreDial
            value={vm.score.overallExact}
            size={200}
            label="Overall GEO Rating"
            displayValue={vm.score.presentation}
            secondaryText={vm.score.numericAvailable ? `Score ${formatGeoScore(vm.score.overallExact)}` : "Limited data"}
            active={vm.score.has}
          />
        </div>
        <p className="mx-auto mt-4 max-w-md text-lg font-semibold text-ink">
          {vm.headline}
        </p>
        {vm.score.numericAvailable && <p className="mt-1 text-sm text-ink-3">Numeric GEO score: {formatGeoScore(vm.score.overallExact)}</p>}
        {vm.score.dataConfidence === "Limited" && <p className="mt-1 text-sm text-ink-3">Data confidence: Limited</p>}
        <p className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-2xs text-ink-3">
          <ArrowDown size={12} weight="bold" /> Scroll to see what&apos;s costing you the most
        </p>
      </div>

      {/* Headline metrics */}
      {vm.headlineMetrics.length > 0 && (
        <Reveal>
          <div className="mt-10 grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-5 shadow-card sm:grid-cols-3">
            {vm.headlineMetrics.slice(0, 3).map((m) => (
              <div key={m.label}>
                <p className={`data-fig text-lg font-semibold ${toneMap[m.tone].text}`}>{m.value}</p>
                <p className="text-2xs text-ink-3">{m.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* 2. The #1 thing to fix */}
      {topAction && (
        <Reveal>
          <div className="mt-12 rounded-xl border-2 border-brand bg-brand-soft/50 p-6">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
                <Target size={18} weight="bold" />
              </span>
              <p className="text-2xs font-bold uppercase tracking-[0.08em] text-brand-dark">The #1 thing to fix</p>
            </div>
            <h2 className="mt-3 text-xl font-bold text-ink">{topAction.title}</h2>
            <p className="mt-1 text-2xs uppercase tracking-[0.05em] text-ink-3">
              {topAction.dimension} · impact {topAction.impact}/5 · effort {topAction.effort}/5
            </p>
            <div className="mt-4">
              <StoryArc
                stages={[
                  ...(topAction.evidence ? [{ stage: "Evidence", text: topAction.evidence }] : []),
                  ...(topAction.competitorAdvantage ? [{ stage: "Impact", text: topAction.competitorAdvantage }] : []),
                  { stage: "Action", text: topAction.detail },
                ]}
              />
            </div>
          </div>
        </Reveal>
      )}

      {/* 3. What else — biggest weaknesses */}
      {vm.hasDimensions && (
        <Reveal>
          <section className="mt-12">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <TrendDown size={16} weight="bold" className="text-neg" /> Where you&apos;re losing most
            </p>
            <ul className="mt-4 space-y-3">
              {weaknesses.map((d) => (
                <li key={d.key} className="rounded-lg border border-line bg-surface p-4">
                  <p className="text-sm font-bold text-ink">
                    {d.label} <span className={`data-fig ${toneMap[toneOfScore(d.score)].text}`}>{d.score}</span>
                  </p>
                  {d.summary && <p className="mt-1 text-sm text-ink-2">{d.summary}</p>}
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      {/* 4. Competitive position */}
      {vm.competitors.has && (
        <Reveal>
          <section className="mt-12">
            <p className="text-sm font-bold text-ink">
              {vm.competitors.list.length} tracked competitors ·{" "}
              <span className="text-neg">
                {vm.competitors.brandShareOfVoice == null
                  ? "Share of voice not measured"
                  : `${vm.competitors.brandShareOfVoice.toFixed(1)}% share of voice`}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-4">
              {vm.competitors.list.map((c) => (
                <span key={c.name} className="rounded-full border border-line-2 bg-subtle px-3 py-1 text-sm text-ink-2">
                  {c.name}
                </span>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* 5. All dimensions */}
      {vm.hasDimensions && (
        <Reveal>
          <section className="mt-12">
            <p className="text-sm font-bold text-ink">All {vm.dimensions.length} dimension scores</p>
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
              {vm.dimensions.map((d) => (
                <li key={d.key} className="grid grid-cols-[1fr_5rem_2.5rem] items-center gap-3 px-4 py-2.5">
                  <span className="text-sm text-ink">{d.label}</span>
                  <Meter value={d.score} height={6} />
                  <span className={`data-fig text-right text-sm font-semibold ${toneMap[toneOfScore(d.score)].text}`}>{d.score}</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      {/* 6. Evidence */}
      {evidence.length > 0 && (
        <Reveal>
          <section className="mt-12">
            <SectionHeading
              eyebrow="Evidence"
              title="What buyers actually see"
              lede="Two of the AI answers captured. The full report includes every prompt with model and outcome breakdowns."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {evidence.map((e) => {
                const om = outcomeMeta[e.outcome];
                return (
                  <article key={e.id} className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-3">{e.model}</p>
                      <Badge tone={om.tone}>{om.label}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink">&ldquo;{e.prompt}&rdquo;</p>
                    <blockquote className="mt-2 line-clamp-4 border-l-2 border-line-2 pl-3 text-sm italic leading-relaxed text-ink-2">
                      {e.snippet || e.response}
                    </blockquote>
                  </article>
                );
              })}
            </div>
          </section>
        </Reveal>
      )}

      {/* 7. Paywall — value forward */}
      <Reveal>
        <section className="mt-14 rounded-xl border border-brand/30 bg-brand-soft/50 p-6 text-center sm:p-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-brand/40 bg-surface text-brand-dark">
            <LockSimple size={20} weight="bold" />
          </span>
          <h3 className="mt-4 text-xl font-bold text-ink sm:text-2xl">See exactly what to fix, in what order</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-2">
            You have your score and your top issue. The full report unpacks every dimension, every prompt, the pages to
            change, and a dated plan.
          </p>
          <ul className="mx-auto mt-5 grid max-w-md gap-2 text-left text-sm">
            {LOCKED_INCLUDES.map((x) => (
              <li key={x} className="flex items-start gap-2 text-ink-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {x}
              </li>
            ))}
          </ul>
          <Link href="/audit/report" className="btn-primary mx-auto mt-6">
            Preview the full report <ArrowRight size={15} weight="bold" />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
