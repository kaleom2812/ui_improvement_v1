"use client";

// Lists only the signed-in user's PAID reports so they can reopen a
// previously generated report without re-running the audit. Rendered by the
// dedicated /history page (src/components/HistoryClient.tsx) — no longer
// shown on /dashboard itself.
//
// Data source: GET /api/audits (the Next proxy for FastAPI's authenticated
// GET /api/audits — see geo-dashboard/src/app/api/audits/route.ts). That
// endpoint returns metadata only (domain, status, score, timestamps) and
// NEVER report_data, and this component never asks it to. "Paid" is decided
// purely by cross-referencing the returned audit ids against
// account.paidAuditIds (already sourced from GET /api/auth/me elsewhere in
// AuditFlowProvider) — never by anything else in the list response.
//
// Selecting a report navigates to /dashboard?auditId=&domain=, which re-enters
// the existing audit-by-id flow (GET /api/audit/{id}); the actual report is
// fetched and entitlement-checked there, not by this component.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "./primitives";
import { formatDate } from "@/lib/adminFormat";
import { useAuditFlow } from "@/state/audit-flow";
import { formatGeoScore } from "@/lib/geoRating";
import { overallGeoScore } from "@/lib/overallGeoScore";

interface AuditListItem {
  audit_id: string;
  domain: string;
  status: string;
  company_name: string | null;
  category: string | null;
  geo_score: number | null;
  technical_readiness: number | null;
  created_at: string;
  completed_at: string | null;
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; audits: AuditListItem[] }
  | { status: "error"; message: string };

export function MyReports({ hideHeading = false }: { hideHeading?: boolean } = {}) {
  const { account, authLoaded } = useAuditFlow();
  const [state, setState] = useState<ListState>({ status: "loading" });

  useEffect(() => {
    if (!authLoaded || !account) return;
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/audits", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: data.error || data.detail || `Request failed (HTTP ${res.status})`,
          });
          return;
        }
        setState({ status: "ready", audits: Array.isArray(data.audits) ? data.audits : [] });
      } catch (err) {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof Error ? err.message : "Network error." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, account]);

  // Signed-out visitors have no paid reports to show, and the underlying
  // endpoint requires a session anyway — render nothing rather than firing a
  // request that will only 401.
  if (!authLoaded || !account) return null;

  const paidIds = new Set(account.paidAuditIds);
  // Admins have implicit entitlement to every report via the backend's
  // is_entitled() admin bypass, but never accumulate entitlement rows, so
  // paidAuditIds is always empty for them. GET /api/audits is already scoped
  // server-side to the caller's own user id (never every user's audits), so
  // it's safe to show everything it returns for an admin account here.
  const paidReports =
    state.status === "ready" ? state.audits.filter((a) => account.isAdmin || paidIds.has(a.audit_id)) : [];

  return (
    <section aria-label="My Reports" className="site-container py-6 sm:py-8">
      {!hideHeading && (
        <>
          <h2 className="text-xl font-bold tracking-tight text-ink">My Reports</h2>
          <p className="mt-1 text-sm text-ink-2">
            Reports you&apos;ve paid for — open any of them again without re-running the audit.
          </p>
        </>
      )}

      <div className="mt-4">
        {state.status === "loading" && (
          <div role="status" aria-label="Loading your reports" className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg border border-line bg-subtle/40" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-lg border border-neg/30 bg-neg-soft p-4 text-sm text-neg">
            {state.message || "Could not load your reports."}
          </div>
        )}

        {state.status === "ready" && paidReports.length === 0 && (
          <EmptyState title="No paid reports yet">
            Once you unlock a full report, it will show up here so you can reopen it anytime.
          </EmptyState>
        )}

        {state.status === "ready" && paidReports.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {paidReports.map((audit) => {
              const readinessAvailable =
                typeof audit.technical_readiness === "number" &&
                Number.isFinite(audit.technical_readiness);
              const headlineScore = overallGeoScore({
                geoReadiness: readinessAvailable ? audit.technical_readiness : null,
              });
              return (
              <li key={audit.audit_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{audit.domain}</p>
                  <p className="mt-0.5 text-2xs text-ink-3">
                    {formatDate(audit.created_at)}
                    {` · GEO rating ${headlineScore.rating}`}
                    {headlineScore.score !== null ? ` · Score ${formatGeoScore(headlineScore.score)}` : ""}
                    {headlineScore.dataConfidence === "Limited" ? " · Limited confidence" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={readinessAvailable ? "pos" : "warn"}>
                    {readinessAvailable ? "Ready" : "Limited data"}
                  </Badge>
                  <Link
                    href={`/dashboard?auditId=${encodeURIComponent(audit.audit_id)}&domain=${encodeURIComponent(audit.domain)}`}
                    className="btn-secondary h-8 px-3 text-2xs uppercase tracking-[0.06em]"
                  >
                    View Report
                  </Link>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
