import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PaymentsPage from "./page";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
const spRef = vi.hoisted(() => ({ value: new URLSearchParams("") }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/admin/payments",
  useSearchParams: () => spRef.value,
}));

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function paymentsResponse(over: Partial<Record<string, unknown>> = {}) {
  return {
    payments: [
      {
        id: "pay-1",
        user_id: "u-1",
        user_name: "Ada Lovelace",
        user_email: "ada@example.com",
        audit_id: "aud-1",
        razorpay_order_id: "order_ABC123",
        razorpay_payment_id: "pay_XYZ789",
        amount: 500,
        currency: "INR",
        status: "paid",
        plan: "single_report",
        created_at: "2026-01-15T00:00:00+00:00",
        updated_at: "2026-01-15T00:00:00+00:00",
      },
      {
        id: "pay-2",
        user_id: "u-2",
        user_name: "Bob Brown",
        user_email: "bob@example.com",
        audit_id: "aud-2",
        razorpay_order_id: "order_DEF456",
        razorpay_payment_id: null,
        amount: 100,
        currency: "INR",
        status: "failed",
        plan: "single_report",
        created_at: "2026-02-20T00:00:00+00:00",
        updated_at: "2026-02-20T00:00:00+00:00",
      },
    ],
    page: 1,
    limit: 25,
    total: 2,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    amount_unit: "minor",
    summary: {
      total: 3,
      successful_payments: 1,
      failed_payments: 1,
      pending_payments: 1,
      total_revenue: 500,
    },
    ...over,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const lastReplaceUrl = () => String(routerMock.replace.mock.calls.at(-1)?.[0] ?? "");

beforeEach(() => {
  routerMock.replace.mockClear();
  spRef.value = new URLSearchParams("");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Admin Payments page", () => {
  it("requests /api/admin/payments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(paymentsResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<PaymentsPage />);
    await screen.findByText("Ada Lovelace");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^\/api\/admin\/payments\?/);
  });

  it("sends the default query parameters", () => {
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<PaymentsPage />);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/payments?page=1&limit=25&sort=created_at&order=desc",
      expect.anything(),
    );
  });

  it("renders the summary KPI values from the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(paymentsResponse())));
    render(<PaymentsPage />);
    const summary = await screen.findByRole("region", { name: "Payment summary" });
    expect(within(summary).getByText("Total Payments")).toBeInTheDocument();
    expect(within(summary).getByText("Total Revenue")).toBeInTheDocument();
    expect(within(summary).getByText("₹5.00")).toBeInTheDocument(); // total_revenue: 500
    // the four counts (total 3, successful/failed/pending 1)
    expect(within(summary).getByText("3")).toBeInTheDocument();
    expect(within(summary).getAllByText("1").length).toBe(3);
  });

  it("formats a larger revenue amount with grouping (123456 -> ₹1,234.56)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(paymentsResponse({ summary: { total: 1, successful_payments: 1, failed_payments: 0, pending_payments: 0, total_revenue: 123456 } })),
      ),
    );
    render(<PaymentsPage />);
    const summary = await screen.findByRole("region", { name: "Payment summary" });
    expect(within(summary).getByText("₹1,234.56")).toBeInTheDocument();
  });

  it("renders the payment rows returned by the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(paymentsResponse())));
    render(<PaymentsPage />);
    const table = await screen.findByRole("table");
    const scope = within(table);
    expect(scope.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(scope.getByText("ada@example.com")).toBeInTheDocument();
    expect(scope.getByText("₹5.00")).toBeInTheDocument();
    expect(scope.getByText("₹1.00")).toBeInTheDocument();
    expect(scope.getByText("Paid")).toBeInTheDocument();
    expect(scope.getByText("Failed")).toBeInTheDocument();
    expect(scope.getByText("order_ABC123")).toBeInTheDocument();
    expect(scope.getByText("pay_XYZ789")).toBeInTheDocument();
    expect(scope.getByText("—")).toBeInTheDocument(); // null razorpay_payment_id
    expect(scope.getByText("Jan 15, 2026")).toBeInTheDocument();
    expect(scope.getAllByText("single_report").length).toBe(2);
  });

  it("sends the chosen status and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=4");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<PaymentsPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "failed" } });
    expect(lastReplaceUrl()).toMatch(/status=failed/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
  });

  it("removes the status param when 'All statuses' is chosen", () => {
    spRef.value = new URLSearchParams("status=paid");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<PaymentsPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "" } });
    expect(lastReplaceUrl()).not.toMatch(/status=/);
  });

  it("submits the search term (debounced) and resets to page 1", () => {
    vi.useFakeTimers();
    spRef.value = new URLSearchParams("page=3");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<PaymentsPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "order_ABC" } });
    expect(routerMock.replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(lastReplaceUrl()).toMatch(/search=order_ABC/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
    expect(lastReplaceUrl()).not.toMatch(/page=3/);
  });

  it("sends start_date / end_date and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<PaymentsPage />);

    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-02-01" } });
    expect(lastReplaceUrl()).toMatch(/start_date=2026-02-01/);
    expect(lastReplaceUrl()).toMatch(/page=1/);

    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-02-28" } });
    expect(lastReplaceUrl()).toMatch(/end_date=2026-02-28/);
  });

  it("forwards start_date / end_date to the API request", () => {
    spRef.value = new URLSearchParams("start_date=2026-02-01&end_date=2026-02-28");
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<PaymentsPage />);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("start_date=2026-02-01");
    expect(url).toContain("end_date=2026-02-28");
  });

  it("sends the chosen sort field / direction and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<PaymentsPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value: "amount" } });
    expect(lastReplaceUrl()).toMatch(/sort=amount/);
    expect(lastReplaceUrl()).toMatch(/page=1/);

    fireEvent.click(screen.getByRole("button", { name: /sort direction/i }));
    expect(lastReplaceUrl()).toMatch(/order=asc/);
  });

  it("changes the page using the API pagination metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(paymentsResponse({ page: 1, total_pages: 2, has_next: true }))),
    );
    render(<PaymentsPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    expect(lastReplaceUrl()).toMatch(/page=2/);
  });

  it("preserves active filters when paginating", async () => {
    spRef.value = new URLSearchParams("status=paid&search=ada&start_date=2026-01-01&sort=amount&order=asc");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(paymentsResponse({ page: 1, total_pages: 3, has_next: true }))),
    );
    render(<PaymentsPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    const url = lastReplaceUrl();
    expect(url).toMatch(/status=paid/);
    expect(url).toMatch(/search=ada/);
    expect(url).toMatch(/start_date=2026-01-01/);
    expect(url).toMatch(/sort=amount/);
    expect(url).toMatch(/order=asc/);
    expect(url).toMatch(/page=2/);
  });

  it("disables Previous / Next according to has_prev / has_next", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(paymentsResponse({ has_prev: false, has_next: false }))),
    );
    render(<PaymentsPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).toBeDisabled();
  });

  it("enables Previous / Next when the API reports more pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(paymentsResponse({ page: 2, total_pages: 4, has_prev: true, has_next: true }))),
    );
    render(<PaymentsPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).not.toBeDisabled();
  });

  it("shows a no-payments empty state when nothing has been recorded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(paymentsResponse({ payments: [], total: 0, summary: { total: 0, successful_payments: 0, failed_payments: 0, pending_payments: 0, total_revenue: 0 } }))),
    );
    render(<PaymentsPage />);
    expect(await screen.findByText(/No payments recorded yet/i)).toBeInTheDocument();
  });

  it("shows a filtered empty state with a clear action when filters match nothing", async () => {
    spRef.value = new URLSearchParams("status=paid");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(paymentsResponse({ payments: [], total: 0 }))),
    );
    render(<PaymentsPage />);
    expect(await screen.findByText(/No payments match your filters/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    expect(lastReplaceUrl()).not.toMatch(/status=/);
  });

  it("shows a non-blocking loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<PaymentsPage />);
    expect(screen.getByRole("status", { name: "Loading payments" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an inline error with a working retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("backend on fire"))
      .mockResolvedValueOnce(jsonResponse(paymentsResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<PaymentsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/on fire/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByRole("table");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders the expired-session state on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401)));
    render(<PaymentsPage />);
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
  });

  it("renders the forbidden state on a 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Admin access required" }, 403)));
    render(<PaymentsPage />);
    expect(await screen.findByText(/don.?t have access to the admin dashboard/i)).toBeInTheDocument();
  });

  it("never exposes session tokens, service tokens, backend URLs, or Razorpay secrets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(paymentsResponse())));
    const { container } = render(<PaymentsPage />);
    await screen.findByRole("table");
    const html = container.innerHTML;
    expect(html).not.toMatch(/geo_session|D1_SERVICE_TOKEN|Bearer\s|up\.railway\.app|\/v1\/admin/i);
    expect(html).not.toMatch(/key_secret|webhook_secret|rzp_(test|live)_[a-z0-9]*secret/i);
  });
});
