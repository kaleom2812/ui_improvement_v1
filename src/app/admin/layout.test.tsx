import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminLayout from "./layout";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
const routing = vi.hoisted(() => ({ pathname: "/admin" }));
const flow = vi.hoisted(() => ({
  account: null as { id: string; email: string } | null,
  authLoaded: true,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => routing.pathname,
}));
vi.mock("@/state/audit-flow", () => ({ useAuditFlow: () => flow }));
vi.mock("@/components/Loading", () => ({
  FullPageLoading: ({ label }: { label?: string }) => <div role="status">{label}</div>,
}));

beforeEach(() => {
  nav.replace.mockClear();
  routing.pathname = "/admin";
  flow.account = { id: "u1", email: "admin@phazeai.com" };
  flow.authLoaded = true;
});
afterEach(cleanup);

function firstNav() {
  return within(screen.getAllByRole("navigation", { name: "Admin sections" })[0]);
}

describe("Admin layout shell", () => {
  it("identifies the admin area and lists every section", () => {
    render(<AdminLayout>page</AdminLayout>);

    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
    const menu = firstNav();
    for (const label of ["Overview", "Customers", "Payments", "Audits", "Entitlements", "Webhooks"]) {
      expect(menu.getByText(label)).toBeInTheDocument();
    }
  });

  it("links every section, including Webhooks (the final functional admin section)", () => {
    render(<AdminLayout>page</AdminLayout>);
    const menu = firstNav();

    expect(menu.getByRole("link", { name: /Overview/ })).toHaveAttribute("href", "/admin");
    expect(menu.getByRole("link", { name: /Customers/ })).toHaveAttribute("href", "/admin/customers");
    expect(menu.getByRole("link", { name: /Payments/ })).toHaveAttribute("href", "/admin/payments");
    expect(menu.getByRole("link", { name: /Audits/ })).toHaveAttribute("href", "/admin/audits");
    expect(menu.getByRole("link", { name: /Entitlements/ })).toHaveAttribute("href", "/admin/entitlements");
    expect(menu.getByRole("link", { name: /Webhooks/ })).toHaveAttribute("href", "/admin/webhooks");

    expect(menu.queryAllByText("Soon").length).toBe(0);
  });

  it("marks the current section with aria-current", () => {
    render(<AdminLayout>page</AdminLayout>);
    expect(firstNav().getByRole("link", { name: /Overview/ })).toHaveAttribute("aria-current", "page");
  });

  it("keeps a section highlighted on its sub-routes (e.g. customer detail)", () => {
    routing.pathname = "/admin/customers/abc123";
    render(<AdminLayout>page</AdminLayout>);
    expect(firstNav().getByRole("link", { name: /Customers/ })).toHaveAttribute("aria-current", "page");
    expect(firstNav().getByRole("link", { name: /Overview/ })).not.toHaveAttribute("aria-current");
  });

  it("offers a way back to the normal app", () => {
    render(<AdminLayout>page</AdminLayout>);
    expect(screen.getAllByRole("link", { name: /Back to dashboard/i })[0]).toHaveAttribute("href", "/dashboard");
  });

  it("renders the admin content once a session is present", () => {
    render(<AdminLayout><p>overview content</p></AdminLayout>);
    expect(screen.getByText("overview content")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("shows a loading state until the session check resolves", () => {
    flow.authLoaded = false;
    render(<AdminLayout><p>overview content</p></AdminLayout>);
    expect(screen.getByRole("status")).toHaveTextContent(/loading admin/i);
    expect(screen.queryByText("overview content")).not.toBeInTheDocument();
  });

  it("redirects a signed-out visitor to sign in and back (session presence only)", async () => {
    flow.account = null;
    flow.authLoaded = true;
    render(<AdminLayout><p>overview content</p></AdminLayout>);

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login?redirect=/admin"));
    expect(screen.queryByText("overview content")).not.toBeInTheDocument();
  });
});
