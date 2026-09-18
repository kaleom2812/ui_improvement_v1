import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CheckoutPage from "./page";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
const flow = vi.hoisted(() => ({
  account: { id: "u1", name: "Payer", email: "pay@example.com", paidAuditIds: [] as string[] },
  authLoaded: true,
  lastAudit: { id: "audit-1", domain: "example.com" },
  refreshAccount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/checkout",
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("next/script", () => ({
  default: function ScriptMock({ onLoad }: { onLoad?: () => void }) {
    React.useEffect(() => {
      onLoad?.();
    }, [onLoad]);
    return null;
  },
}));
vi.mock("@/state/audit-flow", () => ({ useAuditFlow: () => flow }));
vi.mock("@/components/Loading", () => ({ FullPageLoading: () => <div>loading</div> }));

const rzpOpen = vi.fn();
let rzpHandler: ((r: unknown) => void) | null = null;

beforeEach(() => {
  nav.replace.mockClear();
  flow.refreshAccount.mockClear();
  rzpOpen.mockClear();
  rzpHandler = null;
  // @ts-expect-error test shim for the Razorpay global (constructor)
  window.Razorpay = vi.fn(function (this: { open: () => void }, opts: { handler: (r: unknown) => void }) {
    rzpHandler = opts.handler;
    this.open = rzpOpen;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockFetch(map: Record<string, { ok: boolean; body: unknown }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const key = Object.keys(map).find((k) => String(url).includes(k));
      const entry = key ? map[key] : { ok: false, body: { error: "unmocked" } };
      return Promise.resolve({
        ok: entry.ok,
        status: entry.ok ? 200 : 400,
        json: () => Promise.resolve(entry.body),
      });
    })
  );
}

async function clickPay() {
  fireEvent.click(await screen.findByRole("button", { name: /Pay .* unlock report/i }));
}

describe("checkout — Razorpay", () => {
  it("create-order -> Razorpay opens -> verify -> unlock only after backend confirms", async () => {
    mockFetch({
      "/api/payment/create-order": {
        ok: true,
        body: { order_id: "order_1", amount: 100, currency: "INR", key_id: "rzp_test_x" },
      },
      "/api/payment/verify": { ok: true, body: { success: true, unlocked: true } },
    });

    render(<CheckoutPage />);
    await clickPay();

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/payment/create-order", expect.anything()));
    const orderCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) =>
      String(c[0]).includes("create-order")
    )!;
    expect(JSON.parse(orderCall[1].body)).toEqual({ auditId: "audit-1" }); // no amount from client

    await waitFor(() => expect(window.Razorpay).toHaveBeenCalled());
    const rzpOpts = (window.Razorpay as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(rzpOpts).toMatchObject({ key: "rzp_test_x", amount: 100, currency: "INR", order_id: "order_1" });
    expect(rzpOpen).toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled(); // not unlocked on client-side success

    rzpHandler!({ razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "sig_1" });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/payment/verify", expect.anything()));
    await waitFor(() => expect(flow.refreshAccount).toHaveBeenCalled());
    expect(nav.replace).toHaveBeenCalledWith("/checkout/success");
  });

  it("failed backend verification does NOT unlock", async () => {
    mockFetch({
      "/api/payment/create-order": {
        ok: true,
        body: { order_id: "order_2", amount: 100, currency: "INR", key_id: "rzp_test_x" },
      },
      "/api/payment/verify": { ok: false, body: { error: "Payment signature verification failed" } },
    });

    render(<CheckoutPage />);
    await clickPay();
    await waitFor(() => expect(window.Razorpay).toHaveBeenCalled());

    rzpHandler!({ razorpay_payment_id: "pay_2", razorpay_order_id: "order_2", razorpay_signature: "bad" });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/verification failed/i));
    expect(nav.replace).not.toHaveBeenCalled();
    expect(flow.refreshAccount).not.toHaveBeenCalled();
  });
});
