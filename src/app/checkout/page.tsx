"use client";

// Checkout — Razorpay (TEST mode).
//
//   Pay -> POST /api/payment/create-order (backend creates the Razorpay order
//   and decides the amount) -> Razorpay Standard Checkout opens -> on success
//   POST /api/payment/verify (backend verifies signature + payment status and
//   grants the EXISTING per-audit entitlement) -> /checkout/success.
//
// The browser never sees key_secret and never sets the amount. The UI does not
// unlock on Razorpay's client-side "success" — only after backend verification.
// The displayed product price ($149) is unchanged; the test charge is decided
// entirely by the backend.

import { Suspense, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LockKey, ShieldCheck, Check, ArrowRight, Info } from "@phosphor-icons/react";
import { pricing } from "@/data/site";
import { money } from "@/lib/format";
import { useAuditFlow } from "@/state/audit-flow";
import { FullPageLoading } from "@/components/Loading";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (r: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<FullPageLoading label="Loading checkout…" />}>
      <Checkout />
    </Suspense>
  );
}

function Checkout() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { lastAudit, account, authLoaded, refreshAccount } = useAuditFlow();

  const planId = params.get("plan") || "report";
  const plan = pricing.plans.find((p) => p.id === planId) || pricing.plans[1];

  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [payError, setPayError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  // Checkout requires a signed-in account (the entitlement is recorded against
  // it server-side) — send unauthenticated visitors to sign in, then back here.
  useEffect(() => {
    if (!authLoaded || account) return;
    const query = params.toString();
    const current = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?redirect=${encodeURIComponent(current)}`);
  }, [authLoaded, account, pathname, params, router]);

  const auditId = lastAudit?.id || "";

  async function verifyAndFinish(r: RazorpaySuccess) {
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          razorpay_payment_id: r.razorpay_payment_id,
          razorpay_order_id: r.razorpay_order_id,
          razorpay_signature: r.razorpay_signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPayError(data.error || "We could not confirm your payment. If you were charged, contact support.");
        setStatus("idle");
        return;
      }
      await refreshAccount();
      router.replace("/checkout/success");
    } catch {
      setPayError("We could not confirm your payment. Please try again.");
      setStatus("idle");
    }
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "idle") return;
    if (!auditId) {
      setPayError("No audit selected to unlock. Run an audit first.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      setPayError("The payment window could not load. Check your connection and try again.");
      return;
    }
    setPayError("");
    setStatus("processing");

    let order: { order_id?: string; amount?: number; currency?: string; key_id?: string; already_unlocked?: boolean; error?: string };
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      });
      order = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(order.error || "Could not start the payment. Please try again.");
        setStatus("idle");
        return;
      }
    } catch {
      setPayError("Could not reach the payment service. Please try again.");
      setStatus("idle");
      return;
    }

    if (order.already_unlocked) {
      await refreshAccount();
      router.replace("/checkout/success");
      return;
    }
    if (!order.order_id || !order.key_id || !order.amount || !order.currency) {
      setPayError("The payment could not be initialised. Please try again.");
      setStatus("idle");
      return;
    }

    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "GEO Tool",
      description: `Full GEO report — ${lastAudit?.domain || "your domain"}`,
      prefill: { name: account?.name, email: account?.email },
      theme: { color: "#4F46E5" },
      handler: (r) => {
        void verifyAndFinish(r);
      },
      modal: {
        ondismiss: () => {
          setStatus("idle");
          setPayError("Payment window closed before completion.");
        },
      },
    });
    rzp.open();
  }

  if (!authLoaded || !account) {
    return <FullPageLoading label={authLoaded ? "Redirecting to sign in…" : "Checking your account…"} />;
  }

  return (
    <div className="site-container flex min-h-[calc(100vh-3.5rem)] max-w-flow flex-col justify-center py-12">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setPayError("The payment window could not load.")}
      />

      <div className="text-center">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Unlock the {lastAudit?.domain || "GEO"} report
        </h1>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-baseline justify-between border-b border-line pb-4">
          <div>
            <p className="text-sm font-bold text-ink">{plan.name}</p>
            <p className="text-2xs text-ink-3">{lastAudit?.domain || "your domain"}</p>
          </div>
          <p className="data-fig text-2xl font-bold text-ink">{money(plan.price)}</p>
        </div>

        <form onSubmit={pay} className="mt-5">
          <div className="flex items-start gap-2 rounded-lg border border-line bg-subtle px-4 py-3 text-2xs text-ink-2">
            <ShieldCheck size={15} weight="bold" className="mt-0.5 shrink-0 text-brand-dark" />
            Payment is processed securely by Razorpay. This is a test environment — a nominal verification charge applies
            and the amount is set by our server.
          </div>

          {payError && (
            <p role="alert" className="mt-4 flex items-start gap-1.5 rounded-lg border border-neg/30 bg-neg-soft px-3 py-2 text-sm text-neg">
              <Info size={16} weight="bold" className="mt-0.5 shrink-0" /> {payError}
            </p>
          )}

          <button type="submit" disabled={status !== "idle"} className="btn-primary mt-5 w-full">
            {status === "idle" ? (
              <>
                Pay {money(plan.price)} &amp; unlock report <ArrowRight size={15} weight="bold" />
              </>
            ) : (
              <>
                <span className="animate-spin360">
                  <LockKey size={15} weight="bold" />
                </span>
                Processing…
              </>
            )}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-2xs text-ink-3">
            <LockKey size={12} weight="bold" /> Card details are entered in Razorpay&apos;s secure window, never here.
          </p>
        </form>

        <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
          {plan.features.slice(1, 5).map((f) => (
            <li key={f} className="flex items-start gap-2 text-ink-2">
              <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-pos" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 text-center text-2xs text-ink-3">
        <Link href="/pricing" className="link">
          Compare plans
        </Link>
      </div>
    </div>
  );
}
