"use client";

// Admin Dashboard — Webhooks.
//
// Consumes ONLY GET /api/admin/webhooks (the proxy -> FastAPI /admin/webhooks
// -> the private D1 Worker's GET /v1/admin/webhooks). Pagination and the single
// supported sort direction live in the URL (URLSearchParams + router.replace)
// so the view is shareable and the back button works.
//
// DATA LIMITATION: webhook_events is an idempotency ledger with exactly two
// columns — event_id (a synthetic dedupe key, NOT a guaranteed Razorpay event
// id) and received_at. There is no event type, status, payload, or
// payment/order id to show, and no search/date filters on the backend — this
// page must not invent any of that.

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { EmptyState } from "@/components/primitives";
import { num } from "@/lib/format";
import { formatDate } from "@/lib/adminFormat";
import { fetchAdminJson, LoadErrorNotice, UnauthorizedNotice } from "../shared";

const DEFAULT_LIMIT = "25";

type Order = "asc" | "desc";

interface WebhookEventRow {
  event_id: string;
  received_at: string;
}

interface WebhooksSummary {
  total: number;
}

interface WebhooksResponse {
  webhook_events: WebhookEventRow[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  summary: WebhooksSummary;
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; data: WebhooksResponse }
  | { status: "error" }
  | { status: "unauthorized"; reason: "forbidden" | "unauthenticated" };

export default function WebhooksPage() {
  return (
    <div className="site-container py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Webhooks</h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Razorpay webhook deliveries recorded for idempotency — one row per unique event received.
          </p>
        </header>
        <Suspense fallback={<div className="mt-6"><WebhooksSkeleton /></div>}>
          <WebhooksView />
        </Suspense>
      </div>
    </div>
  );
}

function WebhooksView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only "received_at" is ever a valid backend sort field, and only "asc" is a
  // valid non-default order — anything else in the URL is normalized here
  // before it ever reaches the API request below.
  const order: Order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = searchParams.get("limit") ?? DEFAULT_LIMIT;

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
    const query = new URLSearchParams({ page: String(page), limit, sort: "received_at", order });
    void fetchAdminJson<WebhooksResponse>(`/api/admin/webhooks?${query.toString()}`).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") setState({ status: "ready", data: result.data });
      else if (result.kind === "unauthorized") setState({ status: "unauthorized", reason: result.reason });
      else setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [page, limit, order, reloadKey]);

  const onOrderChange = (value: Order) => updateParams({ order: value, page: "1" });
  const goToPage = (target: number) => updateParams({ page: String(target) });

  const busy = state.status === "loading" || state.status === "ready";

  return (
    <div className="mt-6">
      {state.status === "error" && <LoadErrorNotice onRetry={() => setReloadKey((k) => k + 1)} />}
      {state.status === "unauthorized" && <UnauthorizedNotice reason={state.reason} />}

      {busy && (
        <>
          <KpiRow summary={state.status === "ready" ? state.data.summary : null} />

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">Order</span>
              <select
                value={order}
                onChange={(event) => onOrderChange(event.target.value as Order)}
                aria-label="Order"
                className="rounded-lg border-2 border-line-2 bg-surface px-2.5 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
          </div>

          <div className="mt-4">
            {state.status === "loading" && <TableSkeleton />}
            {state.status === "ready" &&
              (state.data.webhook_events.length === 0 ? (
                <WebhooksEmpty />
              ) : (
                <WebhooksTable
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

function KpiRow({ summary }: { summary: WebhooksSummary | null }) {
  if (!summary) {
    return (
      <div role="status" aria-label="Loading webhook summary">
        <div className="card w-full animate-pulse p-4 sm:w-60">
          <div className="h-3 w-32 rounded bg-subtle" />
          <div className="mt-3 h-6 w-16 rounded bg-subtle" />
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Webhook summary">
      <div className="card w-full p-4 sm:w-60">
        <p className="text-2xs font-bold uppercase tracking-[0.06em] text-ink-3">Total Webhook Events</p>
        <p className="data-fig mt-2 text-xl font-semibold text-ink sm:text-2xl">{num(summary.total)}</p>
      </div>
    </section>
  );
}

function WebhooksTable({
  data,
  onPrev,
  onNext,
}: {
  data: WebhooksResponse;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, data.total_pages);
  const headClass = "px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3";

  return (
    <div>
      <div className="max-w-full overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle/60">
              <th scope="col" className={headClass}>Dedupe Key</th>
              <th scope="col" className={headClass}>Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.webhook_events.map((event) => (
              <tr key={event.event_id} className="align-top transition-colors hover:bg-subtle/50">
                <td className="px-3 py-2.5">
                  <span className="data-fig break-all text-2xs text-ink-2">{event.event_id}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(event.received_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-3">
          {num(data.total)} webhook event{data.total === 1 ? "" : "s"}
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

function WebhooksEmpty() {
  // webhook_events has no search/date filters, so there is only one empty
  // state — nothing has ever been received yet.
  return (
    <EmptyState title="No webhook events yet">
      Webhook events appear here once Razorpay sends a payment notification.
    </EmptyState>
  );
}

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading webhook events" className="animate-pulse">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="h-10 border-b border-line bg-subtle/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-3 py-3.5 last:border-b-0">
            <div className="h-4 flex-1 rounded bg-subtle" />
            <div className="h-4 w-28 rounded bg-subtle" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading webhook events…</span>
    </div>
  );
}

function WebhooksSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="card w-full p-4 sm:w-60">
        <div className="h-3 w-32 rounded bg-subtle" />
        <div className="mt-3 h-6 w-16 rounded bg-subtle" />
      </div>
      <div className="mt-6 h-9 w-40 rounded bg-subtle" />
      <div className="mt-4 h-64 rounded-lg border border-line bg-subtle/40" />
    </div>
  );
}
