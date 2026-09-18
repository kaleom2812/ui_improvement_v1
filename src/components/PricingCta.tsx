"use client";

// Shared pricing-card CTA for the homepage teaser and /pricing. Plans flagged
// comingSoon (currently "GEO Monitor" — there is no monitoring/subscription
// product behind /checkout yet) render as an inert button that reveals
// "Coming soon" on click, instead of linking to checkout and showing the
// unrelated one-time-report price there.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import type { pricing } from "@/data/site";

type Plan = (typeof pricing.plans)[number];

export function PricingCta({ plan, className, showArrow = false }: { plan: Plan; className: string; showArrow?: boolean }) {
  const [revealed, setRevealed] = useState(false);

  if (plan.comingSoon) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        aria-live="polite"
        className={`${className} cursor-default justify-center opacity-80`}
      >
        {revealed ? "Coming soon" : plan.cta}
      </button>
    );
  }

  return (
    <Link href={plan.ctaTo} className={className}>
      {plan.cta} {showArrow && plan.featured && <ArrowRight size={14} weight="bold" />}
    </Link>
  );
}
