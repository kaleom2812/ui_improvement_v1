import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MyReports } from "./MyReports";

const flow = vi.hoisted(() => ({
  account: null as { id: string; name: string; email: string; paidAuditIds: string[]; isAdmin: boolean } | null,
  authLoaded: true,
}));

vi.mock("@/state/audit-flow", () => ({ useAuditFlow: () => flow }));

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const account = (paidAuditIds: string[], isAdmin = false) => ({
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  paidAuditIds,
  isAdmin,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  flow.account = null;
  flow.authLoaded = true;
});

describe("MyReports", () => {
  it("renders nothing while auth is still loading", () => {
    flow.authLoaded = false;
    flow.account = null;
    const fetchMock = mockFetch({ audits: [] });

    const { container } = render(<MyReports />);

    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders nothing for a signed-out visitor and never calls the backend", () => {
    flow.authLoaded = true;
    flow.account = null;
    const fetchMock = mockFetch({ audits: [] });

    const { container } = render(<MyReports />);

    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a loading state before the fetch resolves", () => {
    flow.account = account(["paid-1"]);
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {}))); // never resolves

    render(<MyReports />);

    expect(screen.getByRole("status", { name: /loading your reports/i })).toBeInTheDocument();
  });

  it("shows only paid audits, excluding unpaid ones, using existing metadata", async () => {
    flow.account = account(["paid-1"]);
    mockFetch({
      audits: [
        {
          audit_id: "paid-1",
          domain: "paid-example.com",
          status: "complete",
          company_name: "Paid Co",
          category: "SaaS",
          geo_score: 82.4,
          technical_readiness: 70,
          created_at: "2026-01-15T00:00:00Z",
          completed_at: "2026-01-15T00:05:00Z",
        },
        {
          audit_id: "unpaid-2",
          domain: "unpaid-example.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 50,
          technical_readiness: 40,
          created_at: "2026-01-10T00:00:00Z",
          completed_at: "2026-01-10T00:05:00Z",
        },
      ],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByText("paid-example.com")).toBeInTheDocument());
    expect(screen.queryByText("unpaid-example.com")).not.toBeInTheDocument();
    expect(screen.getByText(/GEO rating GOOD · Score 70\/100/)).toBeInTheDocument();
  });

  it("keeps a report incomplete when persisted readiness is unavailable", async () => {
    flow.account = account(["paid-incomplete"]);
    mockFetch({
      audits: [{
        audit_id: "paid-incomplete",
        domain: "blocked.example",
        status: "incomplete",
        company_name: null,
        category: null,
        geo_score: 80,
        technical_readiness: null,
        created_at: "2026-01-15T00:00:00Z",
        completed_at: null,
      }],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByText("blocked.example")).toBeInTheDocument());
    expect(screen.getByText(/GEO rating LOW · Limited confidence/)).toBeInTheDocument();
    expect(screen.queryByText(/Score 0\/100/)).not.toBeInTheDocument();
    expect(screen.getByText("Limited data")).toBeInTheDocument();
    expect(screen.queryByText(/INCOMPLETE/)).not.toBeInTheDocument();
  });

  it("presents a readiness-backed report as ready even when the stored audit status is incomplete", async () => {
    flow.account = account(["paid-readiness"]);
    mockFetch({
      audits: [{
        audit_id: "paid-readiness",
        domain: "readiness.example",
        status: "incomplete",
        company_name: "Readiness Co",
        category: "SaaS",
        geo_score: null,
        technical_readiness: 53,
        created_at: "2026-01-15T00:00:00Z",
        completed_at: "2026-01-15T00:05:00Z",
      }],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByText("readiness.example")).toBeInTheDocument());
    expect(screen.getByText(/GEO rating GOOD · Score 53\/100/)).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText("incomplete")).not.toBeInTheDocument();
  });

  it("shows every returned audit for an admin account even with an empty paidAuditIds", async () => {
    // Admins get implicit entitlement via the backend's is_entitled() admin
    // bypass and never accumulate entitlement rows, so paidAuditIds is always
    // empty for them — GET /api/audits is already scoped server-side to the
    // admin's own user id, so every row it returns should still show up here.
    flow.account = account([], true);
    mockFetch({
      audits: [
        {
          audit_id: "admin-audit-1",
          domain: "admin-example.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 90,
          technical_readiness: 88,
          created_at: "2026-01-20T00:00:00Z",
          completed_at: "2026-01-20T00:05:00Z",
        },
        {
          audit_id: "admin-audit-2",
          domain: "admin-example-2.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 65,
          technical_readiness: null,
          created_at: "2026-01-05T00:00:00Z",
          completed_at: null,
        },
      ],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByText("admin-example.com")).toBeInTheDocument());
    expect(screen.getByText("admin-example-2.com")).toBeInTheDocument();
    expect(screen.queryByText(/no paid reports yet/i)).not.toBeInTheDocument();
  });

  it("shows every returned audit for an admin account with a mixed/incomplete paidAuditIds", async () => {
    // paidAuditIds only lists one of the two returned audits — an admin must
    // still see both, proving the admin bypass overrides the filter entirely
    // rather than merely adding to it.
    flow.account = account(["admin-audit-1"], true);
    mockFetch({
      audits: [
        {
          audit_id: "admin-audit-1",
          domain: "listed.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 70,
          technical_readiness: null,
          created_at: "2026-01-20T00:00:00Z",
          completed_at: null,
        },
        {
          audit_id: "admin-audit-2",
          domain: "not-in-paid-list.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 40,
          technical_readiness: null,
          created_at: "2026-01-05T00:00:00Z",
          completed_at: null,
        },
      ],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByText("listed.com")).toBeInTheDocument());
    expect(screen.getByText("not-in-paid-list.com")).toBeInTheDocument();
  });

  it("shows no reports and the empty state for a normal unpaid user, even with audits returned", async () => {
    flow.account = account([], false);
    mockFetch({
      audits: [
        {
          audit_id: "someone-elses-or-unpaid-audit",
          domain: "unpaid-example.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 55,
          technical_readiness: null,
          created_at: "2026-01-10T00:00:00Z",
          completed_at: null,
        },
      ],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByText(/no paid reports yet/i)).toBeInTheDocument());
    expect(screen.queryByText("unpaid-example.com")).not.toBeInTheDocument();
  });

  it("links View Report to /dashboard with the correct auditId and encoded domain", async () => {
    flow.account = account(["paid-1"]);
    mockFetch({
      audits: [
        {
          audit_id: "paid-1",
          domain: "example.com/weird path",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 60,
          technical_readiness: null,
          created_at: "2026-01-15T00:00:00Z",
          completed_at: null,
        },
      ],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByRole("link", { name: /view report/i })).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /view report/i });
    expect(link).toHaveAttribute(
      "href",
      `/dashboard?auditId=paid-1&domain=${encodeURIComponent("example.com/weird path")}`,
    );
  });

  it("shows an empty state when the user has no paid reports", async () => {
    flow.account = account([]);
    mockFetch({
      audits: [
        {
          audit_id: "unpaid-1",
          domain: "unpaid-example.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 55,
          technical_readiness: null,
          created_at: "2026-01-10T00:00:00Z",
          completed_at: null,
        },
      ],
    });

    render(<MyReports />);

    await waitFor(() => expect(screen.getByText(/no paid reports yet/i)).toBeInTheDocument());
  });

  it("shows an API error state when the proxy returns a non-OK response", async () => {
    flow.account = account(["paid-1"]);
    mockFetch({ error: "Not authenticated" }, 401);

    render(<MyReports />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/not authenticated/i));
  });

  it("shows an API error state on a network failure", async () => {
    flow.account = account(["paid-1"]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<MyReports />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network down/i));
  });

  it("hides its own heading/description when hideHeading is passed, keeping the list", async () => {
    flow.account = account(["paid-1"]);
    mockFetch({
      audits: [{
        audit_id: "paid-1",
        domain: "hidden-heading.example",
        status: "complete",
        company_name: null,
        category: null,
        geo_score: 60,
        technical_readiness: 60,
        created_at: "2026-01-15T00:00:00Z",
        completed_at: "2026-01-15T00:05:00Z",
      }],
    });

    render(<MyReports hideHeading />);

    await waitFor(() => expect(screen.getByText("hidden-heading.example")).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "My Reports" })).not.toBeInTheDocument();
    expect(screen.queryByText(/reports you've paid for/i)).not.toBeInTheDocument();
  });

  it("shows its default heading/description when hideHeading is not passed", () => {
    flow.account = account(["paid-1"]);
    mockFetch({ audits: [] });

    render(<MyReports />);

    expect(screen.getByRole("heading", { name: "My Reports" })).toBeInTheDocument();
  });

  it("never requests report_data for the list — fetches only /api/audits", async () => {
    flow.account = account(["paid-1"]);
    const fetchMock = mockFetch({ audits: [] });

    render(<MyReports />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/audits", expect.objectContaining({ cache: "no-store" }));
    expect(fetchMock.mock.calls.every(([url]) => typeof url === "string" && !url.includes("/api/audit/"))).toBe(true);
  });
});
