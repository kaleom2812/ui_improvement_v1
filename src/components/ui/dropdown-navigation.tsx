"use client";

// Reusable animated dropdown navigation primitive.
//
// Interaction/visual reference: 21st.dev "Dropdown Navigation". Adapted from
// the demo (which used Vercel's nav + per-item icons) to this product's real
// nav shape (label/to/columns/links — see src/data/site.ts) and design tokens
// (ink/surface/line/brand instead of the demo's shadcn defaults). Uses
// `motion/react` — the renamed successor package to `framer-motion`, already
// a direct dependency here — rather than adding framer-motion a second time.

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowUpRight, ChevronDown } from "lucide-react";

export type DropdownNavLink = {
  label: string;
  to: string;
  desc?: string;
};

export type DropdownNavColumn = {
  title: string;
  links: readonly DropdownNavLink[];
};

export type DropdownNavItem = {
  label: string;
  to: string;
  columns?: readonly DropdownNavColumn[];
  external?: boolean;
};

type DropdownNavigationProps = {
  items: readonly DropdownNavItem[];
  /** Current pathname, used to bold/highlight the active top-level link. */
  activePath?: string | null;
  className?: string;
};

export function DropdownNavigation({ items, activePath, className }: DropdownNavigationProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const openWithoutDelay = (label: string) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  };

  return (
    <LayoutGroup id="dropdown-navigation">
      <ul className={`flex items-center ${className ?? ""}`}>
        {items.map((item) => {
          const hasColumns = !!item.columns?.length;
          const isOpen = openMenu === item.label;
          const isActive = activePath === item.to;

          return (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => hasColumns && openWithoutDelay(item.label)}
              onMouseLeave={() => hasColumns && scheduleClose()}
            >
              <Link
                href={item.to}
                className={`relative inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                  isActive ? "text-ink" : "text-ink-2 hover:text-ink"
                }`}
                aria-expanded={hasColumns ? isOpen : undefined}
                onMouseEnter={() => setHoveredLabel(item.label)}
                onMouseLeave={() => setHoveredLabel(null)}
                onFocus={() => hasColumns && openWithoutDelay(item.label)}
              >
                <span className="relative z-10">{item.label}</span>
                {hasColumns && (
                  <ChevronDown
                    className={`relative z-10 h-3.5 w-3.5 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
                {!hasColumns && item.external && (
                  <ArrowUpRight className="relative z-10 h-3 w-3" />
                )}
                {(hoveredLabel === item.label || isOpen) && (
                  <motion.span
                    layoutId="nav-hover-bg"
                    className="absolute inset-0 rounded-lg bg-subtle"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>

              <AnimatePresence>
                {isOpen && hasColumns && (
                  <div className="absolute left-0 top-full z-50 w-auto pt-2">
                    <motion.div
                      layoutId="nav-menu-panel"
                      className="w-max rounded-xl border border-line bg-surface p-4 shadow-pop"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      onMouseEnter={() => openWithoutDelay(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      <div className="flex w-max shrink-0 gap-9 overflow-hidden">
                        {item.columns!.map((col) => (
                          <motion.div layout className="w-56" key={col.title}>
                            <p className="mb-3 px-2 text-2xs font-bold uppercase tracking-[0.08em] text-ink-3">
                              {col.title}
                            </p>
                            <ul className="space-y-0.5">
                              {col.links.map((link) => (
                                <li key={link.label}>
                                  <Link
                                    href={link.to}
                                    onClick={() => setOpenMenu(null)}
                                    className="block rounded-lg px-2 py-2 hover:bg-subtle"
                                  >
                                    <span className="block text-sm font-semibold text-ink">{link.label}</span>
                                    {link.desc && (
                                      <span className="block text-2xs text-ink-3">{link.desc}</span>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}
