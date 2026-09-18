import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminOverviewPage from "./page";

const SUMMARY = {
  total_users: 42,
  new_users_30d: 7,
  total_audits: 120,
  completed_audits: 90,
  failed_audits: 12,
  paid_users: 25,
  free_users: 17,
  paid_payments: 30,
  payment_amount: 500,
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Admin Overview page", () => {
  it("requests /api/admin/summary and renders the KPI values from the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SUMMARY));
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminOverviewPage />);

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/summary", expect.anything());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const kpis = await screen.findByRole("region", { name: "Key metrics" });
    expect(within(kpis).getByText("Total Customers")).toBeInTheDocument();
    expect(within(kpis).getByText("42")).toBeInTheDocument(); // total_users
    expect(within(kpis).getByText("7")).toBeInTheDocument(); // new_users_30d
    expect(within(kpis).getByText("Last 30 days")).toBeInTheDocument();
    expect(within(kpis).getByText("90")).toBeInTheDocument(); // completed_audits
    expect(within(kpis).getByText("25")).toBeInTheDocument(); // paid_users
    expect(within(kpis).getByText("17")).toBeInTheDocument(); // free_users
    expect(within(kpis).getByText("30")).toBeInTheDocument(); // paid_payments
  });

  it("converts the minor-unit payment_amount to a rupee string (500 -> ₹5.00)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ...SUMMARY, payment_amount: 500 })));
    render(<AdminOverviewPage />);
    const kpis = await screen.findByRole("region", { name: "Key metrics" });
    expect(within(kpis).getByText("₹5.00")).toBeInTheDocument();
  });

  it("formats larger revenue amounts with grouping (123456 paise -> ₹1,234.56)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ...SUMMARY, payment_amount: 123456 })));
    render(<AdminOverviewPage />);
    const kpis = await screen.findByRole("region", { name: "Key metrics" });
    expect(within(kpis).getByText("₹1,234.56")).toBeInTheDocument();
  });

  it("shows a non-blocking loading skeleton while the request is in flight", async () => {
    const d = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(d.promise));

    render(<AdminOverviewPage />);

    expect(screen.getByRole("status", { name: "Loading overview" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Key metrics" })).not.toBeInTheDocument();

    d.resolve(jsonResponse(SUMMARY));
    await screen.findByRole("region", { name: "Key metrics" });
    expect(screen.queryByRole("status", { name: "Loading overview" })).not.toBeInTheDocument();
  });

  it("shows an inline error with a working retry action", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse(SUMMARY));
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminOverviewPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn.?t load the admin dashboard/i);
    expect(alert).not.toHaveTextContent(/network down/i); // no internal error text

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await screen.findByRole("region", { name: "Key metrics" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders an inline forbidden state on a 403 (no auth logic duplicated)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Admin access required" }, 403)));
    render(<AdminOverviewPage />);
    expect(await screen.findByText(/don.?t have access to the admin dashboard/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Key metrics" })).not.toBeInTheDocument();
  });

  it("renders an inline expired-session state on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401)));
    render(<AdminOverviewPage />);
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login?redirect=/admin");
  });

  it("never renders a session token, backend URL, or D1 service token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(SUMMARY)));
    const { container } = render(<AdminOverviewPage />);
    await screen.findByRole("region", { name: "Key metrics" });
    expect(container.innerHTML).not.toMatch(/geo_session|D1_SERVICE_TOKEN|Bearer\s|up\.railway\.app|\/v1\/admin/i);
  });
});
