import Link from "next/link";
import { Logo } from "./Logo";

// Visual direction from GEO-UI-Version-4 (single lightweight row + a thin legal
// bar). Destinations are the production's — every top-level marketing route plus
// sign-in. Deep in-page anchors remain reachable from the Nav mega-menus.

const links = [
  { label: "Run a free audit", to: "/audit" },
  { label: "Pricing", to: "/pricing" },
  { label: "What we check", to: "/product/geo-audit" },
  { label: "Solutions", to: "/solutions" },
  { label: "Resources", to: "/resources" },
  { label: "Enterprise", to: "/enterprise" },
  { label: "Sign in", to: "/login" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-subtle/40">
      <div className="site-container flex flex-col items-center gap-5 py-10 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-ink-2">
            See how visible your brand is in AI search — and get a dated plan to improve it.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-2" aria-label="Footer">
          {links.map((l) => (
            <Link key={l.label} href={l.to} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="site-container border-t border-line py-4 text-2xs text-ink-3">
        <div className="flex flex-col gap-1 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>GEO Tool — Generative Engine Optimization.</p>
          <p>© {new Date().getFullYear()} GEO Holdings. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
