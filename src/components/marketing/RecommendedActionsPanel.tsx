// Section 02 (Improve) visual — a layered recommendations panel. Two cards
// overlap to read as depth rather than a flat list of identical bordered
// rectangles: a primary "Priority actions" card in front, with a supporting
// "Content opportunities" card peeking out from behind its bottom-right
// corner (the classic overlapping-card look, without HeyAmos's exact
// composition — original content, original offsets).

import { ListChecks, FileText, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/primitives";
import { sampleActions, samplePagePriorities } from "@/data/sample-report";

export function RecommendedActionsPanel() {
  return (
    <div className="relative mx-auto w-full max-w-md pb-7 pr-4">
      {/* Front card — the only normal-flow child, so it defines the wrapper's
          box. The back card below is anchored to its bottom-right corner and
          pushed just past it, giving a fixed-size peek independent of either
          card's content height. */}
      <div className="relative z-10 rounded-2xl border border-line bg-surface p-5 shadow-pop">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          <ListChecks size={16} weight="bold" className="text-brand" /> Priority actions
        </h3>
        <p className="mt-1 text-2xs text-ink-3">Ranked by impact, refreshed every audit.</p>
        <ol className="mt-4 space-y-3">
          {sampleActions.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 border-t border-line pt-3 first:border-t-0 first:pt-0">
              <span className="data-fig mt-0.5 shrink-0 text-xs text-ink-3">{String(a.id).padStart(2, "0")}</span>
              <span className="text-sm text-ink-2">{a.title}</span>
              <Badge tone={a.type === "Quick win" ? "pos" : "neutral"} className="ml-auto shrink-0">
                {a.type}
              </Badge>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-1.5 text-2xs font-semibold text-brand-ink">
          Full action plan in every report <ArrowRight size={12} weight="bold" />
        </p>
      </div>

      {/* Back card — content opportunities, peeking from behind */}
      <div className="absolute -bottom-6 -right-4 z-0 w-[62%] rotate-3 rounded-2xl border border-line bg-subtle/90 p-4 shadow-card">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <FileText size={13} weight="bold" className="text-brand" /> Content gaps
        </h3>
        <ul className="mt-2 space-y-1.5">
          {samplePagePriorities.slice(0, 3).map((p) => (
            <li key={p.name} className="flex items-center justify-between text-2xs text-ink-2">
              <span className="truncate">{p.name}</span>
              <span className="data-fig shrink-0 text-ink-3">{p.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
