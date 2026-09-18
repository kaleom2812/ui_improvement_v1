"use client";

// Admin Dashboard — Customer detail.
//
// Consumes ONLY GET /api/admin/users/[id] (the existing proxy -> FastAPI
// /admin/users/{id}). Shows the customer profile plus their audits, payments,
// and entitlements as read-only groups on this one page — there are no
// standalone /admin/payments, /admin/audits, or /admin/entitlements routes in
// this stage. report_data and any secret is never requested or rendered.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { Badge, EmptyState, KeyValueList } from "@/components/primitives";
import type { Tone } from "@/lib/format";
import { formatDate, formatMoneyMinor, formatScore } from "@/lib/adminFormat";
import {
  fetchAdminJson,
  LoadErrorNotice,
  NotFoundNotice,
  UnauthorizedNotice,
} from "../../shared";

interface DetailUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}
interface DetailAudit {
  id: string;
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
interface DetailPayment {
  id: string;
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
interface DetailEntitlement {
  audit_id: string;
  payment_id: string | null;
  paid_at: string;
}
interface CustomerDetail {
  user: DetailUser;
  audits: DetailAudit[];
  payments: DetailPayment[];
  entitlements: DetailEntitlement[];
}

type DetailState =
  | { status: "loading" }
  | { status: "ready"; data: CustomerDetail }
  | { status: "error" }
  | { status: "notfound" }
  | { status: "unauthorized"; reason: "forbidden" | "unauthenticated" };

function auditStatusTone(status: string): Tone {
  if (status === "complete") return "pos";
  if (status === "failed") return "neg";
  if (status === "incomplete") return "warn";
  return "brand"; // processing
}
function paymentStatusTone(status: string): Tone {
  if (status === "paid") return "pos";
  if (status === "failed") return "neg";
  return "neutral"; // created
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!id) {
      setState({ status: "notfound" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    void fetchAdminJson<CustomerDetail>(`/api/admin/users/${encodeURIComponent(id)}`).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") setState({ status: "ready", data: result.data });
      else if (result.kind === "notfound") setState({ status: "notfound" });
      else if (result.kind === "unauthorized") setState({ status: "unauthorized", reason: result.reason });
      else setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  return (
    <div className="site-container py-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
        >
          <ArrowLeft size={13} weight="bold" /> Back to Customers
        </Link>

        {state.status === "loading" && <DetailSkeleton />}
        {state.status === "error" && (
          <div className="mt-6">
            <LoadErrorNotice onRetry={load} />
          </div>
        )}
        {state.status === "unauthorized" && (
          <div className="mt-6">
            <UnauthorizedNotice reason={state.reason} />
          </div>
        )}
        {state.status === "notfound" && (
          <div className="mt-6">
            <NotFoundNotice
              title="Customer not found"
              backHref="/admin/customers"
              backLabel="Back to Customers"
            >
              This customer may have been removed, or the link is out of date.
            </NotFoundNotice>
          </div>
        )}
        {state.status === "ready" && <Detail data={state.data} />}
      </div>
    </div>
  );
}

function Detail({ data }: { data: CustomerDetail }) {
  const { user, audits, payments, entitlements } = data;

  return (
    <div>
      <header className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{user.name}</h1>
        {user.is_admin && <Badge tone="brand">Admin</Badge>}
      </header>
      <p className="mt-1 text-sm text-ink-2">{user.email}</p>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-ink">Customer information</h2>
        <div className="mt-3 card p-5">
          <KeyValueList
            rows={[
              { label: "Name", value: user.name },
              { label: "Email", value: user.email },
              { label: "Admin status", value: user.is_admin ? "Administrator" : "Standard account" },
              { label: "Joined", value: formatDate(user.created_at) },
              { label: "Last updated", value: formatDate(user.updated_at) },
            ]}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-ink">
          Audits <span className="font-medium text-ink-3">({audits.length})</span>
        </h2>
        <div className="mt-3">
          {audits.length === 0 ? (
            <EmptyState title="No audits for this customer" />
          ) : (
            <div className="max-w-full overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-subtle/60 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                    <th scope="col" className="px-3 py-2.5">Domain</th>
                    <th scope="col" className="px-3 py-2.5">Status</th>
                    <th scope="col" className="px-3 py-2.5">Company</th>
                    <th scope="col" className="px-3 py-2.5">Category</th>
                    <th scope="col" className="px-3 py-2.5 text-right">GEO score</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Technical</th>
                    <th scope="col" className="px-3 py-2.5">Created</th>
                    <th scope="col" className="px-3 py-2.5">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {audits.map((audit) => (
                    <tr key={audit.id} className="align-top hover:bg-subtle/50">
                      <td className="px-3 py-2.5 font-semibold text-ink">{audit.domain}</td>
                      <td className="px-3 py-2.5"><Badge tone={auditStatusTone(audit.status)}>{audit.status}</Badge></td>
                      <td className="px-3 py-2.5 text-ink-2">{audit.company_name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-ink-2">{audit.category ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right"><span className="data-fig text-ink">{formatScore(audit.geo_score)}</span></td>
                      <td className="px-3 py-2.5 text-right"><span className="data-fig text-ink">{formatScore(audit.technical_readiness)}</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(audit.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(audit.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-ink">
          Payments <span className="font-medium text-ink-3">({payments.length})</span>
        </h2>
        <div className="mt-3">
          {payments.length === 0 ? (
            <EmptyState title="No payments for this customer" />
          ) : (
            <div className="max-w-full overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-subtle/60 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                    <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
                    <th scope="col" className="px-3 py-2.5">Currency</th>
                    <th scope="col" className="px-3 py-2.5">Status</th>
                    <th scope="col" className="px-3 py-2.5">Plan</th>
                    <th scope="col" className="px-3 py-2.5">Razorpay order ID</th>
                    <th scope="col" className="px-3 py-2.5">Razorpay payment ID</th>
                    <th scope="col" className="px-3 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="align-top hover:bg-subtle/50">
                      <td className="px-3 py-2.5 text-right"><span className="data-fig font-semibold text-ink">{formatMoneyMinor(payment.amount, payment.currency)}</span></td>
                      <td className="px-3 py-2.5 text-ink-2">{payment.currency}</td>
                      <td className="px-3 py-2.5"><Badge tone={paymentStatusTone(payment.status)}>{payment.status}</Badge></td>
                      <td className="px-3 py-2.5 text-ink-2">{payment.plan}</td>
                      <td className="px-3 py-2.5"><span className="data-fig break-all text-2xs text-ink-2">{payment.razorpay_order_id}</span></td>
                      <td className="px-3 py-2.5"><span className="data-fig break-all text-2xs text-ink-2">{payment.razorpay_payment_id ?? "—"}</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(payment.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-ink">
          Entitlements <span className="font-medium text-ink-3">({entitlements.length})</span>
        </h2>
        <div className="mt-3">
          {entitlements.length === 0 ? (
            <EmptyState title="No entitlements for this customer" />
          ) : (
            <div className="max-w-full overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-subtle/60 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                    <th scope="col" className="px-3 py-2.5">Audit ID</th>
                    <th scope="col" className="px-3 py-2.5">Payment ID</th>
                    <th scope="col" className="px-3 py-2.5">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {entitlements.map((entitlement, i) => (
                    <tr key={`${entitlement.audit_id}-${i}`} className="align-top hover:bg-subtle/50">
                      <td className="px-3 py-2.5"><span className="data-fig break-all text-2xs text-ink-2">{entitlement.audit_id}</span></td>
                      <td className="px-3 py-2.5"><span className="data-fig break-all text-2xs text-ink-2">{entitlement.payment_id ?? "—"}</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">{formatDate(entitlement.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading customer" className="mt-6 animate-pulse">
      <div className="h-7 w-48 rounded bg-subtle" />
      <div className="mt-2 h-4 w-64 max-w-full rounded bg-subtle" />
      <div className="mt-8 card h-48 p-5" />
      <div className="mt-8 card h-40 p-5" />
      <div className="mt-8 card h-40 p-5" />
      <span className="sr-only">Loading customer…</span>
    </div>
  );
}
