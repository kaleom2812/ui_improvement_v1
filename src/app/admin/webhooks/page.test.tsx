import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WebhooksPage from "./page";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
const spRef = vi.hoisted(() => ({ value: new URLSearchParams("") }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/admin/webhooks",
  useSearchParams: () => spRef.value,
}));

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

const LONG_DEDUPE_KEY =
  "order.paid:order_JkLxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz1234567890";

function webhooksResponse(over: Partial<Record<string, unknown>> = {}) {
  return {
    webhook_events: [
      { event_id: "pay_ABC123", received_at: "2026-01-15T00:00:00+00:00" },
      { event_id: LONG_DEDUPE_KEY, received_at: "2026-02-20T00:00:00+00:00" },
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
});

describe("Admin Webhooks page", () => {
  it("requests /api/admin/webhooks (and nothing else)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(webhooksResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<WebhooksPage />);
    await screen.findByRole("table");
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toMatch(/^\/api\/admin\/webhooks\?/);
    }
  });

  it("sends the default query parameters", () => {
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<WebhooksPage />);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/webhooks?page=1&limit=25&sort=received_at&order=desc",
      expect.anything(),
    );
  });

  it("renders the Total Webhook Events summary from the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(webhooksResponse())));
    render(<WebhooksPage />);
    const summary = await screen.findByRole("region", { name: "Webhook summary" });
    expect(within(summary).getByText("Total Webhook Events")).toBeInTheDocument();
    expect(within(summary).getByText("5")).toBeInTheDocument();
  });

  it("renders the Dedupe Key and Received columns for each row", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(webhooksResponse())));
    render(<WebhooksPage />);
    const table = await screen.findByRole("table");
    const scope = within(table);
    expect(scope.getByText("Dedupe Key")).toBeInTheDocument();
    expect(scope.getByText("Received")).toBeInTheDocument();
    expect(scope.getByText("pay_ABC123")).toBeInTheDocument();
    expect(scope.getByText("Jan 15, 2026")).toBeInTheDocument();
    expect(scope.getByText("Feb 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("2 webhook events")).toBeInTheDocument(); // pagination bar (outside the table)
    // never relabeled as a real Razorpay event id
    expect(scope.queryByText(/Razorpay Event ID/i)).not.toBeInTheDocument();
  });

  it("renders a long dedupe key in full, without truncation, with word-break styling", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(webhooksResponse())));
    render(<WebhooksPage />);
    const table = await screen.findByRole("table");
    const cell = within(table).getByText(LONG_DEDUPE_KEY);
    expect(cell).toBeInTheDocument();
    expect(cell.textContent).toBe(LONG_DEDUPE_KEY); // value is never parsed/modified
    expect(cell.className).toMatch(/break-all/);
  });

  it("sorts newest first by default and switches to oldest first", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<WebhooksPage />);
    const orderSelect = screen.getByRole("combobox", { name: "Order" }) as HTMLSelectElement;
    expect(orderSelect.value).toBe("desc");

    fireEvent.change(orderSelect, { target: { value: "asc" } });
    expect(lastReplaceUrl()).toMatch(/order=asc/);
    expect(lastReplaceUrl()).toMatch(/page=1/);
  });

  it("resets to page 1 when the sort direction changes", () => {
    spRef.value = new URLSearchParams("page=3");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<WebhooksPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Order" }), { target: { value: "asc" } });
    expect(lastReplaceUrl()).toMatch(/page=1/);
    expect(lastReplaceUrl()).not.toMatch(/page=3/);
  });

  it("normalizes an invalid sort value from the URL to received_at", () => {
    spRef.value = new URLSearchParams("sort=evil; DROP TABLE webhook_events--");
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<WebhooksPage />);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("sort=received_at");
    expect(url).not.toContain("evil");
    expect(url).not.toContain("DROP");
  });

  it("normalizes an invalid order value from the URL to desc", () => {
    spRef.value = new URLSearchParams("order=sideways");
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<WebhooksPage />);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("order=desc");
    const orderSelect = screen.getByRole("combobox", { name: "Order" }) as HTMLSelectElement;
    expect(orderSelect.value).toBe("desc");
  });

  it("changes the page using the API pagination metadata (Next)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(webhooksResponse({ page: 1, total_pages: 2, has_next: true }))),
    );
    render(<WebhooksPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    expect(lastReplaceUrl()).toMatch(/page=2/);
  });

  it("changes the page using the API pagination metadata (Previous)", async () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(webhooksResponse({ page: 2, total_pages: 2, has_prev: true }))),
    );
    render(<WebhooksPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
    expect(lastReplaceUrl()).toMatch(/page=1/);
  });

  it("preserves the sort order when paginating", async () => {
    spRef.value = new URLSearchParams("order=asc");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(webhooksResponse({ page: 1, total_pages: 2, has_next: true }))),
    );
    render(<WebhooksPage />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    const url = lastReplaceUrl();
    expect(url).toMatch(/order=asc/);
    expect(url).toMatch(/page=2/);
  });

  it("disables Previous / Next according to has_prev / has_next", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(webhooksResponse({ has_prev: false, has_next: false }))),
    );
    render(<WebhooksPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).toBeDisabled();
  });

  it("enables Previous / Next when the API reports more pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(webhooksResponse({ page: 2, total_pages: 4, has_prev: true, has_next: true })),
      ),
    );
    render(<WebhooksPage />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /Previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).not.toBeDisabled();
  });

  it("shows a no-webhook-events empty state when nothing has been received", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(webhooksResponse({ webhook_events: [], total: 0, summary: { total: 0 } }))),
    );
    render(<WebhooksPage />);
    expect(await screen.findByText(/No webhook events yet/i)).toBeInTheDocument();
  });

  it("shows a non-blocking loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<WebhooksPage />);
    expect(screen.getByRole("status", { name: "Loading webhook events" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an inline error with a working retry that re-fetches /api/admin/webhooks", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("backend kaput"))
      .mockResolvedValueOnce(jsonResponse(webhooksResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<WebhooksPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/kaput/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByRole("table");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/^\/api\/admin\/webhooks\?/);
  });

  it("renders the expired-session state on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401)));
    render(<WebhooksPage />);
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login?redirect=/admin");
  });

  it("renders the forbidden state on a 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Admin access required" }, 403)));
    render(<WebhooksPage />);
    expect(await screen.findByText(/don.?t have access to the admin dashboard/i)).toBeInTheDocument();
  });

  it("never renders secrets, tokens, or fields the webhook_events table does not store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          webhooksResponse({
            // fields the admin API must never send and the UI must never render,
            // even if they somehow appeared in a response:
            webhook_events: [
              {
                event_id: "pay_ABC123",
                received_at: "2026-01-15T00:00:00+00:00",
                event_type: "payment.captured",
                status: "processed",
                payload: "SECRET-RAW-PAYLOAD",
              },
            ],
          }),
        ),
      ),
    );
    const { container } = render(<WebhooksPage />);
    await screen.findByRole("table");
    const html = container.innerHTML;
    expect(html).not.toContain("SECRET-RAW-PAYLOAD");
    expect(html).not.toContain("payment.captured");
    expect(html).not.toContain("processed");
    expect(html).not.toContain("password_hash");
    expect(html).not.toContain("pbkdf2_sha256");
    expect(html).not.toMatch(/geo_session|D1_SERVICE_TOKEN|Bearer\s|up\.railway\.app|\/v1\/admin/i);
  });
});
