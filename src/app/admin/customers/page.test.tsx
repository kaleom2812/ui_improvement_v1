import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CustomersPage from "./page";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
const spRef = vi.hoisted(() => ({ value: new URLSearchParams("") }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/admin/customers",
  useSearchParams: () => spRef.value,
}));

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function usersResponse(over: Partial<Record<string, unknown>> = {}) {
  return {
    users: [
      {
        id: "u-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        is_admin: true,
        created_at: "2026-01-15T00:00:00+00:00",
        updated_at: "2026-01-16T00:00:00+00:00",
        audit_count: 3,
        payment_count: 1,
      },
      {
        id: "u-2",
        name: "Bob Brown",
        email: "bob@example.com",
        is_admin: false,
        created_at: "2026-02-20T00:00:00+00:00",
        updated_at: "2026-02-20T00:00:00+00:00",
        audit_count: 0,
        payment_count: 0,
      },
    ],
    page: 1,
    limit: 25,
    total: 2,
    total_pages: 1,
    has_next: false,
    has_prev: false,
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

describe("Admin Customers list", () => {
  it("fetches /api/admin/users", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(usersResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomersPage />);
    await screen.findByText("Ada Lovelace");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^\/api\/admin\/users\?/);
  });

  it("sends the default pagination / sort parameters", () => {
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomersPage />);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users?page=1&limit=25&sort=created_at&order=desc",
      expect.anything(),
    );
  });

  it("renders the customers returned by the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(usersResponse())));
    render(<CustomersPage />);
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
    // Ada is_admin: true -> "Admin" badge in her row; Bob has no badge.
    const adaRow = screen.getByText("ada@example.com").closest("tr");
    const bobRow = screen.getByText("bob@example.com").closest("tr");
    expect(adaRow).toHaveTextContent("Admin");
    expect(bobRow).not.toHaveTextContent("Admin");
    expect(screen.getByText("Jan 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // Ada audit_count
    expect(screen.getByText("2 customers")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View" })[0]).toHaveAttribute("href", "/admin/customers/u-1");
  });

  it("submits the search term (debounced) and resets to page 1", () => {
    vi.useFakeTimers();
    spRef.value = new URLSearchParams("page=3");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<CustomersPage />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "acme" } });
    expect(routerMock.replace).not.toHaveBeenCalled(); // debounced

    vi.advanceTimersByTime(400);
    expect(routerMock.replace).toHaveBeenCalledTimes(1);
    const url = String(routerMock.replace.mock.calls[0][0]);
    expect(url).toMatch(/search=acme/);
    expect(url).toMatch(/page=1/);
    expect(url).not.toMatch(/page=3/);
  });

  it("passes an existing ?search value through to the API request", () => {
    spRef.value = new URLSearchParams("search=lovelace");
    const fetchMock = vi.fn().mockReturnValue(deferred<Response>().promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomersPage />);
    expect(String(fetchMock.mock.calls[0][0])).toContain("search=lovelace");
  });

  it("sends the chosen sort field / direction and resets to page 1", () => {
    spRef.value = new URLSearchParams("page=2");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<CustomersPage />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "name" } });
    let url = String(routerMock.replace.mock.calls.at(-1)?.[0]);
    expect(url).toMatch(/sort=name/);
    expect(url).toMatch(/page=1/);

    fireEvent.click(screen.getByRole("button", { name: /sort direction/i }));
    url = String(routerMock.replace.mock.calls.at(-1)?.[0]);
    expect(url).toMatch(/order=asc/);
  });

  it("changes the page using the API's pagination metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(usersResponse({ page: 1, total_pages: 2, has_next: true }))),
    );
    render(<CustomersPage />);
    await screen.findByText("Ada Lovelace");

    fireEvent.click(screen.getByRole("button", { name: /^Next/i }));
    expect(String(routerMock.replace.mock.calls.at(-1)?.[0])).toMatch(/page=2/);
  });

  it("disables Previous / Next according to has_prev / has_next", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(usersResponse({ has_prev: false, has_next: false }))),
    );
    render(<CustomersPage />);
    await screen.findByText("Ada Lovelace");
    expect(screen.getByRole("button", { name: /Previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).toBeDisabled();
  });

  it("enables Previous / Next when the API says there are more pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(usersResponse({ page: 2, total_pages: 3, has_prev: true, has_next: true }))),
    );
    render(<CustomersPage />);
    await screen.findByText("Ada Lovelace");
    expect(screen.getByRole("button", { name: /Previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^Next/i })).not.toBeDisabled();
  });

  it("shows an empty state when no customers match", async () => {
    spRef.value = new URLSearchParams("search=zzz");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(usersResponse({ users: [], total: 0 }))));
    render(<CustomersPage />);
    expect(await screen.findByText(/No customers match your search/i)).toBeInTheDocument();
  });

  it("shows a non-blocking loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred<Response>().promise));
    render(<CustomersPage />);
    expect(screen.getByRole("status", { name: "Loading customers" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an inline error with a working retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("backend exploded"))
      .mockResolvedValueOnce(jsonResponse(usersResponse()));
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomersPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/backend exploded/i);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByText("Ada Lovelace");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders the expired-session state on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Not authenticated" }, 401)));
    render(<CustomersPage />);
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
  });

  it("renders the forbidden state on a 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Admin access required" }, 403)));
    render(<CustomersPage />);
    expect(await screen.findByText(/don.?t have access to the admin dashboard/i)).toBeInTheDocument();
  });

  it("never exposes a session token, backend URL, or D1 service token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(usersResponse())));
    const { container } = render(<CustomersPage />);
    await screen.findByText("Ada Lovelace");
    expect(container.innerHTML).not.toMatch(/geo_session|D1_SERVICE_TOKEN|Bearer\s|up\.railway\.app|\/v1\/admin/i);
  });
});
