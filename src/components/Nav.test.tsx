import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Nav } from "./Nav";

const state = vi.hoisted(() => ({
  signedIn: false,
  pathname: "/",
}));

const router = vi.hoisted(() => ({ push: vi.fn() }));

const flowState = vi.hoisted(() => ({
  account: null as { name?: string; email: string; isAdmin?: boolean } | null,
  unlocked: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => router,
}));

vi.mock("@/state/audit-flow", () => ({
  useAuditFlow: () => ({
    account: flowState.account,
    unlocked: flowState.unlocked,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light" as const, setTheme: vi.fn(), toggle: vi.fn() }),
}));

describe("marketing navigation", () => {
  beforeEach(() => {
    state.pathname = "/";
    flowState.account = null;
    flowState.unlocked = false;
    router.push.mockClear();
  });

  afterEach(cleanup);

  it("shows signed-out navigation", () => {
    render(<Nav />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );

    expect(
      screen.getByRole("link", { name: "Run free audit" }),
    ).toHaveAttribute("href", "/audit");
  });

  it("shows the dashboard action for a signed-in account", () => {
    flowState.account = {
      name: "Test User",
      email: "test@example.com",
    };

    render(<Nav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("renders navigation on dashboard routes", () => {
    state.pathname = "/dashboard";
    flowState.account = {
      name: "Test User",
      email: "test@example.com",
    };

    render(<Nav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  // ── Admin Dashboard entry point (landing/home page profile menu) ─────────

  function openAccountMenu() {
    fireEvent.click(screen.getAllByRole("button", { name: "Account menu" })[0]);
  }

  it("shows Admin Dashboard in the profile menu for an admin account", () => {
    flowState.account = { name: "Admin User", email: "admin@example.com", isAdmin: true };

    render(<Nav />);
    openAccountMenu();

    expect(screen.getByRole("button", { name: /Admin Dashboard/ })).toBeInTheDocument();
  });

  it("clicking Admin Dashboard navigates to /admin", () => {
    flowState.account = { name: "Admin User", email: "admin@example.com", isAdmin: true };

    render(<Nav />);
    openAccountMenu();
    fireEvent.click(screen.getByRole("button", { name: /Admin Dashboard/ }));

    expect(router.push).toHaveBeenCalledWith("/admin");
  });

  it("does not show Admin Dashboard for a non-admin account", () => {
    flowState.account = { name: "Regular User", email: "user@example.com", isAdmin: false };

    render(<Nav />);
    openAccountMenu();

    expect(screen.queryByRole("button", { name: /Admin Dashboard/ })).not.toBeInTheDocument();
    // The rest of the menu is still there.
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("shows no Admin Dashboard option for a signed-out visitor", () => {
    flowState.account = null;

    render(<Nav />);

    expect(screen.queryByRole("button", { name: /Admin Dashboard/ })).not.toBeInTheDocument();
    // No account menu button at all when signed out.
    expect(screen.queryByRole("button", { name: "Account menu" })).not.toBeInTheDocument();
  });

  // ── History entry point (profile menu) ────────────────────────────────────

  it("shows History in the profile menu for a signed-in account", () => {
    flowState.account = { name: "Test User", email: "test@example.com" };

    render(<Nav />);
    openAccountMenu();

    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
  });

  it("clicking History navigates to /history", () => {
    flowState.account = { name: "Test User", email: "test@example.com" };

    render(<Nav />);
    openAccountMenu();
    fireEvent.click(screen.getByRole("button", { name: /History/ }));

    expect(router.push).toHaveBeenCalledWith("/history");
  });

  it("shows no History option for a signed-out visitor (no account menu at all)", () => {
    flowState.account = null;

    render(<Nav />);

    expect(screen.queryByRole("button", { name: /History/ })).not.toBeInTheDocument();
  });

  it("existing profile menu options (dashboard/audit action, sign out) still work for an admin", () => {
    flowState.account = { name: "Admin User", email: "admin@example.com", isAdmin: true };
    flowState.unlocked = true;

    render(<Nav />);
    openAccountMenu();

    expect(screen.getByRole("button", { name: /Go to dashboard/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Go to dashboard/ }));
    expect(router.push).toHaveBeenCalledWith("/dashboard");
  });

  // ── Admin Dashboard entry point (mobile hamburger drawer) ─────────────────

  function openMobileMenu() {
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    return within(screen.getByRole("navigation", { name: "Mobile" }));
  }

  it("shows Admin Dashboard in the mobile drawer for an admin account", () => {
    flowState.account = { name: "Admin User", email: "admin@example.com", isAdmin: true };

    render(<Nav />);
    const drawer = openMobileMenu();

    const adminLink = drawer.getByRole("link", { name: /Admin Dashboard/ });
    expect(adminLink).toHaveAttribute("href", "/admin");
    // The existing Dashboard link is preserved alongside it.
    expect(drawer.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("does not show Admin Dashboard in the mobile drawer for a non-admin account", () => {
    flowState.account = { name: "Regular User", email: "user@example.com", isAdmin: false };

    render(<Nav />);
    const drawer = openMobileMenu();

    expect(drawer.queryByRole("link", { name: /Admin Dashboard/ })).not.toBeInTheDocument();
    expect(drawer.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("does not show Admin Dashboard in the mobile drawer for a signed-out visitor", () => {
    flowState.account = null;

    render(<Nav />);
    const drawer = openMobileMenu();

    expect(drawer.queryByRole("link", { name: /Admin Dashboard/ })).not.toBeInTheDocument();
  });

  // ── Mobile profile/account icon (top bar, alongside the hamburger) ────────
  //
  // The account menu previously rendered only in the desktop actions row
  // (`hidden ... lg:flex`), so a signed-in visitor had no way to reach it on
  // a mobile-width viewport — this is the fix.

  it("renders an account menu button in the mobile top bar for a signed-in account", () => {
    flowState.account = { name: "Test User", email: "test@example.com" };

    render(<Nav />);

    // One in the desktop actions row, one in the mobile top bar — both are
    // always in the DOM; Tailwind's responsive classes pick one per viewport.
    expect(screen.getAllByRole("button", { name: "Account menu" })).toHaveLength(2);
  });

  it("does not render a mobile account menu button for a signed-out visitor", () => {
    flowState.account = null;

    render(<Nav />);

    expect(screen.queryAllByRole("button", { name: "Account menu" })).toHaveLength(0);
  });

  it("the mobile account menu button opens the same menu, including History and Sign out", () => {
    flowState.account = { name: "Test User", email: "test@example.com" };

    render(<Nav />);
    const buttons = screen.getAllByRole("button", { name: "Account menu" });
    // index 1 is the mobile-top-bar instance (rendered after the desktop one).
    fireEvent.click(buttons[1]);

    expect(screen.getByRole("button", { name: /History/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("the mobile account menu button does not overlap the hamburger menu button", () => {
    flowState.account = { name: "Test User", email: "test@example.com" };

    render(<Nav />);

    // Distinct, independently reachable controls in the mobile top bar.
    expect(screen.getAllByRole("button", { name: "Account menu" })[1]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});