// Hero focal visual — a condensed, presentational stand-in for the real
// GeoDashboard product (src/components/GeoDashboard.tsx), built from the same
// chart primitives and illustrative sample data already used elsewhere on the
// marketing site. Deliberately not the live component: the hero needs no
// audit id / auth, just something that reads as "real product UI", the way
// HeyAmos surfaces its own report screenshots rather than an illustration.

import { ScoreDial, BarList } from "@/components/charts";
import { Badge } from "@/components/primitives";
import { MockupFrame } from "./MockupFrame";
import { sampleScore, sampleBenchmark, sampleAiPresence } from "@/data/sample-report";
import { pct } from "@/lib/format";

export function DashboardPreview() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-md">
      <MockupFrame label="yourbrand.com — GEO report">
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <ScoreDial value={sampleScore.overall} grade={sampleScore.grade} size={128} />
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="pos">+{sampleScore.delta} this month</Badge>
              <Badge tone="brand">{pct(sampleAiPresence)} AI presence</Badge>
            </div>
            <BarList items={sampleBenchmark.slice(0, 4)} max={100} labelWidth="6.25rem" />
          </div>
        </div>
      </MockupFrame>
    </div>
  );
}
