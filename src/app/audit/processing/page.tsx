"use client";

// Processing screen. UI rebuilt from GEO-UI-Version-5/src/audit/Processing.jsx,
// but driven by REAL poll status from /api/audit/:id (useAuditReport) instead of
// a fixed timer. Stage list advances on a gentle timer for feedback; the actual
// transition to results happens once the backend reaches a terminal state with a
// report — either "complete" or "incomplete" (a partial-but-valid audit).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleNotch, WarningCircle, ArrowRight } from "@phosphor-icons/react";
import { useAuditFlow } from "@/state/audit-flow";
import { useAuditReport } from "@/lib/use-audit-report";
import { useReducedMotion } from "@/lib/hooks";
import { processingStages } from "@/data/site";

const STAGE_MS = 6000;

export default function Processing() {
  const router = useRouter();
  const { lastAudit, hydrated } = useAuditFlow();
  const reduced = useReducedMotion();
  const { status, error } = useAuditReport(lastAudit?.id, { poll: true });
  const [stage, setStage] = useState(0);

  // No audit in progress → send back to the wizard (wait for hydration first).
  useEffect(() => {
    if (hydrated && !lastAudit?.id) router.replace("/audit");
  }, [hydrated, lastAudit, router]);

  // Advance the visible stage list on a timer (purely cosmetic feedback).
  useEffect(() => {
    if (status !== "processing") return;
    const factor = reduced ? 0.4 : 1;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, processingStages.length - 1)), STAGE_MS * factor);
    return () => clearInterval(t);
  }, [status, reduced]);

  // Terminal state with a report ("complete" or "incomplete") → results.
  useEffect(() => {
    if (status === "complete" || status === "incomplete") {
      const t = setTimeout(() => router.replace("/audit/results"), reduced ? 200 : 900);
      return () => clearTimeout(t);
    }
  }, [status, router, reduced]);

  const done = status === "complete" || status === "incomplete";
  const failed = status === "failed";
  const activeStage = done ? processingStages.length : stage;
  const pct = Math.round((Math.min(activeStage, processingStages.length) / processingStages.length) * 100);

  return (
    <div className="site-container flex min-h-[calc(100vh-3.5rem)] max-w-xl flex-col justify-center py-12">
      <p className="eyebrow">{failed ? "Analysis failed" : done ? "Analysis complete" : "Analyzing"}</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {failed ? "Something went wrong" : done ? "Opening your results…" : `Auditing ${lastAudit?.domain || "your site"}`}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        {failed
          ? "The audit could not be completed."
          : done
          ? "Your GEO score and findings are ready."
          : "Probing the AI models and crawling your pages. This usually takes 1–4 minutes."}
      </p>

      {failed ? (
        <div className="mt-8">
          <div className="flex items-start gap-2 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">
            <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
            <span>{error || "Unknown error."}</span>
          </div>
          <button type="button" onClick={() => router.push("/audit")} className="btn-primary mt-6">
            Start a new audit <ArrowRight size={15} weight="bold" />
          </button>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <div className="flex items-end justify-between">
              <p className="text-2xs uppercase tracking-[0.08em] text-ink-3">Progress</p>
              <p className="data-fig text-sm text-ink-3">{done ? 100 : pct}%</p>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-1.5 rounded-full bg-brand transition-[width] duration-700" style={{ width: `${done ? 100 : pct}%` }} />
            </div>
          </div>

          <ol className="mt-8 space-y-1" aria-label="Audit steps">
            {processingStages.map((s, i) => {
              const state = done || i < activeStage ? "done" : i === activeStage ? "running" : "todo";
              return (
                <li key={s.key} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${state === "running" ? "bg-subtle" : ""}`}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    {state === "done" ? (
                      <span className="text-pos">
                        <Check size={16} weight="bold" />
                      </span>
                    ) : state === "running" ? (
                      <span className="animate-spin360 text-brand">
                        <CircleNotch size={16} weight="bold" />
                      </span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-line-2" />
                    )}
                  </span>
                  <span>
                    <span className={`block text-sm font-medium ${state === "todo" ? "text-ink-3" : "text-ink"}`}>{s.label}</span>
                    {state !== "todo" && <span className="block text-2xs text-ink-3">{s.detail}</span>}
                  </span>
                </li>
              );
            })}
          </ol>

          <p role="status" aria-live="polite" className="sr-only">
            {done ? "Analysis complete." : `Working: ${processingStages[Math.min(activeStage, processingStages.length - 1)].label}`}
          </p>
        </>
      )}
    </div>
  );
}
