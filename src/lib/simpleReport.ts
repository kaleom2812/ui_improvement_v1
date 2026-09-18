import type {
  ActionItem,
  GEOScore,
  PageFinding,
  PromptEvidence,
  ReportSummary,
} from "./types";
import { promptOutcome } from "./reportPresentation";
import { verifiedCitation } from "./citationVisibility";
import { customerReportCopy, readinessBackedStatusCopy, SHOW_REPORT_CITATIONS } from "./customerReport";
import {
  formatGeoScore,
} from "./geoRating";
import { overallGeoRatingCopy, overallGeoScore, overallGeoScoreBasis } from "./overallGeoScore";
import { aiMetricPresentation } from "./aiMetricPresentation";

export const measuredPercent = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}%`
    : "Not measured";
export const measuredScore = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}/100`
    : "Not measured";
export const priority = (value: string) =>
  ({
    critical: "P0",
    high: "P1",
    medium: "P2",
    low: "P2",
    p0: "P0",
    p1: "P1",
    p2: "P2",
    p3: "P2",
  })[value.toLowerCase()] || "P2";

export function visibilityExplanation(report: ReportSummary) {
  const count =
    report.methodology.responses_successful ??
    report.ai_visibility.successful ??
    report.header.responses_analyzed;
  if (report.methodology.measurement_valid === false) {
    return count > 0
      ? "AI responses were collected successfully, but they were profile-discovery responses and were not eligible for GEO scoring."
      : "No successful profile-discovery responses were collected; company understanding remains insufficient for GEO scoring.";
  }
  return customerReportCopy(
    report.ai_visibility.diagnostic ||
    (report.ai_visibility.status === "not_measured"
      ? "AI visibility was not measured. Review response status and measurement eligibility below."
      : report.ai_visibility.scope_note ||
        "Legacy measurement scope was not recorded; stored metrics are preserved.")
  );
}

export function outcome(prompt: PromptEvidence, discovery = false) {
  if (prompt.error || (prompt.status && prompt.status !== "success"))
    return "Failed";
  if (discovery || prompt.scoring_eligible === false) return "Discovery Only";
  return {
    VISIBLE: "Mentioned",
    RECOMMENDED: "Mentioned / Recommended",
    "NOT VISIBLE": "Not Mentioned",
    "FOLLOW-UP ONLY": "Follow-up Only",
    FAILED: "Failed",
  }[promptOutcome(prompt)];
}

export function citationCell(prompt: PromptEvidence, discovery = false) {
  if (
    discovery ||
    prompt.scoring_eligible === false ||
    prompt.error ||
    (prompt.status && prompt.status !== "success")
  )
    return "Not measured";
  if (
    prompt.citation_status === "not_available" ||
    (!prompt.citation_status && !prompt.citations?.length)
  )
    return "Not measured";
  return `${prompt.citation_count ?? prompt.citations?.length ?? 0} sources`;
}

export function competitorCell(prompt: PromptEvidence, discovery = false) {
  if (
    discovery ||
    prompt.scoring_eligible === false ||
    prompt.error ||
    (prompt.status && prompt.status !== "success")
  )
    return "Not measured";
  return (
    (prompt.competitors_mentioned || []).map((c) => c.name).join(", ") ||
    "None detected"
  );
}

export function pageCells(page: PageFinding) {
  const crawled = page.crawl_status === "Crawled";
  return [
    page.url,
    page.page_type || "Not recorded",
    crawled
      ? Number.isFinite(page.word_count)
        ? `${page.word_count} words`
        : "Not measured"
      : `Failed: ${(page.issues || []).join("; ") || "Failure reason not recorded"}`,
    crawled && page.has_schema_markup != null
      ? page.has_schema_markup
        ? (page.schema_types || []).join(", ") || "Detected"
        : "Not detected"
      : "Not measured",
    crawled ? page.citation_readiness || "Not measured" : "Not measured",
  ];
}

export function simpleReport(report: ReportSummary, geo?: GEOScore) {
  const h = report.header,
    v = report.ai_visibility,
    m = report.methodology;
  const discovery = m.measurement_valid === false;
  const pages = [...(report.content_analysis.pages || [])].sort(
    (a, b) =>
      Number(a.crawl_status === "Crawled") -
      Number(b.crawl_status === "Crawled"),
  );
  const crawlAvailable =
    report.content_analysis.site_summary?.status !== "not_measured" &&
    pages.some((p) => p.crawl_status === "Crawled");
  const readiness = crawlAvailable
    ? (report.score_pillars?.website_readiness.score ??
      geo?.website_geo_readiness)
    : null;
  const readinessAvailable =
    typeof readiness === "number" && Number.isFinite(readiness);
  const successful =
    m.responses_successful ?? v.successful ?? h.responses_analyzed;
  const attempted = m.prompts_attempted ?? v.attempted ?? h.responses_analyzed;
  const mentionRate =
    discovery || v.status === "not_measured" ? null : v.mention_rate;
  const recommendationRate =
    discovery || v.status === "not_measured"
      ? null
      : (v.recommendation_rate ?? geo?.recommendation_rate);
  const shareOfVoice =
    discovery ||
    v.status === "not_measured" ||
    report.competitor_intelligence.status === "not_measured"
      ? null
      : geo?.ai_share_of_voice;
  const aiVisibilityAvailable = !discovery && v.status !== "not_measured";
  const mentionPresentation = aiMetricPresentation(mentionRate, successful);
  const recommendationPresentation = aiMetricPresentation(
    recommendationRate,
    successful,
  );
  const headlineScore = overallGeoScore({
    geoReadiness: readinessAvailable ? readiness : null,
    aiVisibilityMeasured: aiVisibilityAvailable,
    mentionRate,
    shareOfVoice,
    recommendationRate,
    technicalComponents: (report.score_breakdown.components || []).map((component) => ({
      key: component.key,
      score: component.raw_score ?? component.percentage,
      weight: component.weight,
    })),
  });
  const overallRating = headlineScore.rating;
  const available = true;
  const citation = verifiedCitation(report);
  const citationRate = citation.rate;
  const components = (report.score_breakdown.components || []).filter((c) =>
    c.key === "website_geo_readiness"
      ? crawlAvailable
      : !discovery && v.status !== "not_measured",
  ).filter(c => SHOW_REPORT_CITATIONS || !/citation/i.test(`${c.key} ${c.label}`))
    .map(c => ({ ...c, evidence: customerReportCopy(c.evidence) }));
  const seen = new Set<string>();
  const actions = (report.action_center || [])
    .filter((a) => {
      const key = a.recommended_action.trim().toLowerCase();
      if (!key || !a.evidence?.trim() || seen.has(key)) return false;
      if (!SHOW_REPORT_CITATIONS && /\bcitation(?:_authority|_measurement|_status)?\b|\bcitations?\b|\bcited\b/i.test(`${a.category} ${a.problem}`)) return false;
      if (
        !crawlAvailable &&
        (/technical|schema|entity/i.test(a.category) ||
          /0\s*\/\s*0|thin content|thin pages|no faq|missing faq|no schema|missing schema|structured data|zero.word/i.test(
            `${a.problem} ${a.evidence}`,
          ))
      )
        return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => priority(a.priority).localeCompare(priority(b.priority)))
    .slice(0, 5)
    .map(a => ({
      ...a,
      category: customerReportCopy(a.category, "GEO readiness"),
      recommended_action: customerReportCopy(a.recommended_action, "Review the recorded action in JSON."),
      evidence: customerReportCopy(a.evidence, "Supporting detail is preserved in the JSON export."),
      expected_geo_impact: customerReportCopy(a.expected_geo_impact),
      implementation_guidance: customerReportCopy(a.implementation_guidance),
      success_metric: customerReportCopy(a.success_metric, "Not recorded"),
    }));
  const plan: Array<{ week: string; title: string; actions: string[] }> = [
    { week: "Week 1", title: "Measurement integrity", actions: [] },
    { week: "Week 2", title: "Technical & entity", actions: [] },
    { week: "Week 3", title: "Content", actions: [] },
    { week: "Week 4", title: "Re-test & compare", actions: [] },
  ];
  for (const action of actions) {
    const phase = /measurement|provider|profile/i.test(action.category)
      ? 0
      : /technical|entity|schema/i.test(action.category)
        ? 1
        : 2;
    plan[phase].actions.push(action.recommended_action);
  }
  if (discovery || successful < attempted)
    plan[0].actions.unshift(
      discovery
        ? "Validate company/category evidence before running a fresh category-specific measurement."
        : `Resolve the ${attempted - successful} failed initial request(s) before repeating measurement.`,
    );
  if (!discovery && successful > 0)
    plan[3].actions.push(
      "Repeat the same measurement prompt set after implemented changes; compare only eligible initial responses, keeping provider/model and scope documented.",
    );
  const summary = headlineScore.scoreSource === "geo_readiness"
    ? readinessBackedStatusCopy(h.organization, overallRating, aiVisibilityAvailable)
    : overallGeoRatingCopy(h.organization, headlineScore);
  return {
    available,
    overallRating,
    numericScore: headlineScore.score === null ? null : formatGeoScore(headlineScore.score),
    score: headlineScore.score,
    scoreSource: headlineScore.scoreSource,
    dataConfidence: headlineScore.dataConfidence,
    discovery,
    crawlAvailable,
    readiness,
    successful,
    attempted,
    mentionRate,
    recommendationRate,
    mentionPresentation,
    recommendationPresentation,
    citationRate,
    citation,
    actions,
    pages,
    components,
    plan: plan.filter((p) => p.actions.length),
    summary: customerReportCopy(summary),
    interpretation: overallGeoScoreBasis(headlineScore.scoreSource),
    strength:
      discovery && !crawlAvailable
        ? "Not measured"
        : customerReportCopy(report.executive_summary.biggest_strength),
    gap: discovery
      ? report.profile_discovery?.validation.measurement_blocker ||
        "Company/category evidence is not sufficiently validated for GEO measurement."
      : customerReportCopy(report.executive_summary.biggest_weakness),
    nextAction:
      actions[0]?.recommended_action ||
      "No evidence-backed action was recorded.",
    metrics: [
      ["AI Mention Rate", mentionPresentation.label],
      ["AI Recommendation Rate", recommendationPresentation.label],
      ...(SHOW_REPORT_CITATIONS ? [["Citation Visibility", citation.label]] : []),
      ["Prompts tested", String(h.prompts_tested)],
      ["Pages analyzed", String(h.pages_analyzed)],
      ["Successful AI responses", `${successful}/${attempted}`],
      ["Providers", h.providers.join(", ") || "Not recorded"],
      ["Technical GEO / Website Readiness", measuredScore(readiness)],
      ["Priority actions", String(actions.length)],
    ],
  };
}

export function actionWhy(action: ActionItem) {
  return action.expected_geo_impact || action.evidence;
}
