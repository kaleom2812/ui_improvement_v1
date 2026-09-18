"use client";

// Full report preview + value-first paywall. Rebuilt from
// GEO-UI-Version-5/src/audit/ReportPreview.jsx. Free sections render from the
// live AuditReport; premium sections are wrapped in <PaywallGate>. Unlock state
// comes from AuditFlow (payment-only — see src/state/audit-flow.tsx).

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FullPageLoading } from "@/components/Loading";
import {
  ArrowRight,
  CheckCircle,
  Gauge,
  ChatCircleDots,
  Users,
  Quotes as QuotesIcon,
  FileText,
  Wrench,
  ListChecks,
  CalendarBlank,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuditFlow } from "@/state/audit-flow";
import { useAuditReport } from "@/lib/use-audit-report";
import { buildViewModel } from "@/lib/adapter";
import { ScoreDial, RadarChart, Meter } from "@/components/charts";
import { PaywallGate, PaywallSeam } from "@/components/PaywallGate";
import { Reveal, Badge, DataTable, EmptyState } from "@/components/primitives";
import MarkdownReportViewer from "@/components/MarkdownReportViewer";
import { tone as toneMap, toneOfScore } from "@/lib/format";
import { formatGeoScore } from "@/lib/geoRating";

const LOCKED_INCLUDES = [
  "Detailed AI visibility by model",
  "Every prompt-level evidence card",
  "Full competitor set and share of voice",
  "Page-level findings and content priorities",
  "Technical GEO with copy-paste robots.txt, llms.txt and schema",
  "Prioritised action plan and roadmap",
];

function ReportSection({
  id,
  icon: Icon,
  n,
  title,
  children,
}: {
  id: string;
  icon: React.ElementType;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-10">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-subtle text-ink-2">
          <Icon size={16} weight="bold" />
        </span>
        <span className="hidden data-fig text-2xs text-ink-3">{String(n).padStart(2, "0")}</span>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ReportPreviewPage() {
  return (
    <Suspense fallback={<FullPageLoading label="Loading report…" />}>
      <ReportPreview />
    </Suspense>
  );
}

function ReportPreview() {
  const params = useSearchParams();
  const { lastAudit, unlocked, hydrated, setLastAudit } = useAuditFlow();
  const auditId = params.get("id") || lastAudit?.id || "";

  const { status, report, error } = useAuditReport(auditId, { poll: false });
  const vm = useMemo(() => buildViewModel(report, status, lastAudit?.domain), [report, status, lastAudit?.domain]);

  // Keep lastAudit in sync with whatever report is actually on screen. This
  // matters for the unlock flow: a user can land here via ?id= from a
  // /login?redirect= round trip (or a shared link) without lastAudit already
  // pointing at this audit in localStorage — checkout's payment flow and the
  // paywall's unlocked check both key off lastAudit.id, so it must reflect
  // the report actually being viewed, not just the audit run in this browser.
  useEffect(() => {
    if (report?.audit_id) setLastAudit({ id: report.audit_id, domain: vm.domain || lastAudit?.domain || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.audit_id, vm.domain, setLastAudit]);

  if (!hydrated && !params.get("id")) {
    return <FullPageLoading label="Loading report…" />;
  }

  if (!auditId) {
    return (
      <div className="site-container max-w-lg py-16 text-center">
        <EmptyState title="No recent audit">Run an audit first to preview its report.</EmptyState>
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
        <p className="mt-4 text-sm text-ink-2">Loading your report…</p>
      </div>
    );
  }
  if (status === "failed" || !vm.hasReport) {
    return (
      <div className="site-container max-w-lg py-16">
        <div className="flex flex-col items-start gap-4 rounded-xl border border-neg/30 bg-neg-soft p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-neg">
            <WarningCircle size={18} weight="bold" /> Report unavailable
          </p>
          <p className="text-sm text-ink-2">{error || "The audit report could not be loaded."}</p>
          <Link href="/audit" className="btn-primary h-9 px-4 text-sm">
            Start a new audit
          </Link>
        </div>
      </div>
    );
  }

  const topActions = vm.actions.list.slice(0, 5);

  return (
    <div className="site-container max-w-4xl py-10 sm:py-14">
      <Reveal>
        <p className="eyebrow">Full GEO report{vm.auditId ? ` · ${vm.auditId}` : ""}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{vm.brand} — GEO report</h1>
        <p className="mt-2 text-sm text-ink-3">
          {vm.domain}
          {vm.industry ? ` · ${vm.industry}` : ""}
          {vm.generatedAt ? ` · ${vm.generatedAt}` : ""}
        </p>
      </Reveal>

      {unlocked && (
        <Reveal delay={0.05}>
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-pos/30 bg-pos-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-pos">
              <CheckCircle size={18} weight="fill" /> Report unlocked
            </p>
            <Link href="/dashboard" className="btn-primary h-9 px-4 text-sm">
              Open interactive dashboard <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </Reveal>
      )}

      {/* Score + verdict (free) */}
      <Reveal delay={0.08}>
        <div className="mt-8 grid gap-6 rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-[minmax(0,240px)_1fr] lg:gap-10">
          <div className="flex flex-col items-center justify-center gap-2 border-b border-line pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <ScoreDial
              value={vm.score.overallExact}
              size={190}
              label="Overall GEO Rating"
              displayValue={vm.score.presentation}
              secondaryText={vm.score.numericAvailable ? `Score ${formatGeoScore(vm.score.overallExact)}` : "Limited data"}
              active={vm.score.has}
            />
            <p className="text-2xs uppercase tracking-[0.08em] text-ink-3">Overall GEO Rating</p>
            {vm.score.dataConfidence === "Limited" && <p className="text-xs text-ink-3">Data confidence: Limited</p>}
          </div>
          <div>
            {vm.headline && <p className="text-base font-semibold text-ink">{vm.headline}</p>}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {vm.headlineMetrics.map((m) => (
                <div key={m.label}>
                  <p className={`data-fig text-lg font-semibold ${toneMap[m.tone].text}`}>{m.value}</p>
                  <p className="text-2xs text-ink-3">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Executive summary (free) */}
      <ReportSection id="executive-summary" icon={FileText} n={1} title="Executive summary">
        {vm.report.hasExecutive ? (
          <MarkdownReportViewer executiveReport={vm.report.executiveMarkdown} stacked />
        ) : vm.headline ? (
          <p className="text-sm leading-relaxed text-ink-2">{vm.headline}</p>
        ) : (
          <EmptyState title="No written summary for this audit" />
        )}
      </ReportSection>

      {/* Score breakdown (free) */}
      {vm.hasDimensions && (
        <ReportSection id="score-breakdown" icon={Gauge} n={2} title="GEO score breakdown">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <ul className="space-y-3">
              {vm.dimensions.map((d) => (
                <li key={d.key} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 sm:grid-cols-[11rem_1fr_3rem]">
                  <span className="truncate text-sm text-ink-2" title={d.label}>
                    {d.label}
                  </span>
                  <Meter value={d.score} />
                  <span className={`data-fig text-right text-sm ${toneMap[toneOfScore(d.score)].text}`}>{d.score}</span>
                </li>
              ))}
            </ul>
            {vm.dimensions.length >= 3 && (
              <RadarChart
                axes={vm.dimensions.map((d) => d.label.split(" ")[0])}
                series={[{ name: vm.brand, values: vm.dimensions.map((d) => d.score / 100) }]}
              />
            )}
          </div>
        </ReportSection>
      )}

      {/* Opportunity summary (free) */}
      {topActions.length > 0 && (
        <ReportSection id="opportunities" icon={ListChecks} n={3} title="Opportunity summary">
          <p className="text-sm text-ink-2">The highest-leverage moves, ranked by impact against effort. The full plan has all {vm.actions.list.length}.</p>
          <ol className="mt-4 divide-y divide-line rounded-lg border border-line">
            {topActions.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <span className="data-fig mt-0.5 text-xs text-ink-3">{String(a.id).padStart(2, "0")}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{a.title}</p>
                  <p className="mt-0.5 text-2xs uppercase tracking-[0.05em] text-ink-3">
                    {a.dimension} · impact {a.impact}/5 · effort {a.effort}/5
                  </p>
                </div>
                <Badge tone={a.type === "Quick win" ? "pos" : "neutral"} className="ml-auto shrink-0">
                  {a.type}
                </Badge>
              </li>
            ))}
          </ol>
        </ReportSection>
      )}

      {!unlocked && (
        <div className="mt-12">
          <PaywallSeam includes={LOCKED_INCLUDES} price={149} />
        </div>
      )}

      {/* ---- Premium sections ---- */}
      <ReportSection id="ai-visibility" icon={ChatCircleDots} n={4} title="AI visibility, by model">
        <PaywallGate locked={!unlocked} title="See your presence in every model" value="Per-model AI Mention Rates, AI Recommendation Rate and the confidence interval." previewHeight={130}>
          {vm.aiVisibility.models.length > 0 ? (
            <DataTable
              columns={[
                { key: "label", label: "Model" },
                { key: "presence", label: "Mention rate", align: "right", mono: true, render: (r: { presence: number }) => `${r.presence.toFixed(1)}%` },
              ]}
              rows={vm.aiVisibility.models}
            />
          ) : (
            <EmptyState title="No per-model data in this audit" />
          )}
        </PaywallGate>
      </ReportSection>

      <ReportSection id="prompt-evidence" icon={QuotesIcon} n={5} title="Prompt-level evidence">
        <PaywallGate locked={!unlocked} title="Every AI answer, with analysis" value={`${vm.prompts.list.length} captured answers — including the ${vm.prompts.absentCount} where you are not mentioned.`} previewHeight={150}>
          <div className="grid gap-4 md:grid-cols-2">
            {vm.prompts.list.slice(0, unlocked ? undefined : 2).map((e) => (
              <article key={e.id} className="card p-4">
                <p className="text-sm font-semibold text-ink">&ldquo;{e.prompt}&rdquo;</p>
                <blockquote className="mt-2 line-clamp-4 border-l-2 border-line-2 pl-3 text-sm italic text-ink-2">
                  {e.snippet || e.response}
                </blockquote>
              </article>
            ))}
            {vm.prompts.list.length === 0 && <EmptyState title="No prompt responses in this audit" />}
          </div>
        </PaywallGate>
      </ReportSection>

      <ReportSection id="competitors" icon={Users} n={6} title="Competitor intelligence">
        <PaywallGate locked={!unlocked} title="Where you lose, and to whom" value="The full tracked competitor set and your share of voice.">
          {vm.competitors.has ? (
            <div>
              <p className="text-sm text-ink-2">
                Share of voice:{" "}
                <span className="data-fig text-ink">
                  {vm.competitors.brandShareOfVoice == null
                    ? "Not measured"
                    : `${vm.competitors.brandShareOfVoice.toFixed(1)}%`}
                </span>
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {vm.competitors.list.map((c) => (
                  <li key={c.name} className="rounded-full border border-line-2 bg-subtle px-3 py-1 text-sm text-ink-2">
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState title="No competitor set in this audit" />
          )}
        </PaywallGate>
      </ReportSection>

      <ReportSection id="pages" icon={FileText} n={7} title="Page & content findings">
        <PaywallGate locked={!unlocked} title="The pages to fix" value="Key pages, the pages flagged by findings, and the GEO readiness issues.">
          {vm.pages.has ? (
            <ul className="space-y-2">
              {vm.pages.issues.slice(0, 6).map((i, k) => (
                <li key={k} className="flex items-start gap-2 text-sm text-ink-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                  {i}
                </li>
              ))}
              {vm.pages.issues.length === 0 && <li className="text-sm text-ink-3">{vm.pages.keyPages.length} key pages identified.</li>}
            </ul>
          ) : (
            <EmptyState title="No page data in this audit" />
          )}
        </PaywallGate>
      </ReportSection>

      <ReportSection id="technical" icon={Wrench} n={8} title="Technical GEO">
        <PaywallGate locked={!unlocked} title="Copy-paste fixes" value="The corrected robots.txt guidance, a ready-to-ship llms.txt, and the Organization JSON-LD.">
          {vm.technical.has ? (
            <ul className="space-y-2.5">
              {vm.technical.crawlerTable.slice(0, 5).map((c) => (
                <li key={c.bot} className="grid grid-cols-[1fr_6rem] items-center gap-3">
                  <span className="text-sm text-ink-2">{c.bot}</span>
                  {c.explicit ? (
                    <Badge tone={c.blocked ? "neg" : "pos"}>{c.blocked ? "Blocked" : "Allowed"}</Badge>
                  ) : (
                    <Badge tone="neutral">Not specified</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No technical data in this audit" />
          )}
        </PaywallGate>
      </ReportSection>

      <ReportSection id="action-plan" icon={ListChecks} n={9} title="Prioritised action plan">
        <PaywallGate locked={!unlocked} title="Every action, ranked" value="Impact vs effort for every recommendation, ready to drop into your sprint plan.">
          <ol className="divide-y divide-line rounded-lg border border-line">
            {vm.actions.list.slice(0, unlocked ? undefined : 4).map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <span className="data-fig text-xs text-ink-3">{String(a.id).padStart(2, "0")}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{a.title}</p>
                  {a.detail && <p className="text-2xs text-ink-3">{a.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </PaywallGate>
      </ReportSection>

      <ReportSection id="roadmap" icon={CalendarBlank} n={10} title="Roadmap">
        <PaywallGate locked={!unlocked} title="A sequenced plan" value="The detailed playbook and phased roadmap from the audit backend.">
          {vm.roadmap.has ? (
            <MarkdownReportViewer detailedPlaybook={vm.roadmap.playbookMarkdown} stacked />
          ) : (
            <EmptyState title="No playbook in this audit" />
          )}
        </PaywallGate>
      </ReportSection>

      {!unlocked && (
        <div className="mt-14">
          <PaywallSeam includes={LOCKED_INCLUDES} price={149} />
        </div>
      )}
    </div>
  );
}
