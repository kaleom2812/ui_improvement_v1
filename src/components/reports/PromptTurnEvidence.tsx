import React from "react";
import type { PromptEvidence } from "@/lib/types";
import { SHOW_REPORT_CITATIONS } from "@/lib/customerReport";

const signal = (value?: boolean | null) => value == null ? "Not recorded" : value ? "Yes" : "No";

export default function PromptTurnEvidence({ prompt }: { prompt: PromptEvidence }) {
  const scoped = prompt.measurement_scope === "initial_response";
  return <div style={{ overflowWrap: "anywhere", minWidth: 0 }}>
    <strong>{prompt.scoring_eligible === false ? "Profile-discovery response (not scored)" : scoped ? "Initial AI response (scored)" : "Legacy response / transcript"}</strong>
    {!scoped && <p>Turn-level scoring scope was not recorded. Stored metrics are unchanged; this transcript may include follow-up mentions.</p>}
    <div style={{ marginTop: 8 }}>{scoped ? prompt.initial_response || "No initial response text returned." : prompt.response || "No response text returned."}</div>
    {scoped && (prompt.follow_ups || []).length > 0 && <div style={{ marginTop: 16 }}>
      <strong>Follow-up evidence (not included in initial visibility)</strong>
      <p>These answers depend on the conversation and may be prompted by brand-specific questions.</p>
      {prompt.follow_ups.map((turn, index) => <details key={index} style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer" }}>Follow-up {index + 1}: {turn.follow_up_prompt}</summary>
        <p>Status: {turn.status || "Not recorded"}</p>
        {turn.status === "success" ? <>
          <p>Follow-up brand mentioned: {signal(turn.brand_mentioned)} | Recommended: {signal(turn.brand_recommended)}</p>
          <p>Competitors: {turn.competitors_mentioned?.join(", ") || "None detected"}</p>
          {SHOW_REPORT_CITATIONS && <p>Follow-up verified citations, when measured, are reported separately in Citation Visibility. Legacy source arrays are not verified V1 evidence.</p>}
          <div>{turn.response}</div>
        </> : <p>{turn.error || "No analyzable follow-up response recorded."} Excluded from follow-up rates.</p>}
      </details>)}
    </div>}
  </div>;
}
