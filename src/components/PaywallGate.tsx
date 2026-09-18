"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LockSimple, ArrowRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useUser } from "@/lib/auth";

// Ported from GEO-UI-Version-5/src/components/PaywallGate.jsx (next/link).
// Now auth-aware: an unauthenticated visitor is routed to /login first, with
// the current audit/report URL preserved via ?redirect= so they land back on
// the exact report they were trying to unlock once they've signed in. An
// already-authenticated visitor goes straight to /checkout, unchanged.

function useUnlockHref(): string {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (isSignedIn) return "/checkout";
  const query = searchParams.toString();
  const current = query ? `${pathname}?${query}` : pathname;
  return `/login?redirect=${encodeURIComponent(current)}`;
}

/**
 * Wraps a premium block. When locked, shows a compact faded preview with a
 * value message and CTA — never a blunt full-page blur.
 */
export function PaywallGate({
  locked,
  title,
  value,
  children,
  previewHeight = 150,
  cta = "Unlock full report",
}: {
  locked: boolean;
  title: ReactNode;
  value?: ReactNode;
  children: ReactNode;
  previewHeight?: number;
  cta?: string;
}) {
  const href = useUnlockHref();
  if (!locked) return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none overflow-hidden opacity-55 blur-[3px]"
        style={{ maxHeight: previewHeight }}
      >
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-b from-transparent to-surface" />
      <div className="relative -mt-10 flex flex-col items-center gap-3 px-6 pb-7 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand/30 bg-brand-soft text-brand-dark">
          <LockSimple size={18} weight="bold" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          {value && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">{value}</p>}
        </div>
        <Link href={href} className="btn-primary">
          {cta} <ArrowRight size={15} weight="bold" />
        </Link>
      </div>
    </div>
  );
}

/** Full-width "the rest of the report is locked" seam. */
export function PaywallSeam({ includes = [], price = 149 }: { includes?: string[]; price?: number }) {
  const href = useUnlockHref();
  return (
    <div className="rounded-xl border border-brand/30 bg-brand-soft/60 p-6 sm:p-8">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-brand/40 bg-surface text-brand-dark">
          <LockSimple size={20} weight="bold" />
        </span>
        <h3 className="mt-4 text-xl font-bold text-ink">The rest of your report is ready</h3>
        <p className="mt-2 text-sm text-ink-2">
          You have seen your score, your top issues and example AI answers. The full report shows exactly
          which prompts you are losing, the pages to fix, and a dated 90-day plan.
        </p>
        {includes.length > 0 && (
          <ul className="mx-auto mt-5 grid max-w-md gap-2 text-left text-sm">
            {includes.map((x) => (
              <li key={x} className="flex items-start gap-2 text-ink-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {x}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-col items-center gap-2">
          <Link href={href} className="btn-primary">
            Unlock full report — ${price} <ArrowRight size={15} weight="bold" />
          </Link>
          <Link href="/pricing" className="text-2xs font-medium uppercase tracking-[0.08em] text-ink-3 hover:text-ink">
            See what&apos;s included
          </Link>
        </div>
        <p className="mt-3 text-2xs text-ink-3">
          Checkout is simulated in this build — no card is charged.
        </p>
      </div>
    </div>
  );
}
