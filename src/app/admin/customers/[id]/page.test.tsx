import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CustomerDetailPage from "./page";

const paramsRef = vi.hoisted(() => ({ value: { id: "u-1" } as Record<string, string> }));

vi.mock("next/navigation", () => ({
  useParams: () => paramsRef.value,
}));

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function detailResponse() {
  return {
    user: {
      id: "u-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      is_admin: true,
      created_at: "2026-01-15T00:00:00+00:00",
      updated_at: "2026-03-02T00:00:00+00:00",
      // fields the UI must ignore even if present
      password_hash: "pbkdf2_sha256$SECRET",
    },
    audits: [
      {
        id: "aud-1",
        domain: "acme.com",
        status: "complete",
        company_name: "Acme Corp",
        category: "CRM software",
        geo_score: 72.5,
        technical_readiness: 80,
        created_at: "2026-01-20T00:00:00+00:00",
        completed_at: "2026-01-25T00:00:00+00:00",
        updated_at: "2026-01-25T00:00:00+00:00",
        report_data: "SHOULD-NOT-APPEAR",
      },
    ],
    payments: [
      {
        id: "pay-a",
        audit_id: "aud-1",
        razorpay_order_id: "order_ABC123",
        razorpay_payment_id: "pay_XYZ789",
        amount: 100,
        currency: "INR",
        status: "paid",
        plan: "single_report",
        created_at: "2026-02-10T00:00:00+00:00",
        updated_at: "2026-02-10T00:00:00+00:00",
      },
      {
        id: "pay-b",
        audit_id: "aud-1",
        razorpay_order_id: "order_DEF456",
        razorpay_payment_id: null,
        amount: 500,
        currency: "INR",
        status: "created",
        plan: "single_report",
        created_at: "2026-02-14T00:00:00+00:00",
        updated_at: "2026-02-14T00:00:00+00:00",
      },
    ],
    entitlements: [
      { audit_id: "aud-1", payment_id: "pay_XYZ789", paid_at: "2026-02-12T00:00:00+00:00" },
    ],
  };
}

beforeEach(() => {
  paramsRef.value = { id: "u-1" };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Admin Customer detail", () => {
  it("fetches /api/admin/users/[id]", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(detailResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomerDetailPage />);
    await screen.findAllByText("Ada Lovelace");
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/users/u-1", expect.anything());
  });

  it("renders the customer information", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(detailResponse())));
    render(<CustomerDetailPage />);
    await screen.findByText("Customer information");
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ada@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.getByText("Jan 15, 2026")).toBeInTheDocument(); // joined
    expect(screen.getByText("Mar 2, 2026")).toBeInTheDocument(); // last updated
  });

  it("renders the customer's audits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(detailResponse())));
    render(<CustomerDetailPage />);
    await screen.findByRole("heading", { name: "Audits (1)" });
    expect(screen.getByText("acme.com")).toBeInTheDocument();
    expect(screen.getByText("complete")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("CRM software")).toBeInTheDocument();
    expect(screen.getByText("72.5")).toBeInTheDocument();
    expect(screen.getByText("80.0")).toBeInTheDocument();
    expect(screen.getByText("Jan 20, 2026")).toBeInTheDocument(); // created
    expect(screen.getByText("Jan 25, 2026")).toBeInTheDocument(); // completed
  });

  it("renders the customer's payments with INR minor-unit formatting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(detailResponse())));
    render(<CustomerDetailPage />);
    await screen.findByText("₹1.00"); // amount 100
    expect(screen.getByText("₹5.00")).toBeInTheDocument(); // amount 500
    expect(screen.getByText("order_ABC123")).toBeInTheDocument();
    expect(screen.getByText("order_DEF456")).toBeInTheDocument();
    expect(screen.getAllByText("pay_XYZ789").length).toBeGreaterThan(0); // shown in payment + entitlement
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("created")).toBeInTheDocument();
    expect(screen.getAllByText("single_report").length).toBe(2);
    expect(screen.getAllByText("INR").length).toBeGreaterThan(0);
  });

  it("renders the customer's entitlements", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(detailResponse())));
    render(<CustomerDetailPage />);
    await screen.findByRole("heading", { name: "Entitlements (1)" });
    // audit id + payment id shown in the entitlements table
    expect(screen.getAllByText("aud-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pay_XYZ789").length).toBeGreaterThan(0);
  });

  it("shows a clear not-found state on a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "User not found" }, 404)));
    render(<CustomerDetailPage />);
    expect(await screen.findByText("Customer not found")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: /Back to Customers/i })) {
      expect(link).toHaveAttribute("href", "/admin/customers");
    }
  });

  it("shows the expired-session state on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401)));
    render(<CustomerDetailPage />);
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
  });

  it("shows the forbidden state on a 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Admin access required" }, 403)));
    render(<CustomerDetailPage />);
    expect(await screen.findByText(/don.?t have access to the admin dashboard/i)).toBeInTheDocument();
  });

  it("shows a retryable error for other failures", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("kaboom"))
      .mockResolvedValueOnce(jsonResponse(detailResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomerDetailPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent(/kaboom/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByText("acme.com");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never renders report_data or account secrets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(detailResponse())));
    const { container } = render(<CustomerDetailPage />);
    await screen.findByText("acme.com");
    const html = container.innerHTML;
    expect(html).not.toContain("report_data");
    expect(html).not.toContain("SHOULD-NOT-APPEAR");
    expect(html).not.toContain("password_hash");
    expect(html).not.toContain("pbkdf2_sha256");
    expect(html).not.toMatch(/geo_session|D1_SERVICE_TOKEN|Bearer\s|up\.railway\.app|\/v1\/admin/i);
  });
});
