import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardClient } from "./DashboardClient";

// DashboardClient's only own responsibility is resolving auditId/domain and
// gating the report — the report shell (GeoDashboard) and the unlock gate
// (RequireUnlock) are covered by their own test suites, so they're stubbed
// out here to isolate what actually changed: My Reports no longer renders on
// /dashboard.
vi.mock("./GeoDashboard", () => ({
  default: ({ auditId, initialDomain }: { auditId: string; initialDomain: string }) => (
    <div data-testid="geo-dashboard">
      dashboard for {auditId || "(none)"} / {initialDomain || "(none)"}
    </div>
  ),
}));
vi.mock("./RequireUnlock", () => ({
  RequireUnlock: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const flow = vi.hoisted(() => ({ lastAudit: null as { id: string; domain: string } | null }));
vi.mock("@/state/audit-flow", () => ({ useAuditFlow: () => flow }));

afterEach(() => {
  cleanup();
  flow.lastAudit = null;
});

describe("DashboardClient", () => {
  it("no longer renders My Reports on /dashboard", () => {
    render(<DashboardClient auditId="a1" domain="example.com" />);

    expect(screen.queryByRole("heading", { name: "My Reports" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("My Reports")).not.toBeInTheDocument();
  });

  it("still renders the gated report shell with the resolved audit id/domain", () => {
    render(<DashboardClient auditId="a1" domain="example.com" />);

    expect(screen.getByTestId("geo-dashboard")).toHaveTextContent("dashboard for a1 / example.com");
  });

  it("falls back to the persisted lastAudit when no query params are given", () => {
    flow.lastAudit = { id: "persisted-id", domain: "persisted.example" };

    render(<DashboardClient />);

    expect(screen.getByTestId("geo-dashboard")).toHaveTextContent("dashboard for persisted-id / persisted.example");
  });
});
