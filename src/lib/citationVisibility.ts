import type { ReportSummary } from "./types";

export interface VerifiedCitationEvidence {
  prompt_id: string; response_id: string; provider: string; model: string;
  normalized_url: string; hostname: string;
  attribution: "target" | "tracked_competitor" | "third_party";
  competitor?: string | null;
}
export interface CitationPromptMeasurement {
  prompt_id: string; response_id: string; provider: string; model: string; turn_index: number;
  status: "measured" | "failed" | "not_available";
  target_cited: boolean | null; target_pages: string[]; verified_source_count: number | null;
}
export interface VerifiedCitationScope {
  status: "measured" | "failed" | "not_available"; reason: string;
  eligible_responses: number; responses_with_target_citation: number | null;
  target_citation_rate: number | null; target_citation_count: number | null;
  unique_target_pages: number | null; tracked_competitor_citation_count: number | null;
  third_party_citation_count?: number | null; unique_third_party_sources?: number | null;
  citation_share: number | null; citation_share_denominator: number | null;
  prompt_coverage?: { measured_prompts: number; eligible_prompts: number };
  prompt_measurements?: CitationPromptMeasurement[];
  top_cited_target_pages: Array<{ url: string; citation_count: number; prompt_ids: string[] }>;
  competitors: Array<{ name: string; citation_count: number; citation_share: number; evidence: VerifiedCitationEvidence[] }>;
  evidence: VerifiedCitationEvidence[];
}
export interface VerifiedCitationVisibility {
  version: 1; affects_geo_score: false;
  initial: VerifiedCitationScope; follow_up?: VerifiedCitationScope;
}
export const CITATION_NOTE = "Measured separately; not included in GEO score.";
export const CITATION_UNAVAILABLE = "Verified citation measurement was not available for this audit.";
export const CITATION_METHOD = "Citation Visibility measures whether search-enabled AI responses provide verified source citations to the audited company's website. It is measured separately from brand mentions and recommendations and is not currently included in the GEO score.";
export const CITATION_UNAVAILABLE_METHOD = "Not measured means the provider/model did not supply eligible verified citation evidence for this audit.";
export const citationPercent = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? `${Number(value.toFixed(1))}%` : "Not measured";

export function verifiedCitation(report: Pick<ReportSummary, "citation_visibility">, followUp = false) {
  const v = report.citation_visibility;
  const s = v?.version === 1 && v.affects_geo_score === false ? (followUp ? v.follow_up : v.initial) : undefined;
  const measured = s?.status === "measured" && s.eligible_responses > 0 && typeof s.target_citation_rate === "number" && Number.isFinite(s.target_citation_rate);
  return {
    scope: s, measured: !!measured,
    rate: measured ? s.target_citation_rate : null,
    label: measured ? citationPercent(s.target_citation_rate) : "Not measured",
    explanation: measured ? `${s.responses_with_target_citation} of ${s.eligible_responses} measured AI responses cited the company.` : CITATION_UNAVAILABLE,
    share: measured && (s.citation_share_denominator ?? 0) > 0 ? citationPercent(s.citation_share) : "Not measured",
    pages: measured ? s.top_cited_target_pages || [] : [],
    competitors: measured ? (s.competitors || []).filter(c => c.citation_count > 0 && c.evidence?.length > 0) : [],
    thirdPartySources: measured ? s.unique_third_party_sources ?? null : null,
  };
}

export function promptCitation(report: Pick<ReportSummary, "citation_visibility">, promptId: string, provider?: string) {
  const v = verifiedCitation(report);
  // Search is a separate execution. Provider matching prevents attaching OpenAI's sample to Claude's row.
  return v.scope?.prompt_measurements?.filter(p => p.prompt_id === promptId && (!provider || p.provider === provider)) || [];
}
export function promptCitationLabel(report: Pick<ReportSummary, "citation_visibility">, promptId: string, provider?: string) {
  const rows = promptCitation(report, promptId, provider);
  if (!rows.length) return "Not measured";
  return rows.map(p => p.status === "measured"
    ? `Measured; target ${p.target_cited ? "Yes" : "No"}; ${p.verified_source_count} verified sources`
    : p.status === "failed" ? "Failed / Not measured" : "Not measured").join("; ");
}
export function citationProviders(report: Pick<ReportSummary, "citation_visibility">) {
  const rows = verifiedCitation(report).scope?.prompt_measurements || [];
  return [...new Set(rows.filter(p => p.status === "measured").map(p => `${p.provider} / ${p.model}`))].join(", ");
}
export function citationUrl(url: string) {
  try { const u = new URL(url); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : undefined; }
  catch { return undefined; }
}
export function citationPageLabel(url: string) {
  try { const u = new URL(url); const label = u.hostname + u.pathname; return label.length > 100 ? label.slice(0, 97) + "..." : label; }
  catch { return "Source URL unavailable"; }
}
