"use client";

// Admin Dashboard — Audits.
//
// Consumes ONLY GET /api/admin/audits (the existing proxy -> FastAPI
// /admin/audits). Status / search / date range / sort / pagination all live in
// the URL (URLSearchParams + router.replace) so the view is shareable and the
// back button works. Every filter is applied by the backend — no client-side
// filtering or slicing. The admin audits API intentionally omits report_data
// and error_message; this page never asks for them.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, MagnifyingGlass, SortAscending, SortDescending, X } from "@phosphor-icons/react";
import { Badge, EmptyState } from "@/components/primitives";
import type { Tone } from "@/lib/format";
import { num } from "@/lib/format";
import { formatDate, formatScore } from "@/lib/adminFormat";
import { fetchAdminJson, LoadErrorNotice, UnauthorizedNotice } from "../shared";

const SORT_FIELDS = ["created_at", "geo_score", "status", "domain"] as const;
type SortField = (typeof SORT_FIELDS)[number];
const SORT_LABEL: Record<SortField, string> = {
  created_at: "Created",
  geo_score: "GEO Score",
  status: "Status",
  domain: "Domain",
};

const STATUS_VALUES = ["processing", "complete", "incomplete", "failed"] as const;
type AuditStatus = (typeof STATUS_VALUES)[number];
const STATUS_LABEL: Record<AuditStatus, string> = {
  processing: "Processing",
  complete: "Complete",
  incomplete: "Incomplete",
  failed: "Failed",
};

const DEFAULT_LIMIT = "25";
const SEARCH_DEBOUNCE_MS = 350;

interface AuditRow {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  domain: string;
  status: string;
  company_name: string | null;
  category: string | null;
  geo_score: number | null;
  technical_readiness: number | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

interface AuditsSummary {
  total: number;
  completed: number;
  processing: number;
  incomplete: number;
  failed: number;
}

interface AuditsResponse {
  audits: AuditRow[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  summary: AuditsSummary;
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; data: AuditsResponse }
  | { status: "error" }
  | { status: "unauthorized"; reason: "forbidden" | "unauthenticated" };

function statusTone(status: string): Tone {
  if (status === "complete") return "pos";
  if (status === "failed") return "neg";
  if (status === "incomplete") return "warn";
  return "neutral"; // processing / anything else
}
function statusLabel(status: string): string {
  return (STATUS_LABEL as Record<string, string>)[status] ?? status;
}

export default function AuditsPage() {
  return (
    <div className="site-container py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Audits</h1>
          <p className="mt-1.5 text-sm text-ink-2">
            An administrative view of audit activity across every customer — status, scores, and timing only.
          </p>
        </header>
        <Suspense fallback={<div className="mt-6"><AuditsSkeleton /></div>}>
          <AuditsView />
        </Suspense>
      </div>
    </div>
  );
}

function AuditsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSort = searchParams.get("sort");
  const sort: SortField = (SORT_FIELDS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as SortField)
    : "created_at";
  const order: "asc" | "desc" = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = searchParams.get("limit") ?? DEFAULT_LIMIT;
  const search = searchParams.get("search") ?? "";
  const rawStatus = searchParams.get("status");
  const status: AuditStatus | "" = (STATUS_VALUES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as AuditStatus)
    : "";
  const startDate = searchParams.get("start_date") ?? "";
  const endDate = searchParams.get("end_date") ?? "";

  const hasFilters = Boolean(search || status || startDate || endDate);

  const [state, setState] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [term, setTerm] = useState(search);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const query = new URLSearchParams({ page: String(page), limit, sort, order });
    if (status) query.set("status", status);
    if (search) query.set("search", search);
    if (startDate) query.set("start_date", startDate);
    if (endDate) query.set("end_date", endDate);
    void fetchAdminJson<AuditsResponse>(`/api/admin/audits?${query.toString()}`).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") setState({ status: "ready", data: result.data });
      else if (result.kind === "unauthorized") setState({ status: "unauthorized", reason: result.reason });
      else setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [page, limit, sort, order, status, search, startDate, endDate, reloadKey]);

  useEffect(() => {
    setTerm(search);
  }, [search]);

  useEffect(() => {
    if (term === search) return;
    const handle = setTimeout(() => {
      updateParams({ search: term || null, page: "1" });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [term, search, updateParams]);

  const onSortField = (field: SortField) => updateParams({ sort: field, order, page: "1" });
  const toggleOrder = () => updateParams({ sort, order: order === "asc" ? "desc" : "asc", page: "1" });
  const onStatus = (value: string) => updateParams({ status: value || null, page: "1" });
  const onStartDate = (value: string) => updateParams({ start_date: value || null, page: "1" });
  const onEndDate = (value: string) => updateParams({ end_date: value || null, page: "1" });
  const clearDates = () => updateParams({ start_date: null, end_date: null, page: "1" });
  const clearAllFilters = () => {
    setTerm("");
    updateParams({ status: null, search: null, start_date: null, end_date: null, page: "1" });
  };
  const goToPage = (target: number) => updateParams({ page: String(target) });

  const directionLabel = useMemo(() => {
    if (sort === "geo_score") return order === "asc" ? "Low to high" : "High to low";
    if (sort === "status" || sort === "domain") return order === "asc" ? "A–Z" : "Z–A";
    return order === "desc" ? "Newest first" : "Oldest first";
  }, [sort, order]);

  const busy = state.status === "loading" || state.status === "ready";

  return (
    <div className="mt-6">
      {state.status === "error" && <LoadErrorNotice onRetry={() => setReloadKey((k) => k + 1)} />}
      {state.status === "unauthorized" && <UnauthorizedNotice reason={state.reason} />}

      {busy && (
        <>
          <KpiRow summary={state.status === "ready" ? state.data.summary : null} />

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="relative min-w-[13rem] flex-1">
              <span className="sr-only">Search by domain, company, category, or customer</span>
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search domain, company, category, or customer"
                className="w-full rounded-lg border-2 border-line-2 bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand focus:shadow-focus"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">Status</span>
              <select
                value={status}
                onChange={(event) => onStatus(event.target.value)}
                className="rounded-lg border-2 border-line-2 bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
              >
                <option value="">All statuses</option>
                {STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">Sort</span>
              <select
                value={sort}
                onChange={(event) => onSortField(event.target.value as SortField)}
                className="rounded-lg border-2 border-line-2 bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
              >
                {SORT_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {SORT_LABEL[field]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={toggleOrder}
              aria-label={`Sort direction: ${directionLabel}`}
              className="btn-secondary h-[38px] gap-1.5 px-3 text-2xs uppercase tracking-[0.06em]"
            >
              {order === "asc" ? <SortAscending size={14} weight="bold" /> : <SortDescending size={14} weight="bold" />}
              {directionLabel}
            </button>

            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">From</span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => onStartDate(event.target.value)}
                aria-label="Start date"
                className="rounded-lg border-2 border-line-2 bg-surface px-2.5 py-[7px] text-sm text-ink outline-none focus:border-brand"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">To</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => onEndDate(event.target.value)}
                aria-label="End date"
                className="rounded-lg border-2 border-line-2 bg-surface px-2.5 py-[7px] text-sm text-ink outline-none focus:border-brand"
              />
            </label>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={clearDates}
                className="btn-ghost h-[38px] gap-1 px-2.5 text-2xs uppercase tracking-[0.06em]"
              >
                <X size={13} weight="bold" /> Clear dates
              </button>
            )}
          </div>

          <div className="mt-4">
            {state.status === "loading" && <TableSkeleton />}
            {state.status === "ready" &&
              (state.data.audits.length === 0 ? (
                <AuditsEmpty hasFilters={hasFilters} onClear={clearAllFilters} />
              ) : (
                <AuditsTable
                  data={state.data}
                  onPrev={() => goToPage(page - 1)}
                  onNext={() => goToPage(page + 1)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function KpiRow({ summary }: { summary: AuditsSummary | null }) {
  if (!summary) {
    return (
      <div
        role="status"
        aria-label="Loading audit summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse p-4">
            <div className="h-3 w-20 rounded bg-subtle" />
            <div className="mt-3 h-6 w-16 rounded bg-subtle" />
          </div>
        ))}
      </div>
    );
  }

  const cards: Array<{ label: string; value: string }> = [
    { label: "Total Audits", value: num(summary.total) },
    { label: "Completed", value: num(summary.completed) },
    { label: "Processing", value: num(summary.processing) },
    { label: "Incomplete", value: num(summary.incomplete) },
    { label: "Failed", value: num(summary.failed) },
  ];

  return (
    <section aria-label="Audit summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="card p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.06em] text-ink-3">{card.label}</p>
          <p className="data-fig mt-2 text-xl font-semibold text-ink sm:text-2xl">{card.value}</p>
        </div>
      ))}
    </section>
  );
}

function AuditsTable({
  data,
  onPrev,
  onNext,
}: {
  data: AuditsResponse;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, data.total_pages);
  const headClass = "px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3";

  return (
    <div>
      <div className="max-w-full overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[68rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle/60">
              <th scope="col" className={headClass}>Customer</th>
              <th scope="col" className={headClass}>Domain</th>
              <th scope="col" className={headClass}>Company</th>
              <th scope="col" className={headClass}>Category</th>
              <th scope="col" className={headClass}>Status</th>
              <th scope="col" className={`${headClass} text-right`}>GEO score</th>
              <th scope="col" className={`${headClass} text-right`}>Technical</th>
              <th scope="col" className={headClass}>Created</th>
              <th scope="col" className={headClass}>Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.audits.map((audit) => (
              <tr key={audit.id} className="align-top transition-colors hover:bg-subtle/50">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-ink">{audit.user_name ?? "—"}</div>
                  {audit.user_email && <div className="text-2xs text-ink-3">{audit.user_email}</div>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-ink">{audit.domain}</td>
                <td className="px-3 py-2.5 text-ink-2">{audit.company_name ?? "—"}</td>
                <td className="px-3 py-2.5 text-ink-2">{audit.category ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={statusTone(audit.status)}>{statusLabel(audit.status)}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right"><span className="data-fig text-ink">{formatScore(audit.geo_score)}</span></td>
                <td className="px-3 py-2.5 text-right"><span className="data-fig text-ink">{formatScore(audit.technical_readiness)}</span></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(audit.created_at)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(audit.completed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-3">
          {num(data.total)} audit{data.total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrev} disabled={!data.has_prev} className="btn-secondary h-9 gap-1.5 px-3 text-sm">
            <CaretLeft size={14} weight="bold" /> Previous
          </button>
          <span className="data-fig whitespace-nowrap text-2xs text-ink-3">
            Page {num(data.page)} of {num(totalPages)}
          </span>
          <button type="button" onClick={onNext} disabled={!data.has_next} className="btn-secondary h-9 gap-1.5 px-3 text-sm">
            Next <CaretRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditsEmpty({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  if (!hasFilters) {
    return <EmptyState title="No audits yet">Audits will appear here once customers run them.</EmptyState>;
  }
  return (
    <div>
      <EmptyState title="No audits match your filters">
        Try a different status, date range, or search term.
      </EmptyState>
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={onClear} className="btn-secondary h-9 px-4 text-sm">
          Clear all filters
        </button>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading audits" className="animate-pulse">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="h-10 border-b border-line bg-subtle/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-3 py-3.5 last:border-b-0">
            <div className="h-8 flex-1 rounded bg-subtle" />
            <div className="hidden h-4 w-24 rounded bg-subtle sm:block" />
            <div className="h-6 w-16 rounded bg-subtle" />
            <div className="hidden h-4 w-20 rounded bg-subtle md:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading audits…</span>
    </div>
  );
}

function AuditsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-20 rounded bg-subtle" />
            <div className="mt-3 h-6 w-16 rounded bg-subtle" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-9 w-full rounded bg-subtle" />
      <div className="mt-4 h-64 rounded-lg border border-line bg-subtle/40" />
    </div>
  );
}
