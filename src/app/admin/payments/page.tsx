"use client";

// Admin Dashboard — Payments.
//
// Consumes ONLY GET /api/admin/payments (the existing proxy -> FastAPI
// /admin/payments). Status / search / date range / sort / pagination all live
// in the URL (URLSearchParams + router.replace) so the view is shareable and
// the back button works. Every filter is applied by the backend — there is no
// client-side filtering or slicing. Amounts are the API's minor units and are
// only formatted for display, never modified.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, MagnifyingGlass, SortAscending, SortDescending, X } from "@phosphor-icons/react";
import { Badge, EmptyState } from "@/components/primitives";
import type { Tone } from "@/lib/format";
import { num } from "@/lib/format";
import { formatDate, formatMoneyMinor, formatRevenueInr } from "@/lib/adminFormat";
import { fetchAdminJson, LoadErrorNotice, UnauthorizedNotice } from "../shared";

const SORT_FIELDS = ["created_at", "amount", "status"] as const;
type SortField = (typeof SORT_FIELDS)[number];
const SORT_LABEL: Record<SortField, string> = {
  created_at: "Date",
  amount: "Amount",
  status: "Status",
};

const STATUS_VALUES = ["paid", "failed", "created"] as const;
type PaymentStatus = (typeof STATUS_VALUES)[number];
const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  failed: "Failed",
  created: "Pending",
};

const DEFAULT_LIMIT = "25";
const SEARCH_DEBOUNCE_MS = 350;

interface PaymentRow {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  audit_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

interface PaymentsSummary {
  total: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  total_revenue: number;
}

interface PaymentsResponse {
  payments: PaymentRow[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  amount_unit: string;
  summary: PaymentsSummary;
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; data: PaymentsResponse }
  | { status: "error" }
  | { status: "unauthorized"; reason: "forbidden" | "unauthenticated" };

function statusTone(status: string): Tone {
  if (status === "paid") return "pos";
  if (status === "failed") return "neg";
  return "neutral"; // created / anything else
}
function statusLabel(status: string): string {
  return (STATUS_LABEL as Record<string, string>)[status] ?? status;
}

export default function PaymentsPage() {
  return (
    <div className="site-container py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Payments</h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Recorded payment activity across every customer — each Razorpay order created, captured, or failed.
          </p>
        </header>
        <Suspense fallback={<div className="mt-6"><PaymentsSkeleton /></div>}>
          <PaymentsView />
        </Suspense>
      </div>
    </div>
  );
}

function PaymentsView() {
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
  const status: PaymentStatus | "" = (STATUS_VALUES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as PaymentStatus)
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
    void fetchAdminJson<PaymentsResponse>(`/api/admin/payments?${query.toString()}`).then((result) => {
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
    if (sort === "amount") return order === "asc" ? "Low to high" : "High to low";
    if (sort === "status") return order === "asc" ? "A–Z" : "Z–A";
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
              <span className="sr-only">Search by customer or Razorpay ID</span>
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search customer, email, or Razorpay ID"
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
              (state.data.payments.length === 0 ? (
                <PaymentsEmpty hasFilters={hasFilters} onClear={clearAllFilters} />
              ) : (
                <PaymentsTable
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

function KpiRow({ summary }: { summary: PaymentsSummary | null }) {
  const cards: Array<{ label: string; value: string }> = summary
    ? [
        { label: "Total Payments", value: num(summary.total) },
        { label: "Successful Payments", value: num(summary.successful_payments) },
        { label: "Failed Payments", value: num(summary.failed_payments) },
        { label: "Pending Payments", value: num(summary.pending_payments) },
        { label: "Total Revenue", value: formatRevenueInr(summary.total_revenue) },
      ]
    : [];

  if (!summary) {
    return (
      <div role="status" aria-label="Loading payment summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse p-4">
            <div className="h-3 w-20 rounded bg-subtle" />
            <div className="mt-3 h-6 w-16 rounded bg-subtle" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Payment summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="card p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.06em] text-ink-3">{card.label}</p>
          <p className="data-fig mt-2 text-xl font-semibold text-ink sm:text-2xl">{card.value}</p>
        </div>
      ))}
    </section>
  );
}

function PaymentsTable({
  data,
  onPrev,
  onNext,
}: {
  data: PaymentsResponse;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, data.total_pages);
  const headClass = "px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3";

  return (
    <div>
      <div className="max-w-full overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle/60">
              <th scope="col" className={headClass}>Customer</th>
              <th scope="col" className={`${headClass} text-right`}>Amount</th>
              <th scope="col" className={headClass}>Status</th>
              <th scope="col" className={headClass}>Plan</th>
              <th scope="col" className={headClass}>Audit</th>
              <th scope="col" className={headClass}>Razorpay order</th>
              <th scope="col" className={headClass}>Razorpay payment</th>
              <th scope="col" className={headClass}>Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.payments.map((payment) => (
              <tr key={payment.id} className="align-top transition-colors hover:bg-subtle/50">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-ink">{payment.user_name ?? "—"}</div>
                  {payment.user_email && <div className="text-2xs text-ink-3">{payment.user_email}</div>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="data-fig font-semibold text-ink">{formatMoneyMinor(payment.amount, payment.currency)}</span>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={statusTone(payment.status)}>{statusLabel(payment.status)}</Badge>
                </td>
                <td className="px-3 py-2.5 text-ink-2">{payment.plan}</td>
                <td className="px-3 py-2.5"><span className="data-fig break-all text-2xs text-ink-2">{payment.audit_id}</span></td>
                <td className="px-3 py-2.5"><span className="data-fig break-all text-2xs text-ink-2">{payment.razorpay_order_id}</span></td>
                <td className="px-3 py-2.5"><span className="data-fig break-all text-2xs text-ink-2">{payment.razorpay_payment_id ?? "—"}</span></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(payment.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-3">
          {num(data.total)} payment{data.total === 1 ? "" : "s"}
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

function PaymentsEmpty({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  if (!hasFilters) {
    return <EmptyState title="No payments recorded yet">Payments will appear here once customers check out.</EmptyState>;
  }
  return (
    <div>
      <EmptyState title="No payments match your filters">
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
    <div role="status" aria-label="Loading payments" className="animate-pulse">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="h-10 border-b border-line bg-subtle/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-3 py-3.5 last:border-b-0">
            <div className="h-8 flex-1 rounded bg-subtle" />
            <div className="hidden h-4 w-20 rounded bg-subtle sm:block" />
            <div className="h-6 w-14 rounded bg-subtle" />
            <div className="hidden h-4 w-24 rounded bg-subtle md:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading payments…</span>
    </div>
  );
}

function PaymentsSkeleton() {
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
