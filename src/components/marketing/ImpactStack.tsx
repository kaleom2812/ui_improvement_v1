// Section 03 (Measure) visual — the real case-study before/after numbers
// (src/data/site.ts `resources.cases`) presented as a fanned stack of cards
// instead of a flat grid, plus a detail panel for the top result.

import { ArrowRight, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { resources } from "@/data/site";

const ROTATE = [-4, 2, -1];

export function ImpactStack() {
  const cases = resources.cases;
  const lead = cases[0];

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative h-[168px] sm:h-[150px]">
        {cases.map((c, i) => (
          <div
            key={c.company}
            className="absolute inset-x-2 rounded-2xl border border-line bg-surface p-4 shadow-card sm:inset-x-6"
            style={{
              top: i * 14,
              transform: `rotate(${ROTATE[i % ROTATE.length]}deg)`,
              zIndex: cases.length - i,
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">{c.company}</p>
              <span className="text-2xs text-ink-3">{c.industry}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="data-fig text-lg text-ink-3 line-through">{c.before}</span>
              <ArrowRight size={13} weight="bold" className="text-brand" />
              <span className="data-fig text-2xl font-bold text-pos">{c.after}</span>
              <span className="ml-auto text-2xs text-ink-3">{c.days} days</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-surface p-5 shadow-pop sm:mt-6">
        <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          <TrendUp size={13} weight="bold" /> Prompt-level detail
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">&ldquo;{lead.quote}&rdquo;</p>
        <p className="mt-3 border-t border-line pt-3 text-2xs text-ink-3">
          {lead.company} · GEO score {lead.before} <ArrowRight size={10} weight="bold" className="mx-1 inline text-brand" /> {lead.after} in{" "}
          {lead.days} days
        </p>
      </div>
    </div>
  );
}
