"use client";

// Shared admin-page building blocks: a small typed fetch wrapper that maps HTTP
// status to a UI outcome, plus the inline notice components used by more than
// one admin page. Kept deliberately thin — the Next.js /api/admin/* proxy owns
// session forwarding and FastAPI `_require_admin` owns authorization; nothing
// here re-implements either.

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowClockwise, ShieldWarning, WarningCircle, MagnifyingGlass } from "@phosphor-icons/react";

export type AdminOutcome<T> =
  | { kind: "ok"; data: T }
  | { kind: "error" }
  | { kind: "notfound" }
  | { kind: "unauthorized"; reason: "forbidden" | "unauthenticated" };

/** Fetch admin JSON via the existing proxy. Never reads cookies or tokens. */
export async function fetchAdminJson<T>(url: string): Promise<AdminOutcome<T>> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 401) return { kind: "unauthorized", reason: "unauthenticated" };
    if (res.status === 403) return { kind: "unauthorized", reason: "forbidden" };
    if (res.status === 404) return { kind: "notfound" };
    if (!res.ok) return { kind: "error" };
    return { kind: "ok", data: (await res.json()) as T };
  } catch {
    return { kind: "error" };
  }
}

/** Generic, retryable error — internal/backend error text is never surfaced. */
export function LoadErrorNotice({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-neg/30 bg-neg-soft p-5"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-neg">
        <WarningCircle size={18} weight="bold" /> Something went wrong
      </p>
      <p className="text-sm text-ink-2">
        {message ?? "We couldn't load this data right now. Please try again in a moment."}
      </p>
      <button type="button" onClick={onRetry} className="btn-secondary h-9 px-4 text-sm">
        <ArrowClockwise size={15} weight="bold" /> Try again
      </button>
    </div>
  );
}

/** 401 / 403 handling, consistent with the Overview page. */
export function UnauthorizedNotice({ reason }: { reason: "forbidden" | "unauthenticated" }) {
  const forbidden = reason === "forbidden";
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-line-2 bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldWarning size={18} weight="bold" className="text-warn" />
        {forbidden ? "You don't have access to the admin dashboard" : "Your session has expired"}
      </p>
      <p className="text-sm text-ink-2">
        {forbidden
          ? "This area is limited to administrator accounts."
          : "Please sign in again to continue."}
      </p>
      {forbidden ? (
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

/** 404 for a resource that does not exist. */
export function NotFoundNotice({
  title,
  children,
  backHref,
  backLabel,
}: {
  title: string;
  children?: ReactNode;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-line-2 bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <MagnifyingGlass size={18} weight="bold" className="text-ink-3" /> {title}
      </p>
      {children && <p className="text-sm text-ink-2">{children}</p>}
      <Link href={backHref} className="btn-secondary h-9 px-4 text-sm">
        {backLabel}
      </Link>
    </div>
  );
}
