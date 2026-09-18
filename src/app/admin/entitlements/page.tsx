"use client";

// Admin Dashboard — Entitlements.
//
// Consumes ONLY GET /api/admin/entitlements (the existing proxy -> FastAPI
// /admin/entitlements). Search / user_id / audit_id / date range / sort /
// pagination all live in the URL (URLSearchParams + router.replace) so the view
// is shareable and the back button works. Every filter is applied by the
// backend — no client-side filtering, slicing, or per-row lookups. The
// entitlement row is the source of truth; joined user/audit metadata may be
// null and is shown as "—" rather than invented.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, MagnifyingGlass, SortAscending, SortDescending, X } from "@phosphor-icons/react";
import { Badge, EmptyState } from "@/components/primitives";
import type { Tone } from "@/lib/format";
import { num } from "@/lib/format";
import { formatDate } from "@/lib/adminFormat";
import { fetchAdminJson, LoadErrorNotice, UnauthorizedNotice } from "../shared";

const SORT_FIELDS = ["paid_at", "user_email", "domain"] as const;
type SortField = (typeof SORT_FIELDS)[number];
const SORT_LABEL: Record<SortField, string> = {
  paid_at: "Paid Date",
  user_email: "Customer Email",
  domain: "Domain",
};

const DEFAULT_LIMIT = "25";
const SEARCH_DEBOUNCE_MS = 350;

const AUDIT_STATUS_LABEL: Record<string, string> = {
  complete: "Complete",
  processing: "Processing",
  incomplete: "Incomplete",
  failed: "Failed",
};

interface EntitlementRow {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  audit_id: string;
  domain: string | null;
  audit_status: string | null;
  payment_id: string | null;
  paid_at: string;
}

interface EntitlementsSummary {
  total: number;
}

interface EntitlementsResponse {
  entitlements: EntitlementRow[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  summary: EntitlementsSummary;
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; data: EntitlementsResponse }
  | { status: "error" }
  | { status: "unauthorized"; reason: "forbidden" | "unauthenticated" };

function auditStatusTone(status: string): Tone {
  if (status === "complete") return "pos";
  if (status === "failed") return "neg";
  if (status === "incomplete") return "warn";
  return "neutral"; // processing / anything else
}
function auditStatusLabel(status: string): string {
  return AUDIT_STATUS_LABEL[status] ?? status;
}

/** Local input state that commits to the URL after the debounce settles, and
 *  re-syncs when the URL value changes underneath it (back/forward). */
function useDebouncedField(urlValue: string, commit: (value: string) => void) {
  const [value, setValue] = useState(urlValue);
  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);
  useEffect(() => {
    if (value === urlValue) return;
    const handle = setTimeout(() => commit(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, urlValue, commit]);
  return [value, setValue] as const;
}

export default function EntitlementsPage() {
  return (
    <div className="site-container py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Entitlements</h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Report access granted to customers — one row per unlocked audit, with when and how it was paid.
          </p>
        </header>
        <Suspense fallback={<div className="mt-6"><EntitlementsSkeleton /></div>}>
          <EntitlementsView />
        </Suspense>
      </div>
    </div>
  );
}

function EntitlementsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSort = searchParams.get("sort");
  const sort: SortField = (SORT_FIELDS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as SortField)
    : "paid_at";
  const order: "asc" | "desc" = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = searchParams.get("limit") ?? DEFAULT_LIMIT;
  const search = searchParams.get("search") ?? "";
  const userId = searchParams.get("user_id") ?? "";
  const auditId = searchParams.get("audit_id") ?? "";
  const startDate = searchParams.get("start_date") ?? "";
  const endDate = searchParams.get("end_date") ?? "";

  const hasFilters = Boolean(search || userId || auditId || startDate || endDate);

  const [state, setState] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

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
    if (search) query.set("search", search);
    if (userId) query.set("user_id", userId);
    if (auditId) query.set("audit_id", auditId);
    if (startDate) query.set("start_date", startDate);
    if (endDate) query.set("end_date", endDate);
    void fetchAdminJson<EntitlementsResponse>(`/api/admin/entitlements?${query.toString()}`).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") setState({ status: "ready", data: result.data });
      else if (result.kind === "unauthorized") setState({ status: "unauthorized", reason: result.reason });
      else setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [page, limit, sort, order, search, userId, auditId, startDate, endDate, reloadKey]);

  const commitSearch = useCallback(
    (value: string) => updateParams({ search: value || null, page: "1" }),
    [updateParams],
  );
  const commitUserId = useCallback(
    (value: string) => updateParams({ user_id: value.trim() || null, page: "1" }),
    [updateParams],
  );
  const commitAuditId = useCallback(
    (value: string) => updateParams({ audit_id: value.trim() || null, page: "1" }),
    [updateParams],
  );
  const [term, setTerm] = useDebouncedField(search, commitSearch);
  const [userIdInput, setUserIdInput] = useDebouncedField(userId, commitUserId);
  const [auditIdInput, setAuditIdInput] = useDebouncedField(auditId, commitAuditId);

  const onSortField = (field: SortField) => updateParams({ sort: field, order, page: "1" });
  const toggleOrder = () => updateParams({ sort, order: order === "asc" ? "desc" : "asc", page: "1" });
  const onStartDate = (value: string) => updateParams({ start_date: value || null, page: "1" });
  const onEndDate = (value: string) => updateParams({ end_date: value || null, page: "1" });
  const clearDates = () => updateParams({ start_date: null, end_date: null, page: "1" });
  const clearAllFilters = () => {
    setTerm("");
    setUserIdInput("");
    setAuditIdInput("");
    updateParams({
      search: null,
      user_id: null,
      audit_id: null,
      start_date: null,
      end_date: null,
      page: "1",
    });
  };
  const goToPage = (target: number) => updateParams({ page: String(target) });

  const directionLabel = useMemo(() => {
    if (sort === "paid_at") return order === "desc" ? "Newest first" : "Oldest first";
    return order === "asc" ? "A–Z" : "Z–A";
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
              <span className="sr-only">Search by customer, domain, audit ID, or payment ID</span>
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search customer, domain, audit ID, or payment ID"
                className="w-full rounded-lg border-2 border-line-2 bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand focus:shadow-focus"
              />
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

          {/* Secondary ID filters — compact, below the primary toolbar. */}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">User ID</span>
              <input
                type="text"
                value={userIdInput}
                onChange={(event) => setUserIdInput(event.target.value)}
                placeholder="exact user id"
                className="w-44 rounded-lg border-2 border-line-2 bg-surface px-2.5 py-[7px] font-mono text-2xs text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">Audit ID</span>
              <input
                type="text"
                value={auditIdInput}
                onChange={(event) => setAuditIdInput(event.target.value)}
                placeholder="exact audit id"
                className="w-44 rounded-lg border-2 border-line-2 bg-surface px-2.5 py-[7px] font-mono text-2xs text-ink outline-none focus:border-brand"
              />
            </label>
            {(userId || auditId) && (
              <button
                type="button"
                onClick={() => {
                  setUserIdInput("");
                  setAuditIdInput("");
                  updateParams({ user_id: null, audit_id: null, page: "1" });
                }}
                className="btn-ghost h-[38px] gap-1 px-2.5 text-2xs uppercase tracking-[0.06em]"
              >
                <X size={13} weight="bold" /> Clear IDs
              </button>
            )}
          </div>

          <div className="mt-4">
            {state.status === "loading" && <TableSkeleton />}
            {state.status === "ready" &&
              (state.data.entitlements.length === 0 ? (
                <EntitlementsEmpty hasFilters={hasFilters} onClear={clearAllFilters} />
              ) : (
                <EntitlementsTable
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

function KpiRow({ summary }: { summary: EntitlementsSummary | null }) {
  if (!summary) {
    return (
      <div role="status" aria-label="Loading entitlement summary">
        <div className="card w-full animate-pulse p-4 sm:w-60">
          <div className="h-3 w-28 rounded bg-subtle" />
          <div className="mt-3 h-6 w-16 rounded bg-subtle" />
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Entitlement summary">
      <div className="card w-full p-4 sm:w-60">
        <p className="text-2xs font-bold uppercase tracking-[0.06em] text-ink-3">Total Entitlements</p>
        <p className="data-fig mt-2 text-xl font-semibold text-ink sm:text-2xl">{num(summary.total)}</p>
      </div>
    </section>
  );
}

function EntitlementsTable({
  data,
  onPrev,
  onNext,
}: {
  data: EntitlementsResponse;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, data.total_pages);
  const headClass = "px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3";

  return (
    <div>
      <div className="max-w-full overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle/60">
              <th scope="col" className={headClass}>Customer</th>
              <th scope="col" className={headClass}>Audit</th>
              <th scope="col" className={headClass}>Domain</th>
              <th scope="col" className={headClass}>Audit status</th>
              <th scope="col" className={headClass}>Payment</th>
              <th scope="col" className={headClass}>Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.entitlements.map((entitlement) => (
              <tr
                key={`${entitlement.user_id}:${entitlement.audit_id}`}
                className="align-top transition-colors hover:bg-subtle/50"
              >
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-ink">{entitlement.user_name ?? "—"}</div>
                  {entitlement.user_email && <div className="text-2xs text-ink-3">{entitlement.user_email}</div>}
                </td>
                <td className="px-3 py-2.5">
                  <span className="data-fig break-all text-2xs text-ink-2">{entitlement.audit_id}</span>
                </td>
                <td className="px-3 py-2.5 text-ink-2">{entitlement.domain ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {entitlement.audit_status ? (
                    <Badge tone={auditStatusTone(entitlement.audit_status)}>
                      {auditStatusLabel(entitlement.audit_status)}
                    </Badge>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="data-fig break-all text-2xs text-ink-2">{entitlement.payment_id ?? "—"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(entitlement.paid_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-3">
          {num(data.total)} entitlement{data.total === 1 ? "" : "s"}
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

function EntitlementsEmpty({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  if (!hasFilters) {
    return (
      <EmptyState title="No entitlements yet">
        Entitlements appear here once a customer unlocks a report.
      </EmptyState>
    );
  }
  return (
    <div>
      <EmptyState title="No entitlements match your filters">
        Try a different customer, audit, date range, or search term.
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
    <div role="status" aria-label="Loading entitlements" className="animate-pulse">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="h-10 border-b border-line bg-subtle/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-3 py-3.5 last:border-b-0">
            <div className="h-8 flex-1 rounded bg-subtle" />
            <div className="hidden h-4 w-28 rounded bg-subtle sm:block" />
            <div className="h-6 w-16 rounded bg-subtle" />
            <div className="hidden h-4 w-20 rounded bg-subtle md:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading entitlements…</span>
    </div>
  );
}

function EntitlementsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="card w-full p-4 sm:w-60">
        <div className="h-3 w-28 rounded bg-subtle" />
        <div className="mt-3 h-6 w-16 rounded bg-subtle" />
      </div>
      <div className="mt-6 h-9 w-full rounded bg-subtle" />
      <div className="mt-4 h-64 rounded-lg border border-line bg-subtle/40" />
    </div>
  );
}
