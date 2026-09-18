// Presentation only. This must never control collection, API data, or scoring.
export const SHOW_REPORT_CITATIONS = false;

export const CUSTOMER_SCORING_RULE =
  "Overall GEO Score uses website readiness when available, then measured AI visibility or available website optimization signals. Individual AI metrics remain separate and unavailable values remain Not measured.";

const HIDDEN_CITATION_TERM = /\bcitation(?:_authority|_measurement|_status)?\b|\bcitations?\b|\bcited\b/i;

export function isHiddenCitationFinding(...values: Array<string | null | undefined>) {
  return !SHOW_REPORT_CITATIONS && HIDDEN_CITATION_TERM.test(values.filter(Boolean).join(" "));
}

// Apply only to generated report copy, never to source transcripts or URLs.
export function customerReportCopy(value?: string | null, fallback = "Not measured") {
  if (!value) return fallback;
  if (SHOW_REPORT_CITATIONS) return value;
  const copy = value
    .replace(/audit incomplete\s*[-—:]*\s*/gi, "")
    .replace(/AI visibility evidence was insufficient for a reliable overall GEO score\.?/gi,
      "AI visibility metrics were not measured because eligible evidence was insufficient.")
    .replace(/no overall GEO rating was assigned\.?/gi,
      "Additional measurement will improve confidence.")
    .replace(/Unavailable evidence\s*\([^)]*\)\s*was omitted and available components were proportionally reweighted\./gi,
      "Unavailable measurement components were excluded and available components were proportionally reweighted.")
    .replace(/citation[- ]readiness/gi, "GEO readiness")
    .replace(/recommendations, competitors and citations/gi, "recommendations and competitors")
    .replace(/citation likelihood/gi, "AI discoverability");
  // Omit hidden measurement claims rather than relabeling them as another metric.
  return copy.split(/(?<=[.!?])\s+|\n+/)
    .filter(sentence => !HIDDEN_CITATION_TERM.test(sentence))
    .join(" ").trim() || fallback;
}

export function customerConfidenceLevel(level?: string | null) {
  return level?.trim().toUpperCase() === "INCOMPLETE"
    ? "LIMITED CONFIDENCE"
    : level || "Legacy: not recorded";
}

export function customerReportMarkdown(value?: string | null, fallback = "") {
  if (!value) return fallback;
  if (SHOW_REPORT_CITATIONS) return value;

  const lines = value.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)?)(.*)$/);
    const prefix = match?.[1] ?? "";
    const cleaned = customerReportCopy(match?.[2] ?? line, "");
    return cleaned ? `${prefix}${cleaned}` : "";
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() || fallback;
}

export function readinessBackedStatusCopy(
  company: string,
  rating: string,
  aiVisibilityAvailable: boolean,
) {
  const normalizedRating = rating.toLowerCase();
  const ratingLabel = `${normalizedRating.charAt(0).toUpperCase()}${normalizedRating.slice(1)}`;
  const article = /^[aeiou]/i.test(ratingLabel) ? "an" : "a";
  const headline = `${company} has ${article} ${ratingLabel} GEO rating.`;
  if (aiVisibilityAvailable) return headline;
  return `${headline} Your website shows ${normalizedRating} GEO readiness. AI visibility metrics will be reported separately when sufficient measurement data is available.`;
}
