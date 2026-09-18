import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AuditsPage from "./page";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
const spRef = vi.hoisted(() => ({ value: new URLSearchParams("") }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/admin/audits",
  useSearchParams: () => spRef.value,
}));

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function auditsResponse(over: Partial<Record<string, unknown>> = {}) {
  return {
    audits: [
      {
        id: "audit-1",
        user_id: "u-1",
        user_name: "Ada Lovelace",
        user_email: "ada@example.com",
        domain: "acme.com",
        status: "complete",
        company_name: "Acme Corp",
        category: "CRM software",
        geo_score: 72.5,
        technical_readiness: 80,
        created_at: "2026-01-15T00:00:00+00:00",
        completed_at: "2026-01-18T00:00:00+00:00",
        updated_at: "2026-01-18T00:00:00+00:00",
        // fields the admin API omits and the UI must never render:
        report_data: "SECRET-REPORT-BODY",
        error_message: "SECRET-ERROR-DETAIL",
      },
      {
        id: "audit-2",
        user_id: "u-2",
        user_name: "Bob Brown",
        user_email: "bob@example.com",
        domain: "beta.io",
        status: "failed",
        company_name: null,
        category: null,
        geo_score: null,
        technical_readiness: null,
        created_at: "2026-02-20T00:00:00+00:00",
        completed_at: null,
        updated_at: "2026-02-20T00:00:00+00:00",
      },
    ],
    page: 1,
    limit: 25,
    total: 2,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    summary: { total: 4, completed: 1, processing: 1, incomplete: 1, failed: 1 },
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

describe("Admin Audits page", () => {
  it("requests /api/admin/audits", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(auditsResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditsPage />);
    await screen.findByText("acme.com");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^\/api\/admin\/audits\?/);
  });

  it("sends the default query parameters", () => {
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditsPage />);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/audits?page=1&limit=25&sort=created_at&order=desc",
      expect.anything(),
    );
  });

  it("renders the summary KPI values from the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(auditsResponse())));
    render(<AuditsPage />);
    const summary = await screen.findByRole("region", { name: "Audit summary" });
    expect(within(summary).getByText("Total Audits")).toBeInTheDocument();
    expect(within(summary).getByText("4")).toBeInTheDocument();
    for (const label of ["Completed", "Processing", "Incomplete", "Failed"]) {
      expect(within(summary).getByText(label)).toBeInTheDocument();
    }
    expect(within(summary).getAllByText("1").length).toBe(4);
  });

  it("renders audit rows with customer, domain, company, and category", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(auditsResponse())));
    render(<AuditsPage />);
    const table = await screen.findByRole("table");
    const scope = within(table);
    expect(scope.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(scope.getByText("ada@example.com")).toBeInTheDocument();
    expect(scope.getByText("Bob Brown")).toBeInTheDocument();
    expect(scope.getByText("acme.com")).toBeInTheDocument();
    expect(scope.getByText("beta.io")).toBeInTheDocument();
    expect(scope.getByText("Acme Corp")).toBeInTheDocument();
    expect(scope.getByText("CRM software")).toBeInTheDocument();
    // audit-2 has null company + null category -> "—" (plus null completed_at, null scores)
    expect(scope.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("renders status badges with friendly labels", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(auditsResponse())));
    render(<AuditsPage />);
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Complete")).toBeInTheDocument();
    expect(within(table).getByText("Failed")).toBeInTheDocument();
  });

  it("formats GEO score and technical readiness (1 dp, — when null)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(auditsResponse())));
    render(<AuditsPage />);
    const table = await screen.findByRole("table");
    expect(within(table).getByText("72.5")).toBeInTheDocument();
    expect(within(table).getByText("80.0")).toBeInTheDocument();
  });

  it("renders created and completed dates, with — when completed is null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(auditsResponse())));
    render(<AuditsPage />);
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Jan 15, 2026")).toBeInTheDocument();
    expect(within(table).getByText("Jan 18, 2026")).toBeInTheDocument();
    expect(within(table).getByText("Feb 20, 2026")).toBeInTheDocument();
  });

  it("sends the chosen status and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=4");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<AuditsPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "failed" } });
    expect(lastReplaceUrl()).toMatch(/status=failed/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
  });

  it("removes the status param when 'All statuses' is chosen", () => {
    spRef.value = new URLSearchParams("status=complete");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<AuditsPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "" } });
    expect(lastReplaceUrl()).not.toMatch(/status=/);
  });

  it("submits the search term (debounced) and resets to page 1", () => {
    vi.useFakeTimers();
    spRef.value = new URLSearchParams("page=3");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<AuditsPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "acme" } });
    expect(routerMock.replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(lastReplaceUrl()).toMatch(/search=acme/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
    expect(lastReplaceUrl()).not.toMatch(/page=3/);
  });

  it("sends start_date / end_date and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<AuditsPage />);
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-01-01" } });
    expect(lastReplaceUrl()).toMatch(/start_date=2026-01-01/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-03-01" } });
    expect(lastReplaceUrl()).toMatch(/end_date=2026-03-01/);
  });

  it("forwards start_date / end_date to the API request", () => {
    spRef.value = new URLSearchParams("start_date=2026-01-01&end_date=2026-03-01");
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditsPage />);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("start_date=2026-01-01");
    expect(url).toContain("end_date=2026-03-01");
  });

  it("sends the chosen sort field / direction and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<AuditsPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value: "geo_score" } });
    expect(lastReplaceUrl()).toMatch(/sort=geo_score/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
    fireEvent.click(screen.getByRole("button", { name: /sort direction/i }));
    expect(lastReplaceUrl()).toMatch(/order=asc/);
  });

  it("changes the page using the API pagination metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(auditsResponse({ page: 1, total_pages: 2, has_next: true }))),
    );
    render(<AuditsPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    expect(lastReplaceUrl()).toMatch(/page=2/);
  });

  it("preserves active filters when paginating", async () => {
    spRef.value = new URLSearchParams("status=complete&search=acme&start_date=2026-01-01&sort=domain&order=asc");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(auditsResponse({ page: 1, total_pages: 3, has_next: true }))),
    );
    render(<AuditsPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    const url = lastReplaceUrl();
    expect(url).toMatch(/status=complete/);
    expect(url).toMatch(/search=acme/);
    expect(url).toMatch(/start_date=2026-01-01/);
    expect(url).toMatch(/sort=domain/);
    expect(url).toMatch(/order=asc/);
    expect(url).toMatch(/page=2/);
  });

  it("disables Previous / Next according to has_prev / has_next", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(auditsResponse({ has_prev: false, has_next: false }))),
    );
    render(<AuditsPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).toBeDisabled();
  });

  it("enables Previous / Next when the API reports more pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(auditsResponse({ page: 2, total_pages: 4, has_prev: true, has_next: true }))),
    );
    render(<AuditsPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).not.toBeDisabled();
  });

  it("shows a no-audits empty state when nothing has run", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(auditsResponse({ audits: [], total: 0, summary: { total: 0, completed: 0, processing: 0, incomplete: 0, failed: 0 } })),
      ),
    );
    render(<AuditsPage />);
    expect(await screen.findByText(/No audits yet/i)).toBeInTheDocument();
  });

  it("shows a filtered empty state with a clear action", async () => {
    spRef.value = new URLSearchParams("status=complete");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(auditsResponse({ audits: [], total: 0 }))));
    render(<AuditsPage />);
    expect(await screen.findByText(/No audits match your filters/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    expect(lastReplaceUrl()).not.toMatch(/status=/);
  });

  it("shows a non-blocking loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<AuditsPage />);
    expect(screen.getByRole("status", { name: "Loading audits" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an inline error with a working retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("backend meltdown"))
      .mockResolvedValueOnce(jsonResponse(auditsResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/meltdown/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByRole("table");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders the expired-session state on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401)));
    render(<AuditsPage />);
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
  });

  it("renders the forbidden state on a 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Admin access required" }, 403)));
    render(<AuditsPage />);
    expect(await screen.findByText(/don.?t have access to the admin dashboard/i)).toBeInTheDocument();
  });

  it("never renders report_data, error_message, or session / service tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(auditsResponse())));
    const { container } = render(<AuditsPage />);
    await screen.findByRole("table");
    const html = container.innerHTML;
    expect(html).not.toContain("report_data");
    expect(html).not.toContain("SECRET-REPORT-BODY");
    expect(html).not.toContain("error_message");
    expect(html).not.toContain("SECRET-ERROR-DETAIL");
    expect(html).not.toMatch(/geo_session|D1_SERVICE_TOKEN|Bearer\s|up\.railway\.app|\/v1\/admin/i);
  });
});
