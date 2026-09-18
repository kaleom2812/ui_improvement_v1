"use client";

// Admin Dashboard — Overview.
//
// Consumes ONLY GET /api/admin/summary (the existing proxy -> FastAPI
// /admin/summary -> geo-db-worker -> D1). No other data source, no direct
// worker call, no session-cookie access from JS. FastAPI `_require_admin`
// remains the authoritative admin check — a 401/403 is rendered inline here,
// never worked around.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, CircleNotch, WarningCircle, ShieldWarning } from "@phosphor-icons/react";
import { num } from "@/lib/format";

interface AdminSummary {
  total_users: number;
  new_users_30d: number;
  total_audits: number;
  completed_audits: number;
  failed_audits: number;
  paid_users: number;
  free_users: number;
  paid_payments: number;
  payment_amount: number;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: AdminSummary }
  | { status: "error" }
  | { status: "unauthorized"; reason: "forbidden" | "unauthenticated" };

/**
 * The backend stores `payment_amount` in the smallest currency unit (paise for
 * INR). Convert to rupees for display only — the API value is never mutated.
 * Example: 500 -> "₹5.00".
 */
function formatRevenueInr(minorUnits: number): string {
  const rupees = (Number.isFinite(minorUnits) ? minorUnits : 0) / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-2xs font-bold uppercase tracking-[0.08em] text-ink-3">{label}</p>
      <p className="data-fig mt-2 text-2xl font-semibold text-ink sm:text-[1.75rem]">{value}</p>
      {sub && <p className="mt-1 text-2xs text-ink-3">{sub}</p>}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="data-fig text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div role="status" aria-label="Loading overview" className="animate-pulse">
      <div className="h-7 w-40 rounded bg-subtle" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-subtle" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-4 sm:p-5">
            <div className="h-3 w-24 rounded bg-subtle" />
            <div className="mt-3 h-7 w-20 rounded bg-subtle" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card h-40 p-5" />
        <div className="card h-40 p-5" />
      </div>
      <span className="sr-only">Loading overview…</span>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-neg/30 bg-neg-soft p-5"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-neg">
        <WarningCircle size={18} weight="bold" /> We couldn&apos;t load the admin dashboard
      </p>
      <p className="text-sm text-ink-2">
        The overview data isn&apos;t available right now. Please try again in a moment.
      </p>
      <button type="button" onClick={onRetry} className="btn-secondary h-9 px-4 text-sm">
        <ArrowClockwise size={15} weight="bold" /> Try again
      </button>
    </div>
  );
}

function UnauthorizedState({ reason }: { reason: "forbidden" | "unauthenticated" }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-line-2 bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldWarning size={18} weight="bold" className="text-warn" />
        {reason === "forbidden" ? "You don't have access to the admin dashboard" : "Your session has expired"}
      </p>
      <p className="text-sm text-ink-2">
        {reason === "forbidden"
          ? "This area is limited to administrator accounts."
          : "Please sign in again to continue."}
      </p>
      {reason === "forbidden" ? (
        <Link href="/dashboard" className="btn-secondary h-9 px-4 text-sm">
          Back to dashboard
        </Link>
      ) : (
        <Link href="/login?redirect=/admin" className="btn-primary h-9 px-4 text-sm">
          Sign in
        </Link>
      )}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/admin/summary", { headers: { Accept: "application/json" } });
      if (res.status === 401) {
        setState({ status: "unauthorized", reason: "unauthenticated" });
        return;
      }
      if (res.status === 403) {
        setState({ status: "unauthorized", reason: "forbidden" });
        return;
      }
      if (!res.ok) {
        setState({ status: "error" });
        return;
      }
      const data = (await res.json()) as AdminSummary;
      setState({ status: "ready", data });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="site-container py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        {state.status === "loading" && <OverviewSkeleton />}
        {state.status === "error" && <ErrorState onRetry={() => void load()} />}
        {state.status === "unauthorized" && <UnauthorizedState reason={state.reason} />}
        {state.status === "ready" && <Overview data={state.data} onRefresh={() => void load()} />}
      </div>
    </div>
  );
}

function Overview({ data, onRefresh }: { data: AdminSummary; onRefresh: () => void }) {
  const inProgressAudits = Math.max(0, data.total_audits - data.completed_audits - data.failed_audits);

  const kpis: Array<{ label: string; value: string; sub?: string }> = [
    { label: "Total Customers", value: num(data.total_users) },
    { label: "New Customers", value: num(data.new_users_30d), sub: "Last 30 days" },
    { label: "Total Audits", value: num(data.total_audits) },
    { label: "Completed Audits", value: num(data.completed_audits) },
    { label: "Paid Customers", value: num(data.paid_users) },
    { label: "Free Customers", value: num(data.free_users) },
    { label: "Successful Payments", value: num(data.paid_payments) },
    { label: "Total Revenue", value: formatRevenueInr(data.payment_amount) },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Overview</h1>
          <p className="mt-1.5 text-sm text-ink-2">
            A snapshot of customers, audits, and payments across the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="btn-ghost h-9 px-3 text-2xs uppercase tracking-[0.06em]"
        >
          <ArrowClockwise size={14} weight="bold" /> Refresh
        </button>
      </header>

      <section aria-label="Key metrics" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} />
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-bold text-ink">Audit outcomes</h2>
          <p className="mt-0.5 text-2xs text-ink-3">Derived from total, completed, and failed audits.</p>
          <div className="mt-3 divide-y divide-line">
            <StatusRow label="Completed" value={num(data.completed_audits)} />
            <StatusRow label="Failed" value={num(data.failed_audits)} />
            <StatusRow label="In progress / other" value={num(inProgressAudits)} />
            <StatusRow label="Total audits" value={num(data.total_audits)} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold text-ink">Customer mix</h2>
          <p className="mt-0.5 text-2xs text-ink-3">Paid customers have at least one unlocked report.</p>
          <div className="mt-3 divide-y divide-line">
            <StatusRow label="Paid customers" value={num(data.paid_users)} />
            <StatusRow label="Free customers" value={num(data.free_users)} />
            <StatusRow label="Successful payments" value={num(data.paid_payments)} />
            <StatusRow label="Total revenue" value={formatRevenueInr(data.payment_amount)} />
          </div>
        </div>
      </section>

      <p className="mt-6 flex items-center gap-1.5 text-2xs text-ink-3">
        <CircleNotch size={12} weight="bold" /> Figures update from the admin summary each time this page loads.
      </p>
    </div>
  );
}
