"use client";

// Marketing navigation.
//
// Visual direction from GEO-UI-Version-4 (centered links, hover mega-menus,
// theme toggle, dominant primary CTA, right-hand slide-in mobile drawer).
// Routing (next/link + next/navigation), the nav data (src/data/site.ts), and
// the account-driven states (Sign in / Dashboard + avatar) are the production's
// and are unchanged.
//
// The signed-in avatar/dropdown itself is <AccountMenu /> (./AccountMenu.tsx)
// — the one shared implementation also used by GeoDashboard's header, so
// every surface with a profile icon gets the same menu items automatically.
// It's rendered twice here on purpose: once in the desktop actions row and
// once in the mobile top bar, so Tailwind's `lg:flex` / `lg:hidden` pick the
// right instance per viewport without duplicating any menu logic.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, X, ArrowUpRight, CaretRight, ShieldCheck } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { AccountMenu } from "./AccountMenu";
import { DropdownNavigation } from "./ui/dropdown-navigation";
import { nav } from "@/data/site";
import { useAuditFlow } from "@/state/audit-flow";

export function Nav() {
  const { account } = useAuditFlow();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="site-container flex h-16 items-center gap-4">
          <div className="shrink-0">
            <Logo />
          </div>

          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex" aria-label="Primary">
            <DropdownNavigation items={nav} activePath={pathname} />
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <ThemeToggle />
            {account ? (
              <>
                <Link href="/dashboard" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-2 hover:text-ink">
                  Dashboard
                </Link>
                <AccountMenu />
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-2 hover:text-ink">
                  Sign in
                </Link>
                <Link href="/audit" className="btn-primary h-10 px-4 text-sm">
                  Run free audit
                </Link>
              </>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
            <ThemeToggle />
            {account && <AccountMenu />}
            <button
              type="button"
              className="rounded-lg p-2 text-ink"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — rendered outside <header> so `position: fixed` resolves
          against the viewport, not the header's backdrop-filter containing block. */}
      <div className="lg:hidden" aria-hidden={!mobileOpen}>
        <div
          className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <nav
          id="mobile-nav-drawer"
          aria-label="Mobile"
          className={`fixed inset-y-0 right-0 z-50 flex w-[min(20rem,86vw)] flex-col overflow-y-auto border-l border-line bg-canvas shadow-pop transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
            <Logo />
            <button type="button" className="rounded-lg p-2 text-ink" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <X size={22} />
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-1 px-4 py-4">
            {nav.map((item) => (
              <div key={item.label} className="border-b border-line py-1">
                <Link
                  href={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between py-2.5 text-base font-bold text-ink"
                >
                  {item.label}
                  {"external" in item && item.external && <ArrowUpRight size={16} />}
                </Link>
                {"columns" in item &&
                  item.columns?.map((col) =>
                    col.links.map((l) => (
                      <Link
                        key={l.label}
                        href={l.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 py-2 pl-3 text-sm font-medium text-ink-2"
                      >
                        <CaretRight size={12} className="text-ink-3" />
                        {l.label}
                      </Link>
                    ))
                  )}
              </div>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              {account ? (
                <>
                  {account.isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="btn-secondary flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck size={16} /> Admin Dashboard
                    </Link>
                  )}
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="btn-secondary">
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-secondary">
                    Sign in
                  </Link>
                  <Link href="/audit" onClick={() => setMobileOpen(false)} className="btn-primary">
                    Run free audit
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
