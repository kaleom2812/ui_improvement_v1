import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GeoDashboard from "./GeoDashboard";

// Regression test for the dashboard's tab navigation forcing a page-level
// scroll-to-top on every click (Focus / Score / Visibility / …). The tab
// switch itself is a same-page state change (router.replace with
// { scroll: false }) and must not move the viewport.

const routerReplace = vi.hoisted(() => vi.fn());
const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light" as const, setTheme: vi.fn(), toggle: vi.fn() }),
}));

const flowState = vi.hoisted(() => ({
  account: null as { name?: string; email: string; isAdmin?: boolean } | null,
  unlocked: false,
}));

vi.mock("@/lib/auth", () => ({
  useUser: () => ({ isSignedIn: !!flowState.account }),
}));

vi.mock("@/state/audit-flow", () => ({
  useAuditFlow: () => ({
    setLastAudit: vi.fn(),
    account: flowState.account,
    unlocked: flowState.unlocked,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/use-audit-report", () => ({
  useAuditReport: () => ({ status: "idle", report: null, error: null }),
}));

vi.mock("@/lib/adapter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/adapter")>("@/lib/adapter");
  return {
    ...actual,
    buildViewModel: () => ({
      brand: "Acme",
      domain: "acme.com",
      headline: "",
      score: { has: true, overall: 72, tier: "Solid" },
      dimensions: [],
      headlineMetrics: [],
      actions: { list: [{ id: 1, title: "Fix titles", type: "Quick win", dimension: "Content", impact: 4, effort: 2 }] },
    }),
  };
});

vi.mock("./dashboard/Focus", () => ({ default: () => <div>Focus panel</div> }));
vi.mock("./dashboard/Score", () => ({ default: () => <div>Score panel</div> }));
vi.mock("./dashboard/Visibility", () => ({ default: () => <div>Visibility panel</div> }));
vi.mock("./dashboard/Answers", () => ({ default: () => <div>Answers panel</div> }));
vi.mock("./dashboard/Competitors", () => ({ default: () => <div>Competitors panel</div> }));
vi.mock("./dashboard/Citations", () => ({ default: () => <div>Citations panel</div> }));
vi.mock("./dashboard/Content", () => ({ default: () => <div>Content panel</div> }));
vi.mock("./dashboard/Technical", () => ({ default: () => <div>Technical panel</div> }));
vi.mock("./dashboard/Plan", () => ({ default: () => <div>Plan panel</div> }));

describe("GeoDashboard tab navigation", () => {
  beforeEach(() => {
    routerReplace.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not force the window to scroll when switching sections", () => {
    const scrollToSpy = vi.fn();
    vi.stubGlobal("scrollTo", scrollToSpy);

    render(<GeoDashboard auditId="audit-1" initialData={{} as never} />);

    fireEvent.click(screen.getByRole("tab", { name: /score/i }));
    expect(screen.getByText("Score panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /visibility/i }));
    expect(screen.getByText("Visibility panel")).toBeInTheDocument();

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith(expect.stringContaining("tab=visibility"), { scroll: false });

    vi.unstubAllGlobals();
  });
});

// Regression test for the account menu centralization: GeoDashboard's header
// used to render its own separate UserButton (src/lib/auth.tsx), which never
// had History or the other Nav menu items. It now renders the same shared
// <AccountMenu /> (src/components/AccountMenu.tsx) that the marketing Nav
// uses, so every surface with a profile icon stays in sync automatically.
describe("GeoDashboard account menu", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    flowState.account = null;
    flowState.unlocked = false;
  });

  it("renders the shared account menu, including History, for a signed-in user", () => {
    flowState.account = { name: "Ada", email: "ada@example.com" };

    render(<GeoDashboard auditId="audit-1" initialData={{} as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));

    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
  });

  it("clicking History from the dashboard header navigates to /history", () => {
    flowState.account = { name: "Ada", email: "ada@example.com" };

    render(<GeoDashboard auditId="audit-1" initialData={{} as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    fireEvent.click(screen.getByRole("button", { name: /History/ }));

    expect(routerPush).toHaveBeenCalledWith("/history");
  });

  it("preserves the Admin Dashboard option for an admin on the dashboard header menu", () => {
    flowState.account = { name: "Admin", email: "admin@example.com", isAdmin: true };

    render(<GeoDashboard auditId="audit-1" initialData={{} as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));

    expect(screen.getByRole("button", { name: /Admin Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
  });

  it("does not render an account menu for a signed-out visitor", () => {
    flowState.account = null;

    render(<GeoDashboard auditId="audit-1" initialData={{} as never} />);

    expect(screen.queryByRole("button", { name: "Account menu" })).not.toBeInTheDocument();
  });
});
