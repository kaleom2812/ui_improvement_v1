import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

/** Shared marketing chrome: skip link + sticky Nav + main + Footer. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-3 z-overlay rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
