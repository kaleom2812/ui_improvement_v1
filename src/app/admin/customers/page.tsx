"use client";

// Admin Dashboard — Customers list.
//
// Consumes ONLY GET /api/admin/users (the existing proxy -> FastAPI
// /admin/users). page / limit / search / sort / order live in the URL so the
// view is shareable and the back button works; every change is pushed with
// URLSearchParams. Search, sorting, and pagination are all the backend's job —
// there is no client-side filtering or slicing of the list.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretLeft, CaretRight, MagnifyingGlass, SortAscending, SortDescending } from "@phosphor-icons/react";
import { Badge, EmptyState } from "@/components/primitives";
import { num } from "@/lib/format";
import { formatDate } from "@/lib/adminFormat";
import { fetchAdminJson, LoadErrorNotice, UnauthorizedNotice } from "../shared";

const SORT_FIELDS = ["created_at", "name", "email"] as const;
type SortField = (typeof SORT_FIELDS)[number];
const SORT_LABEL: Record<SortField, string> = {
  created_at: "Joined",
  name: "Name",
  email: "Email",
};
const DEFAULT_LIMIT = "25";
const SEARCH_DEBOUNCE_MS = 350;

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  audit_count: number;
  payment_count: number;
}

interface UsersResponse {
  users: CustomerRow[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

type ListState =
  | { status: "loading" }
  | { status: "ready"; data: UsersResponse }
  | { status: "error" }
  | { status: "unauthorized"; reason: "forbidden" | "unauthenticated" };

export default function CustomersPage() {
  return (
    <div className="site-container py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Customers</h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Every account on the platform, with audit and payment activity.
          </p>
        </header>
        <Suspense fallback={<div className="mt-6"><TableSkeleton /></div>}>
          <CustomersList />
        </Suspense>
      </div>
    </div>
  );
}

function CustomersList() {
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

  // Fetch whenever an effective parameter changes (or a retry is requested).
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const query = new URLSearchParams({ page: String(page), limit, sort, order });
    if (search) query.set("search", search);
    void fetchAdminJson<UsersResponse>(`/api/admin/users?${query.toString()}`).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") setState({ status: "ready", data: result.data });
      else if (result.kind === "unauthorized") setState({ status: "unauthorized", reason: result.reason });
      else setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [page, limit, sort, order, search, reloadKey]);

  // Keep the input in sync with the URL (e.g. after a back-button navigation).
  useEffect(() => {
    setTerm(search);
  }, [search]);

  // Debounced search: push to the URL (resetting to page 1) once typing settles.
  useEffect(() => {
    if (term === search) return;
    const handle = setTimeout(() => {
      updateParams({ search: term || null, page: "1" });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [term, search, updateParams]);

  const onSortField = (field: SortField) => updateParams({ sort: field, order, page: "1" });
  const toggleOrder = () =>
    updateParams({ sort, order: order === "asc" ? "desc" : "asc", page: "1" });
  const goToPage = (target: number) => updateParams({ page: String(target) });

  const directionLabel = useMemo(() => {
    if (sort === "created_at") return order === "desc" ? "Newest first" : "Oldest first";
    return order === "asc" ? "A–Z" : "Z–A";
  }, [sort, order]);

  return (
    <div className="mt-6">
      {(state.status === "loading" || state.status === "ready") && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Search customers by name or email</span>
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-lg border-2 border-line-2 bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand focus:shadow-focus"
            />
          </label>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
              Sort
              <select
                value={sort}
                onChange={(event) => onSortField(event.target.value as SortField)}
                className="rounded-lg border-2 border-line-2 bg-surface px-2.5 py-2 text-sm font-medium normal-case tracking-normal text-ink outline-none focus:border-brand"
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
              className="btn-secondary h-9 gap-1.5 px-3 text-2xs uppercase tracking-[0.06em]"
            >
              {order === "asc" ? <SortAscending size={14} weight="bold" /> : <SortDescending size={14} weight="bold" />}
              {directionLabel}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {state.status === "loading" && <TableSkeleton />}
        {state.status === "error" && <LoadErrorNotice onRetry={() => setReloadKey((k) => k + 1)} />}
        {state.status === "unauthorized" && <UnauthorizedNotice reason={state.reason} />}
        {state.status === "ready" && (
          <CustomerTable
            data={state.data}
            search={search}
            onPrev={() => goToPage(page - 1)}
            onNext={() => goToPage(page + 1)}
          />
        )}
      </div>
    </div>
  );
}

function CustomerTable({
  data,
  search,
  onPrev,
  onNext,
}: {
  data: UsersResponse;
  search: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (data.users.length === 0) {
    return (
      <EmptyState title={search ? "No customers match your search" : "No customers yet"}>
        {search ? "Try a different name or email." : undefined}
      </EmptyState>
    );
  }

  const totalPages = Math.max(1, data.total_pages);

  return (
    <div>
      <div className="max-w-full overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle/60">
              <th scope="col" className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                Customer
              </th>
              <th scope="col" className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                Joined
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                Audits
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                Payments
              </th>
              <th scope="col" className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                Admin
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.users.map((user) => (
              <tr key={user.id} className="align-middle transition-colors hover:bg-subtle/50">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-ink">{user.name}</div>
                  <div className="text-2xs text-ink-3">{user.email}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(user.created_at)}</td>
                <td className="px-3 py-2.5 text-right"><span className="data-fig text-ink">{num(user.audit_count)}</span></td>
                <td className="px-3 py-2.5 text-right"><span className="data-fig text-ink">{num(user.payment_count)}</span></td>
                <td className="px-3 py-2.5">
                  {user.is_admin ? <Badge tone="brand">Admin</Badge> : <span className="text-ink-3">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    href={`/admin/customers/${user.id}`}
                    className="btn-ghost h-8 px-3 text-2xs uppercase tracking-[0.06em]"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink-3">
          {num(data.total)} customer{data.total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!data.has_prev}
            className="btn-secondary h-9 gap-1.5 px-3 text-sm"
          >
            <CaretLeft size={14} weight="bold" /> Previous
          </button>
          <span className="data-fig whitespace-nowrap text-2xs text-ink-3">
            Page {num(data.page)} of {num(totalPages)}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!data.has_next}
            className="btn-secondary h-9 gap-1.5 px-3 text-sm"
          >
            Next <CaretRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading customers" className="animate-pulse">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="h-10 border-b border-line bg-subtle/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-3 py-3.5 last:border-b-0">
            <div className="h-8 flex-1 rounded bg-subtle" />
            <div className="hidden h-4 w-24 rounded bg-subtle sm:block" />
            <div className="h-4 w-10 rounded bg-subtle" />
            <div className="h-7 w-14 rounded bg-subtle" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading customers…</span>
    </div>
  );
}
