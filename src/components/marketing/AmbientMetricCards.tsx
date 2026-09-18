"use client";

// Ambient background atmosphere for the marketing hero — small GEO metric
// cards that drift slowly behind the focal DashboardPreview panel. Purely
// decorative: aria-hidden, pointer-events-none, and never the first thing a
// visitor's eye should land on (low opacity, blurred/faded with depth, kept
// off the center where the real content sits).
//
// Uses `motion/react` (already a dependency — see src/components/ui/dropdown-navigation.tsx
// for the codebase's other use of it) for the gentle perspective/float loop;
// everywhere else in the app favours CSS-driven motion, but a slow 3D drift
// is easiest to express with a spring/easing library. Respects
// prefers-reduced-motion via the shared useReducedMotion hook.

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/hooks";
import {
  sampleScore,
  sampleDimensions,
  sampleCitationRate,
  sampleAnswerability,
  sampleDiscoverability,
  sampleAiMentions,
  sampleQueriesAnalyzed,
} from "@/data/sample-report";

const dim = (key: string) => sampleDimensions.find((d) => d.key === key)?.score ?? 0;

type Depth = "near" | "mid" | "far";

type CardConfig = {
  metric: string;
  value: string;
  pos: string; // Tailwind position utilities
  depth: Depth;
  rotate: number;
  duration: number;
  delay: number;
  from: "md" | "lg"; // minimum breakpoint this card appears at
};

const DEPTH_STYLE: Record<Depth, { opacity: number; blur: string; scale: number }> = {
  near: { opacity: 0.55, blur: "blur-0", scale: 1 },
  mid: { opacity: 0.38, blur: "blur-[1px]", scale: 0.94 },
  far: { opacity: 0.22, blur: "blur-[2px]", scale: 0.86 },
};

const CARDS: CardConfig[] = [
  { metric: "GEO Score", value: `${sampleScore.overall}/100`, pos: "left-[4%] top-[12%]", depth: "near", rotate: -6, duration: 10, delay: 0, from: "md" },
  { metric: "AI Visibility", value: `${dim("mention_rate")}%`, pos: "right-[6%] top-[16%]", depth: "near", rotate: 5, duration: 11, delay: 0.6, from: "md" },
  { metric: "Competitive Position", value: `${dim("competitive_position")}%`, pos: "left-[10%] bottom-[16%]", depth: "near", rotate: 4, duration: 12, delay: 1.1, from: "md" },
  { metric: "AI Mentions", value: `${sampleAiMentions}`, pos: "right-[3%] bottom-[20%]", depth: "mid", rotate: -4, duration: 13, delay: 0.3, from: "md" },
  { metric: "Citation Rate", value: `${sampleCitationRate}%`, pos: "left-[22%] top-[4%]", depth: "mid", rotate: 3, duration: 9, delay: 1.4, from: "lg" },
  { metric: "Entity Understanding", value: `${dim("entity_consistency")}%`, pos: "right-[20%] top-[3%]", depth: "mid", rotate: -3, duration: 14, delay: 0.8, from: "lg" },
  { metric: "Answerability", value: `${sampleAnswerability}%`, pos: "left-[2%] top-[52%]", depth: "far", rotate: 6, duration: 15, delay: 0.2, from: "lg" },
  { metric: "Discoverability", value: `${sampleDiscoverability}%`, pos: "right-[1%] top-[48%]", depth: "far", rotate: -5, duration: 12, delay: 1.8, from: "lg" },
  { metric: "Queries Analyzed", value: sampleQueriesAnalyzed.toLocaleString(), pos: "left-[30%] bottom-[4%]", depth: "far", rotate: 2, duration: 16, delay: 1, from: "lg" },
];

export function AmbientMetricCards() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden [perspective:1400px] md:block"
    >
      {CARDS.map((c) => {
        const d = DEPTH_STYLE[c.depth];
        const floatY = reduced ? 0 : [0, -14, 0];
        const rotateWobble = reduced ? c.rotate : [c.rotate - 1.5, c.rotate + 1.5, c.rotate - 1.5];
        return (
          <motion.div
            key={c.metric}
            className={`absolute ${c.pos} ${c.from === "lg" ? "hidden lg:block" : ""}`}
            style={{ opacity: d.opacity }}
            initial={{ y: 0, rotate: c.rotate }}
            animate={{ y: floatY, rotate: rotateWobble }}
            transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className={`rounded-xl border border-brand/20 bg-surface/70 px-4 py-3 shadow-card ${d.blur}`}
              style={{ transform: `scale(${d.scale})` }}
            >
              <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-brand-ink">{c.metric}</p>
              <p className="data-fig mt-1 text-lg font-bold text-ink">{c.value}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
