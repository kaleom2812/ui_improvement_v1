import type { ActionItem, CompetitorIntelligence, PromptEvidence } from "@/lib/types";

export type PromptOutcome = "VISIBLE" | "NOT VISIBLE" | "FOLLOW-UP ONLY" | "RECOMMENDED" | "FAILED";

export function promptOutcome(prompt: PromptEvidence): PromptOutcome {
  const status = prompt.status ?? (prompt.error ? "provider_error" : "success");
  if (status !== "success") return "FAILED";

  const scoped = prompt.measurement_scope === "initial_response";
  const initialMentioned = scoped ? prompt.initial_brand_mentioned ?? prompt.brand_mentioned : prompt.brand_mentioned;
  const initialRecommended = scoped ? prompt.initial_brand_recommended ?? prompt.brand_recommended : prompt.brand_recommended;
  const followUpMentioned = scoped && (
    prompt.follow_up_brand_mentioned === true
    || (prompt.follow_ups || []).some(turn => turn.status !== "failed" && turn.status !== "timeout" && turn.status !== "provider_error" && turn.brand_mentioned === true)
  );

  if (initialRecommended) return "RECOMMENDED";
  if (initialMentioned) return "VISIBLE";
  if (followUpMentioned) return "FOLLOW-UP ONLY";
  return "NOT VISIBLE";
}

export function quickWins(actions: ActionItem[]): ActionItem[] {
  return actions.filter(action => {
    const lowEffort = action.effort?.toLowerCase() === "low";
    const highPriority = ["critical", "high"].includes(action.priority.toLowerCase());
    const highImpact = action.expected_geo_impact.toLowerCase().startsWith("high");
    return lowEffort && (highPriority || highImpact);
  }).slice(0, 3);
}

export function competitiveTakeaway(intelligence: CompetitorIntelligence): {
  summary: string;
  evidence: string;
  opportunity: string;
} {
  if (intelligence.status === "not_measured") {
    return {
      summary: "Competitive visibility was not measured.",
      evidence: intelligence.diagnostic || "No successful competitor evidence was collected.",
      opportunity: "No evidence-backed competitive action is available from this sample.",
    };
  }

  const top = intelligence.competitors.find(item => item.name === intelligence.top_ai_competitor)
    ?? intelligence.competitors[0];
  if (!top) {
    return {
      summary: "No competitor mentions were detected in successful initial responses.",
      evidence: intelligence.diagnostic || "The sampled responses contained no tracked competitor evidence.",
      opportunity: "No competitor-specific opportunity is inferred without evidence.",
    };
  }

  const lossCount = top.prompts_where_brand_loses?.length ?? 0;
  return {
    summary: `${top.name} was the most visible tracked competitor in this sample.`,
    evidence: lossCount
      ? `${top.mention_count} mentions across ${top.prompts_where_mentioned.length} prompt results; the audited brand lost ${lossCount} recorded head-to-head prompt${lossCount === 1 ? "" : "s"}.`
      : `${top.mention_count} mentions across ${top.prompts_where_mentioned.length} prompt results. No prompt-level head-to-head loss was recorded, so no cause is inferred.`,
    opportunity: intelligence.competitive_content_opportunities[0]
      || "No additional evidence-backed competitor opportunity was recorded.",
  };
}

export function dedupeRoadmap(
  roadmap: Record<"0_30_days" | "30_60_days" | "60_90_days", ActionItem[]>,
) {
  const seen = new Set<string>();
  return ([
    ["0_30_days", "0-30 Days", "Foundation / immediate fixes"],
    ["30_60_days", "31-60 Days", "Content + authority improvements"],
    ["60_90_days", "61-90 Days", "Expansion + measurement"],
  ] as const).map(([key, label, focus]) => ({
    key,
    label,
    focus,
    actions: (roadmap[key] || []).filter(action => {
      const identity = `${action.problem}\n${action.recommended_action}`.toLowerCase();
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }),
  }));
}
