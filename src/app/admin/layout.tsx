"use client";

// Admin area shell.
//
// A dedicated sidebar layout for the internal Admin Dashboard, kept visually in
// the product's design language (same tokens, primitives, and Phosphor icons as
// the rest of the app) but deliberately separate from the marketing <Nav> and
// the report <GeoDashboard> chrome.
//
// AUTHORIZATION: this layout does NOT decide who is an admin. It only sends
// signed-out visitors to sign in (the same convention as /checkout). Every
// admin data call goes through /api/admin/* -> FastAPI `_require_admin`, which
// is the sole authority; a non-admin session gets a 403 that the page renders
// inline. `account.isAdmin` is never read here.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gauge,
  Users,
  CreditCard,
  FileMagnifyingGlass,
  Key,
  PlugsConnected,
  List,
  X,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import { FullPageLoading } from "@/components/Loading";
import { useAuditFlow } from "@/state/audit-flow";

type NavItem = {
  label: string;
  href?: string;
  icon: typeof Gauge;
};

// Overview, Customers, Payments, Audits, Entitlements, and Webhooks are all
// live — Webhooks is the final functional admin section.
const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: Gauge },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Audits", href: "/admin/audits", icon: FileMagnifyingGlass },
  { label: "Entitlements", href: "/admin/entitlements", icon: Key },
  { label: "Webhooks", href: "/admin/webhooks", icon: PlugsConnected },
];

function isSectionActive(href: string, pathname: string): boolean {
  // "/admin" (Overview) matches only itself; section roots also match their
  // sub-routes, e.g. "/admin/customers" matches "/admin/customers/abc123".
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = href != null && isSectionActive(href, pathname);
        const base =
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors";
        if (href) {
          return (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`${base} ${
                active ? "bg-brand-soft text-brand-dark" : "text-ink-2 hover:bg-subtle hover:text-ink"
              }`}
            >
              <Icon size={17} weight={active ? "fill" : "regular"} />
              {label}
            </Link>
          );
        }
        return (
          <span
            key={label}
            aria-disabled="true"
            className={`${base} cursor-default text-ink-3`}
          >
            <Icon size={17} />
            <span className="flex-1">{label}</span>
            <span className="rounded-full bg-subtle px-1.5 py-0.5 text-2xs font-bold uppercase tracking-[0.06em] text-ink-3">
              Soon
            </span>
          </span>
        );
      })}
    </nav>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-brand">Admin</p>
        <Logo href="/admin" wordmark className="mt-1" />
      </div>
    </div>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t border-line p-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-subtle hover:text-ink"
      >
        <ArrowLeft size={16} weight="bold" />
        Back to dashboard
      </Link>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { account, authLoaded } = useAuditFlow();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Send signed-out visitors to sign in and come back. This is session
  // presence only — not an admin check (FastAPI owns that).
  useEffect(() => {
    if (authLoaded && !account) {
      router.replace("/login?redirect=/admin");
    }
  }, [authLoaded, account, router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!authLoaded) return <FullPageLoading label="Loading admin…" />;
  if (!account) return <FullPageLoading label="Redirecting to sign in…" />;

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <SidebarHeader />
        <SidebarNav pathname={pathname} />
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-brand">Admin</p>
          <Logo href="/admin" wordmark={false} />
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"}
          aria-expanded={mobileOpen}
          className="rounded-lg p-2 text-ink"
        >
          {mobileOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div className="lg:hidden" aria-hidden={!mobileOpen}>
        <div
          className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(17rem,84vw)] flex-col border-r border-line bg-surface shadow-pop transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarHeader />
          <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          <SidebarFooter onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
