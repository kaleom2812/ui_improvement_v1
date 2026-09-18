import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HistoryClient } from "./HistoryClient";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
const flow = vi.hoisted(() => ({
  account: null as { id: string; name: string; email: string; paidAuditIds: string[]; isAdmin: boolean } | null,
  authLoaded: true,
}));

vi.mock("next/navigation", () => ({ useRouter: () => nav }));
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
  nav.replace.mockClear();
  flow.account = null;
  flow.authLoaded = true;
});

describe("HistoryClient", () => {
  it("shows a loading state while auth is still resolving", () => {
    flow.authLoaded = false;
    flow.account = null;

    render(<HistoryClient />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("redirects a signed-out visitor to /login with a redirect back to /history", () => {
    flow.authLoaded = true;
    flow.account = null;

    render(<HistoryClient />);

    expect(nav.replace).toHaveBeenCalledWith("/login?redirect=/history");
    expect(screen.queryByText("Your previous reports")).not.toBeInTheDocument();
  });

  it("renders the History heading and the report list for a signed-in account", async () => {
    flow.account = account(["paid-1"]);
    mockFetch({
      audits: [
        {
          audit_id: "paid-1",
          domain: "phazeai.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 53,
          technical_readiness: 53,
          created_at: "2026-09-15T00:00:00Z",
          completed_at: "2026-09-15T00:05:00Z",
        },
      ],
    });

    render(<HistoryClient />);

    expect(screen.getByRole("heading", { level: 1, name: "Your previous reports" })).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("phazeai.com")).toBeInTheDocument());
    expect(screen.getByText(/GEO rating GOOD · Score 53\/100/)).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("does not render MyReports' own duplicate heading (hideHeading is applied)", async () => {
    flow.account = account(["paid-1"]);
    mockFetch({ audits: [] });

    render(<HistoryClient />);

    await waitFor(() => expect(screen.getByText(/no paid reports yet/i)).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "My Reports" })).not.toBeInTheDocument();
  });

  it("clicking a report links to the existing /dashboard?auditId=&domain= flow", async () => {
    flow.account = account(["paid-1"]);
    mockFetch({
      audits: [
        {
          audit_id: "paid-1",
          domain: "phazeai.com",
          status: "complete",
          company_name: null,
          category: null,
          geo_score: 53,
          technical_readiness: 53,
          created_at: "2026-09-15T00:00:00Z",
          completed_at: "2026-09-15T00:05:00Z",
        },
      ],
    });

    render(<HistoryClient />);

    await waitFor(() => expect(screen.getByRole("link", { name: /view report/i })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /view report/i })).toHaveAttribute(
      "href",
      "/dashboard?auditId=paid-1&domain=phazeai.com",
    );
  });

  it("shows every returned audit for an admin account, preserving the existing admin bypass", async () => {
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
      ],
    });

    render(<HistoryClient />);

    await waitFor(() => expect(screen.getByText("admin-example.com")).toBeInTheDocument());
  });
});
