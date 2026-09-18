import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RequireUnlock } from "./RequireUnlock";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
const flow = vi.hoisted(() => ({
  unlocked: false, // the context's lastAudit-derived value — deliberately kept stale in most tests
  account: null as { isAdmin: boolean; paidAuditIds: string[] } | null,
  hydrated: true,
  authLoaded: true,
}));

vi.mock("next/navigation", () => ({ useRouter: () => nav }));
vi.mock("@/state/audit-flow", () => ({ useAuditFlow: () => flow }));

function account(overrides: Partial<{ isAdmin: boolean; paidAuditIds: string[] }> = {}) {
  return { isAdmin: false, paidAuditIds: [], ...overrides };
}

afterEach(() => {
  cleanup();
  nav.replace.mockClear();
  flow.unlocked = false;
  flow.account = null;
  flow.hydrated = true;
  flow.authLoaded = true;
});

describe("RequireUnlock", () => {
  it("unlocks when the requested auditId is in account.paidAuditIds", () => {
    flow.account = account({ paidAuditIds: ["paid-1"] });
    flow.unlocked = false; // stale context value must be ignored when auditId is given

    render(
      <RequireUnlock auditId="paid-1">
        <p>report content</p>
      </RequireUnlock>,
    );

    expect(screen.getByText("report content")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("locks and redirects when the requested auditId is not in account.paidAuditIds", () => {
    flow.account = account({ paidAuditIds: ["some-other-audit"] });

    render(
      <RequireUnlock auditId="unpaid-audit">
        <p>report content</p>
      </RequireUnlock>,
    );

    expect(screen.queryByText("report content")).not.toBeInTheDocument();
    expect(nav.replace).toHaveBeenCalledWith("/audit/report");
  });

  it("unlocks an admin for any requested auditId, regardless of paidAuditIds", () => {
    flow.account = account({ isAdmin: true, paidAuditIds: [] });

    render(
      <RequireUnlock auditId="not-in-paid-list">
        <p>report content</p>
      </RequireUnlock>,
    );

    expect(screen.getByText("report content")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("falls back to the existing lastAudit-based unlocked value when no auditId is supplied (unlocked)", () => {
    flow.unlocked = true;
    flow.account = account();

    render(
      <RequireUnlock>
        <p>report content</p>
      </RequireUnlock>,
    );

    expect(screen.getByText("report content")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("falls back to the existing lastAudit-based unlocked value when no auditId is supplied (locked)", () => {
    flow.unlocked = false;
    flow.account = account();

    render(
      <RequireUnlock>
        <p>report content</p>
      </RequireUnlock>,
    );

    expect(screen.queryByText("report content")).not.toBeInTheDocument();
    expect(nav.replace).toHaveBeenCalledWith("/audit/report");
  });

  it("prefers the requested auditId over a stale lastAudit-derived unlocked value (requested id wins)", () => {
    // Context says locked (as if lastAudit still points at a different/no audit),
    // but the requested audit itself is paid.
    flow.unlocked = false;
    flow.account = account({ paidAuditIds: ["paid-report-42"] });

    render(
      <RequireUnlock auditId="paid-report-42">
        <p>report content</p>
      </RequireUnlock>,
    );

    expect(screen.getByText("report content")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when opening a previously paid report despite stale lastAudit state", () => {
    // Simulates clicking "View Report" in My Reports for an older paid audit
    // while the AuditFlow context's lastAudit/unlocked still reflect a
    // different (unrelated) audit from localStorage.
    flow.unlocked = false;
    flow.account = account({ paidAuditIds: ["older-paid-audit"] });

    render(
      <RequireUnlock auditId="older-paid-audit">
        <p>report content</p>
      </RequireUnlock>,
    );

    expect(nav.replace).not.toHaveBeenCalled();
    expect(screen.getByText("report content")).toBeInTheDocument();
  });
});
