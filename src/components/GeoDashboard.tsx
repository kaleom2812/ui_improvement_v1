"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GeoDashboard — the interactive report / dashboard shell.
//
// Visual structure from GEO-UI-Version-4 (dashboard/DashboardLayout.jsx): a
// compact header, a "this week" focus banner with a score ring, and a horizontal
// tab bar. Navigation stays on ONE route via a `?tab=` query param (no nested
// routes) so /dashboard and /audit/[id] both keep working.
//
// SAME PROP CONTRACT as before ({ auditId?, initialDomain?, initialData? }).
// Data comes from the live AuditReport via src/lib/adapter.ts. Export stays
// bound to @react-pdf/renderer + ReportPdfDocument — never window.print().
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Target,
  Gauge,
  Broadcast,
  ChatCircleDots,
  Users,
  FileText,
  Wrench,
  ListChecks,
  CircleNotch,
  WarningCircle,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useUser } from "@/lib/auth";
import { AccountMenu } from "./AccountMenu";
import { useAuditFlow } from "@/state/audit-flow";
import { useAuditReport } from "@/lib/use-audit-report";
import { buildViewModel, type ExtendedAuditReport } from "@/lib/adapter";
import { buildReportFilename, pdfExportDiagnostic } from "@/lib/reportExport";

import Focus from "./dashboard/Focus";
import Score from "./dashboard/Score";
import Visibility from "./dashboard/Visibility";
import Answers from "./dashboard/Answers";
import Competitors from "./dashboard/Competitors";
import Content from "./dashboard/Content";
import Technical from "./dashboard/Technical";
import Plan from "./dashboard/Plan";

interface DashboardProps {
  auditId?: string;
  initialDomain?: string;
  initialData?: ExtendedAuditReport | null;
}

export const REPORT_TABS = [
  { id: "focus", label: "Focus", icon: Target },
  { id: "score", label: "Score", icon: Gauge },
  { id: "visibility", label: "Visibility", icon: Broadcast },
  { id: "answers", label: "Answers", icon: ChatCircleDots },
  { id: "competitors", label: "Competitors", icon: Users },
  { id: "content", label: "Content", icon: FileText },
  { id: "technical", label: "Technical", icon: Wrench },
  { id: "plan", label: "Plan", icon: ListChecks },
] as const;

type TabId = (typeof REPORT_TABS)[number]["id"];

function ScoreRingMini({ value, size = 38 }: { value: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / 100));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgb(var(--c-brand))"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${Math.round(frac * c * 1000) / 1000} ${Math.round(c * 1000) / 1000}`}
      />
    </svg>
  );
}

export default function GeoDashboard(props: DashboardProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-canvas">
          <span className="animate-spin360 text-brand">
            <CircleNotch size={28} weight="bold" />
          </span>
        </div>
      }
    >
      <GeoDashboardInner {...props} />
    </Suspense>
  );
}

function GeoDashboardInner({ auditId = "", initialDomain = "", initialData = null }: DashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn } = useUser();
  const { setLastAudit } = useAuditFlow();

  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && REPORT_TABS.some((t) => t.id === tabParam) ? tabParam : "focus"
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Poll only when we don't already have the full report from SSR.
  const poll = !initialData;
  const { status: polledStatus, report: polledReport, error } = useAuditReport(poll ? auditId : null, { poll });

  const report = initialData ?? polledReport;
  const status = initialData ? "complete" : polledStatus;

  useEffect(() => {
    if (report?.audit_id) setLastAudit({ id: report.audit_id, domain: initialDomain || "" });
  }, [report?.audit_id, initialDomain, setLastAudit]);

  const vm = useMemo(() => buildViewModel(report, status, initialDomain), [report, status, initialDomain]);

  const navigate = useCallback(
    (id: string) => {
      const target = (REPORT_TABS.some((t) => t.id === id) ? id : "focus") as TabId;
      setActiveTab(target);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", target);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // PDF export — the production @react-pdf/renderer pipeline (ReportPdfDocument),
  // NOT the on-screen UI and NOT window.print(). Uses the live report's
  // report_summary / company_profile / geo_score, same as before the migration.
  const handleExport = useCallback(async () => {
    if (!report?.report_summary) return;
    setExporting(true);
    setExportError("");
    try {
      const [{ pdf }, { default: ReportPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./reports/ReportPdfDocument"),
      ]);
      const blob = await pdf(
        <ReportPdfDocument
          report={report.report_summary}
          companyProfile={report.company_profile}
          geoScore={report.geo_score}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildReportFilename(report.report_summary);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      console.error(pdfExportDiagnostic(err));
      setExportError("The PDF could not be generated. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [report]);

  const thisWeek = vm.actions.list[0];

  const renderTab = (id: TabId) => {
    switch (id) {
      case "focus":
        return <Focus vm={vm} onNavigate={navigate} />;
      case "score":
        return <Score vm={vm} />;
      case "visibility":
        return <Visibility vm={vm} />;
      case "answers":
        return <Answers vm={vm} />;
      case "competitors":
        return <Competitors vm={vm} />;
      case "content":
        return <Content vm={vm} />;
      case "technical":
        return <Technical vm={vm} />;
      case "plan":
        return <Plan vm={vm} />;
      default:
        return null;
    }
  };

  const processing = status === "processing";
  const failed = status === "failed";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="site-container flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo href="/dashboard" wordmark={false} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{vm.brand || initialDomain || "GEO audit"}</p>
              <p className="truncate text-2xs text-ink-3">{vm.domain || initialDomain}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {exportError && (
              <span className="hidden text-2xs text-neg sm:inline" role="alert">
                {exportError}
              </span>
            )}
            <Link
              href={`/audit/report${report?.audit_id || auditId ? `?id=${report?.audit_id || auditId}` : ""}`}
              className="hidden items-center gap-1 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 hover:text-ink sm:inline-flex"
            >
              <FileText size={13} weight="bold" /> Exit to Full Report
            </Link>
            <Link
              href="/audit"
              className="hidden items-center gap-1 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 hover:text-ink sm:inline-flex"
            >
              <ArrowClockwise size={13} weight="bold" /> Re-run
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !report?.report_summary}
              className="btn-ghost h-9 px-3 text-2xs uppercase tracking-[0.06em]"
            >
              {exporting ? "Preparing…" : "Export"}
            </button>
            {isSignedIn && <AccountMenu />}
          </div>
        </div>

        {(vm.score.has || thisWeek) && (
          <div className="border-t border-line bg-brand-soft/40">
            <div className="site-container flex items-center gap-3 py-2.5">
              {vm.score.has && vm.score.numericAvailable && <ScoreRingMini value={vm.score.overall} />}
              <div className="min-w-0 flex-1">
                {thisWeek ? (
                  <>
                    <p className="text-2xs font-bold uppercase tracking-[0.06em] text-brand-dark">This week · your #1 move</p>
                    <p className="truncate text-sm font-semibold text-ink">{thisWeek.title}</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xs font-bold uppercase tracking-[0.06em] text-brand-dark">Overall GEO Rating</p>
                    <p className="truncate text-sm font-semibold text-ink">
                      {vm.score.rating}
                      {vm.score.numericAvailable ? ` · Score ${vm.score.overallExact.toFixed(1)}/100` : ""}
                      {vm.score.dataConfidence === "Limited" ? " · Limited confidence" : ""}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-line">
          <div className="site-container flex gap-1 overflow-x-auto" role="tablist" aria-label="Report sections">
            {REPORT_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => navigate(t.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === t.id ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                <t.icon size={15} weight="bold" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="site-container py-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          {failed ? (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-neg/30 bg-neg-soft p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-neg">
                <WarningCircle size={18} weight="bold" /> Could not load this audit
              </p>
              <p className="text-sm text-ink-2">{error || "The audit report is unavailable."}</p>
              <Link href="/audit" className="btn-primary h-9 px-4 text-sm">
                Start a new audit
              </Link>
            </div>
          ) : (
            renderTab(activeTab)
          )}
        </div>
      </main>

      {processing && (
        <div className="fixed inset-0 z-overlay flex items-center justify-center bg-canvas/80 p-5 backdrop-blur">
          <div className="card flex max-w-md flex-col items-center gap-4 p-10 text-center">
            <span className="animate-spin360 text-brand">
              <CircleNotch size={40} weight="bold" />
            </span>
            <h3 className="text-lg font-bold text-ink">Generating your GEO audit…</h3>
            <p className="text-sm text-ink-2">
              Crawling {vm.domain || initialDomain || "the site"} and probing the AI engines. This can take a few minutes.
            </p>
            <Link
              href="/audit/processing"
              className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-dark hover:underline"
            >
              View live status
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
