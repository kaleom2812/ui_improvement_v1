"use client";

// Checkout success. Visual direction from GEO-UI-Version-4 (audit/CheckoutSuccess.jsx).
//
// IMPORTANT: unlike the V4 prototype, this page does NOT call any unlock()
// itself. The entitlement is granted server-side by /checkout's real,
// signature-verified Razorpay flow (POST /api/payment/verify). This page only
// *reads* `unlocked` and bounces back to /checkout if payment did not
// actually complete — that guard is what keeps /checkout/success from being
// a way past the paywall.

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { useAuditFlow } from "@/state/audit-flow";
import { pricing } from "@/data/site";
import { money } from "@/lib/format";
import { FullPageLoading } from "@/components/Loading";

export default function CheckoutSuccess() {
  const router = useRouter();
  const { unlocked, lastAudit, authLoaded } = useAuditFlow();
  const plan = pricing.plans.find((p) => p.id === "report") || pricing.plans[1];

  // Wait for the account/entitlement check (GET /api/auth/me) before deciding
  // to bounce back to /checkout, so a refresh here for an already-paid user
  // doesn't get redirected during that brief window.
  useEffect(() => {
    if (authLoaded && !unlocked) router.replace("/checkout");
  }, [authLoaded, unlocked, router]);

  if (!authLoaded) return <FullPageLoading label="Checking your order…" />;
  if (!unlocked) return null;

  return (
    <div className="site-container flex min-h-[calc(100vh-3.5rem)] max-w-lg flex-col justify-center py-12 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pos-soft text-pos">
        <CheckCircle size={30} weight="fill" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Your report is unlocked</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
        The full {lastAudit?.domain || "GEO"} report and interactive dashboard are ready. A receipt would normally go to
        your email.
      </p>

      <div className="mx-auto mt-6 w-full rounded-xl border border-line bg-surface p-5 text-left shadow-card">
        <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">Order confirmed</p>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-ink-2">{plan.name}</span>
          <span className="data-fig text-lg font-semibold text-pos">{money(plan.price)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link href="/dashboard" className="btn-primary">
          Open your dashboard <ArrowRight size={15} weight="bold" />
        </Link>
        <Link href="/audit/report" className="btn-ghost">
          Read the full report
        </Link>
      </div>
    </div>
  );
}
