"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { Reveal, SectionHeading } from "@/components/primitives";
import { VisibilityAreaChart } from "@/components/marketing/charts/VisibilityAreaChart";
import { MentionsBarChart } from "@/components/marketing/charts/MentionsBarChart";
import { ScoreTrendLineChart } from "@/components/marketing/charts/ScoreTrendLineChart";
import { EngineShareChart } from "@/components/marketing/charts/EngineShareChart";
import { GeoDimensionsRadarChart } from "@/components/marketing/charts/GeoDimensionsRadarChart";
import { OverallScoreRadialChart } from "@/components/marketing/charts/OverallScoreRadialChart";

/** Wraps a chart card with a subtle hover-lift; disabled under prefers-reduced-motion. */
function Lift({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="h-full"
      whileHover={reduced ? undefined : { y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

export function AnalyticsSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="site-container">
        <SectionHeading
          eyebrow="Live analytics"
          title="The metrics behind your GEO score, updated daily"
          lede="Every chart below runs on the same data your dashboard sees — mentions, citations and score movement across every AI engine we track."
          align="center"
          className="mx-auto"
        />

        <Reveal className="mt-10">
          <Lift>
            <VisibilityAreaChart />
          </Lift>
        </Reveal>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Reveal delay={0.05}>
            <Lift>
              <MentionsBarChart />
            </Lift>
          </Reveal>
          <Reveal delay={0.1}>
            <Lift>
              <ScoreTrendLineChart />
            </Lift>
          </Reveal>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Reveal delay={0.05}>
            <Lift>
              <EngineShareChart />
            </Lift>
          </Reveal>
          <Reveal delay={0.1}>
            <Lift>
              <GeoDimensionsRadarChart />
            </Lift>
          </Reveal>
          <Reveal delay={0.15}>
            <Lift>
              <OverallScoreRadialChart />
            </Lift>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
