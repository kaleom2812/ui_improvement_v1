import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EntitlementsPage from "./page";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
const spRef = vi.hoisted(() => ({ value: new URLSearchParams("") }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/admin/entitlements",
  useSearchParams: () => spRef.value,
}));

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function entitlementsResponse(over: Partial<Record<string, unknown>> = {}) {
  return {
    entitlements: [
      {
        user_id: "u-1",
        user_name: "Ada Lovelace",
        user_email: "ada@example.com",
        audit_id: "aud-1",
        domain: "acme.com",
        audit_status: "complete",
        payment_id: "pay_XYZ789",
        paid_at: "2026-01-15T00:00:00+00:00",
        // fields the admin API omits and the UI must never render:
        report_data: "SECRET-REPORT-BODY",
        error_message: "SECRET-ERROR-DETAIL",
        password_hash: "pbkdf2_sha256$SECRET",
      },
      {
        user_id: "u-2",
        user_name: null,
        user_email: null,
        audit_id: "aud-2",
        domain: null,
        audit_status: null,
        payment_id: null,
        paid_at: "2026-02-20T00:00:00+00:00",
      },
    ],
    page: 1,
    limit: 25,
    total: 2,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    summary: { total: 5 },
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

describe("Admin Entitlements page", () => {
  it("requests /api/admin/entitlements (and nothing else)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<EntitlementsPage />);
    await screen.findByRole("table");
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toMatch(/^\/api\/admin\/entitlements\?/);
    }
  });

  it("sends the default query parameters", () => {
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<EntitlementsPage />);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/entitlements?page=1&limit=25&sort=paid_at&order=desc",
      expect.anything(),
    );
  });

  it("renders the Total Entitlements summary from the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse())));
    render(<EntitlementsPage />);
    const summary = await screen.findByRole("region", { name: "Entitlement summary" });
    expect(within(summary).getByText("Total Entitlements")).toBeInTheDocument();
    expect(within(summary).getByText("5")).toBeInTheDocument();
  });

  it("renders entitlement rows with customer, audit id, domain, status, payment id, and paid date", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse())));
    render(<EntitlementsPage />);
    const table = await screen.findByRole("table");
    const scope = within(table);
    expect(scope.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(scope.getByText("ada@example.com")).toBeInTheDocument();
    expect(scope.getByText("aud-1")).toBeInTheDocument();
    expect(scope.getByText("aud-2")).toBeInTheDocument();
    expect(scope.getByText("acme.com")).toBeInTheDocument();
    expect(scope.getByText("Complete")).toBeInTheDocument(); // friendly status badge
    expect(scope.getByText("pay_XYZ789")).toBeInTheDocument();
    expect(scope.getByText("Jan 15, 2026")).toBeInTheDocument();
    expect(scope.getByText("Feb 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("2 entitlements")).toBeInTheDocument(); // pagination bar (outside the table)
    // second row: null user_name/domain/audit_status/payment_id -> "—"
    expect(scope.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("submits the search term (debounced) and resets to page 1", () => {
    vi.useFakeTimers();
    spRef.value = new URLSearchParams("page=3");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<EntitlementsPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "acme" } });
    expect(routerMock.replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(lastReplaceUrl()).toMatch(/search=acme/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
    expect(lastReplaceUrl()).not.toMatch(/page=3/);
  });

  it("sends the User ID filter (debounced) and resets to page 1", () => {
    vi.useFakeTimers();
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<EntitlementsPage />);
    fireEvent.change(screen.getByRole("textbox", { name: "User ID" }), { target: { value: "u-42" } });
    vi.advanceTimersByTime(400);
    expect(lastReplaceUrl()).toMatch(/user_id=u-42/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
  });

  it("sends the Audit ID filter (debounced) and resets to page 1", () => {
    vi.useFakeTimers();
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<EntitlementsPage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Audit ID" }), { target: { value: "aud-99" } });
    vi.advanceTimersByTime(400);
    expect(lastReplaceUrl()).toMatch(/audit_id=aud-99/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
  });

  it("forwards user_id / audit_id from the URL to the API request", () => {
    spRef.value = new URLSearchParams("user_id=u-1&audit_id=aud-1");
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<EntitlementsPage />);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("user_id=u-1");
    expect(url).toContain("audit_id=aud-1");
  });

  it("sends start_date / end_date and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<EntitlementsPage />);
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-01-01" } });
    expect(lastReplaceUrl()).toMatch(/start_date=2026-01-01/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-03-01" } });
    expect(lastReplaceUrl()).toMatch(/end_date=2026-03-01/);
  });

  it("sends the chosen sort field / direction and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<EntitlementsPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value: "user_email" } });
    expect(lastReplaceUrl()).toMatch(/sort=user_email/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
    fireEvent.click(screen.getByRole("button", { name: /sort direction/i }));
    expect(lastReplaceUrl()).toMatch(/order=asc/);
  });

  it("changes the page using the API pagination metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse({ page: 1, total_pages: 2, has_next: true }))),
    );
    render(<EntitlementsPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    expect(lastReplaceUrl()).toMatch(/page=2/);
  });

  it("preserves active filters when paginating", async () => {
    spRef.value = new URLSearchParams(
      "search=acme&user_id=u-1&audit_id=aud-1&start_date=2026-01-01&sort=domain&order=asc",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse({ page: 1, total_pages: 3, has_next: true }))),
    );
    render(<EntitlementsPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    const url = lastReplaceUrl();
    expect(url).toMatch(/search=acme/);
    expect(url).toMatch(/user_id=u-1/);
    expect(url).toMatch(/audit_id=aud-1/);
    expect(url).toMatch(/start_date=2026-01-01/);
    expect(url).toMatch(/sort=domain/);
    expect(url).toMatch(/order=asc/);
    expect(url).toMatch(/page=2/);
  });

  it("disables Previous / Next according to has_prev / has_next", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse({ has_prev: false, has_next: false }))),
    );
    render(<EntitlementsPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).toBeDisabled();
  });

  it("enables Previous / Next when the API reports more pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse({ page: 2, total_pages: 4, has_prev: true, has_next: true }))),
    );
    render(<EntitlementsPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).not.toBeDisabled();
  });

  it("shows a no-entitlements empty state when nothing has been granted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse({ entitlements: [], total: 0, summary: { total: 0 } }))),
    );
    render(<EntitlementsPage />);
    expect(await screen.findByText(/No entitlements yet/i)).toBeInTheDocument();
  });

  it("shows a filtered empty state and Clear all filters removes search / ids / dates", async () => {
    spRef.value = new URLSearchParams("search=zzz&user_id=u-9&start_date=2026-01-01");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse({ entitlements: [], total: 0 }))));
    render(<EntitlementsPage />);
    expect(await screen.findByText(/No entitlements match your filters/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    const url = lastReplaceUrl();
    expect(url).not.toMatch(/search=/);
    expect(url).not.toMatch(/user_id=/);
    expect(url).not.toMatch(/start_date=/);
    expect(url).toMatch(/page=1/);
  });

  it("shows a non-blocking loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<EntitlementsPage />);
    expect(screen.getByRole("status", { name: "Loading entitlements" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an inline error with a working retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("backend kaput"))
      .mockResolvedValueOnce(jsonResponse(entitlementsResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<EntitlementsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/kaput/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByRole("table");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders the expired-session state on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401)));
    render(<EntitlementsPage />);
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
  });

  it("renders the forbidden state on a 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Admin access required" }, 403)));
    render(<EntitlementsPage />);
    expect(await screen.findByText(/don.?t have access to the admin dashboard/i)).toBeInTheDocument();
  });

  it("never renders report_data, error_message, password_hash, or session / service tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(entitlementsResponse())));
    const { container } = render(<EntitlementsPage />);
    await screen.findByRole("table");
    const html = container.innerHTML;
    expect(html).not.toContain("report_data");
    expect(html).not.toContain("SECRET-REPORT-BODY");
    expect(html).not.toContain("error_message");
    expect(html).not.toContain("SECRET-ERROR-DETAIL");
    expect(html).not.toContain("password_hash");
    expect(html).not.toContain("pbkdf2_sha256");
    expect(html).not.toMatch(/geo_session|D1_SERVICE_TOKEN|Bearer\s|up\.railway\.app|\/v1\/admin/i);
  });
});
