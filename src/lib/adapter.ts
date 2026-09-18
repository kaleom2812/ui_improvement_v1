// ─────────────────────────────────────────────────────────────────────────────
// Frontend adapter: AuditReport (production data contract) -> Signal view model.
//
// The approved UI was designed against a richer mock dataset than the GEO
// pipeline currently emits. This module is the ONLY place that bridges the two:
//   existing GEO API/data  ->  this adapter  ->  Signal UI components
//
// Every derived value is optional. `has*` flags let sections render honest empty
// states instead of fabricated numbers. NOTHING here invents data — fields the
// backend does not provide stay absent and the UI says so.
// ─────────────────────────────────────────────────────────────────────────────

import type { AuditReport, GEOScore, Gap } from "./types";
import { componentDisplayName } from "./types";
import { gradeFor, tierFor, providerLabel } from "./format";
import {
  type GeoRating,
} from "./geoRating";
import { customerReportCopy, customerReportMarkdown, isHiddenCitationFinding, readinessBackedStatusCopy } from "./customerReport";
import {
  overallGeoScore,
  overallGeoRatingCopy,
  type OverallGeoScoreSource,
} from "./overallGeoScore";
import {
  AI_MENTION_RATE_EXPLANATION,
  AI_RECOMMENDATION_RATE_EXPLANATION,
  aiMetricPresentation,
} from "./aiMetricPresentation";

/** The `[id]/route.ts` proxy injects a few fields onto the raw AuditReport. */
export interface AuditQuery {
  prompt: string;
  engine: string;
  is_mentioned: boolean;
  is_cited: boolean;
  snippet: string;
  full_response: string;
  sources: Array<{ title?: string; url: string }>;
  position: number | null;
  sentiment: string;
  error?: string;
}
export interface ExtendedAuditReport extends AuditReport {
  queries?: AuditQuery[];
  llms_txt?: string;
  seo_metrics?: Record<string, number>;
  audit_input?: { description?: string };
  geo_score?: GEOScore & {
    citations_by_engine?: Record<string, number>;
    share_of_voice?: number;
  };
  crawl_result?: AuditReport["crawl_result"] & {
    homepage?: { blocked_crawlers?: string[] };
  };
}

// "incomplete" = backend finished and returned a valid report, but some
// measurements (e.g. a provider run or the crawl) did not complete. It is a
// TERMINAL state and carries `data`, exactly like "complete" — every screen
// must treat it as a finished audit, not keep waiting.
export type AuditStatus = "idle" | "processing" | "complete" | "incomplete" | "failed";

export type OutcomeKey = "absent" | "weak" | "cited" | "present";
export const outcomeMeta: Record<OutcomeKey, { label: string; tone: "neg" | "warn" | "pos" }> = {
  absent: { label: "Not mentioned", tone: "neg" },
  weak: { label: "Weak mention", tone: "warn" },
  cited: { label: "Mentioned & cited", tone: "pos" },
  present: { label: "Mentioned", tone: "pos" },
};

export interface Dimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  summary: string;
}

export interface AdaptedAction {
  id: number;
  gapId: string;
  title: string;
  dimension: string;
  detail: string;
  evidence: string;
  competitorAdvantage: string;
  pagesAffected: string[];
  severity: string;
  impact: number; // 1..5
  effort: number; // 1..5
  effortLabel: string;
  type: "Quick win" | "Project";
  priority: boolean;
}

export interface AdaptedPrompt {
  id: string;
  prompt: string;
  model: string;
  engineKey: string;
  outcome: OutcomeKey;
  isMentioned: boolean;
  isCited: boolean;
  position: number | null;
  sentiment: string;
  response: string;
  snippet: string;
  citations: string[];
  error?: string;
}

export interface ViewModel {
  status: AuditStatus;
  hasReport: boolean;

  brand: string;
  domain: string;
  url: string;
  industry: string;
  auditId: string;
  generatedAt: string;
  headline: string;
  visibilityLevel: string;

  score: {
    has: boolean;
    numericAvailable: boolean;
    overall: number;
    overallExact: number;
    grade: string;
    tier: string;
    rating: GeoRating;
    presentation: GeoRating;
    source: OverallGeoScoreSource;
    dataConfidence: "Standard" | "Limited";
  };

  dimensions: Dimension[];
  hasDimensions: boolean;

  headlineMetrics: Array<{ label: string; value: string; sub: string; tone: "pos" | "warn" | "neg" | "neutral" }>;

  aiVisibility: {
    has: boolean;
    mentionRate: number | null;
    ciLow: number;
    ciHigh: number;
    recommendationRate: number | null;
    recommendationCount: number;
    sampleSize: number;
    promptsTested: number;
    providerRuns: number;
    sentiment: number;
    models: Array<{ key: string; label: string; presence: number }>;
  };

  searchDiscovery: {
    has: boolean;
    data: AuditReport["search_discovery"] | null;
  };

  company: {
    has: boolean;
    name: string;
    description: string;
    industry: string;
    products: string[];
    services: string[];
    keyPages: Array<{ type: string; url: string; title: string }>;
    detectedTopics: string[];
    locations: string[];
    targetAudience: string[];
  };

  competitors: {
    has: boolean;
    brandShareOfVoice: number | null;
    list: Array<{ name: string; domain?: string; reason?: string }>;
  };

  citations: {
    has: boolean;
    total: number;
    brandShare: number;
    topDomains: Array<{ domain: string; count: number; share: number; self: boolean }>;
    byEngine: Array<{ key: string; label: string; value: number }>;
    citedPages: Array<{ page: string; count: number }>;
  };

  prompts: {
    has: boolean;
    list: AdaptedPrompt[];
    absentCount: number;
    citedCount: number;
  };

  technical: {
    has: boolean;
    readinessScore: number;
    issues: string[];
    crawlerTable: Array<{ bot: string; purpose: string; blocked: boolean; explicit: boolean }>;
    llmsTxt: string | null;
    hasLlmsTxt: boolean;
    recommendedSchema: string;
    gaps: Gap[];
  };

  pages: {
    has: boolean;
    totalCrawled: number;
    keyPages: Array<{ type: string; url: string; title: string }>;
    affected: string[];
    issues: string[];
  };

  actions: {
    has: boolean;
    list: AdaptedAction[];
    quadrant: AdaptedAction[];
    top3: string[];
    quickWinCount: number;
  };

  roadmap: {
    has: boolean;
    playbookMarkdown: string;
  };

  report: {
    hasExecutive: boolean;
    executiveMarkdown: string;
    hasPlaybook: boolean;
    playbookMarkdown: string;
    topRecommendations: string[];
  };

  methodology: Array<{ label: string; value: string }>;
}

// ── helpers ────────────────────────────────────────────────────────────────────

const BRAND_FROM_URL = (url: string) =>
  (url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return (u || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
};

function severityToImpact(severity: string): number {
  const s = (severity || "").toUpperCase();
  if (s.includes("CRITICAL") || s === "P0") return 5;
  if (s.includes("HIGH") || s === "P1") return 4;
  if (s.includes("MEDIUM") || s === "P2") return 3;
  if (s.includes("LOW") || s === "P3") return 2;
  return 3;
}

function effortToNumber(raw: string): number {
  const s = (raw || "").toLowerCase();
  const digits = s.match(/\d+/);
  if (/hour|1[-–]?2\s*h|trivial|one[- ]line/.test(s)) return 1;
  if (/quick|1[-–]?2\s*day|a day|days\b/.test(s)) return 2;
  if (/medium|moderate|week\b|3[-–]?5\s*day/.test(s)) return 3;
  if (/high|weeks|sprint/.test(s)) return 4;
  if (/quarter|month|very high|major/.test(s)) return 5;
  if (digits) return Math.max(1, Math.min(5, Number(digits[0]) <= 5 ? Number(digits[0]) : 3));
  return 3;
}

const KNOWN_CRAWLERS = [
  { bot: "GPTBot", purpose: "ChatGPT retrieval and training" },
  { bot: "OAI-SearchBot", purpose: "ChatGPT search results" },
  { bot: "ClaudeBot", purpose: "Claude retrieval" },
  { bot: "PerplexityBot", purpose: "Perplexity answers" },
  { bot: "Google-Extended", purpose: "Gemini / AI Overviews grounding" },
  { bot: "CCBot", purpose: "Common Crawl (feeds many models)" },
  { bot: "Bingbot", purpose: "Bing index (powers Copilot)" },
];

function buildRecommendedSchema(name: string, url: string): string {
  const webUrl = url || `https://${name}`;
  return `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${name}",
  "url": "${webUrl}",
  "logo": "${webUrl.replace(/\/$/, "")}/logo.png",
  "sameAs": [
    "https://www.wikidata.org/wiki/Special:Search?search=${encodeURIComponent(name)}",
    "https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, "_"))}"
  ]
}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

export function buildViewModel(
  report: ExtendedAuditReport | null | undefined,
  status: AuditStatus = report ? "complete" : "idle",
  fallbackDomain = ""
): ViewModel {
  const r = report ?? undefined;
  const gs = r?.geo_score;
  const cp = r?.company_profile;
  const crawl = r?.crawl_result;
  const gaps = r?.gap_report?.gaps ?? [];
  const queries = r?.queries ?? [];

  const domain = cp?.domain || BRAND_FROM_URL(r?.website_url || "") || fallbackDomain || "";
  const brand = r?.organization_name || cp?.company_name || crawl?.extracted_brand_name || domain || "Your brand";

  // dimensions from score_components
  const dimensions: Dimension[] = (gs?.score_components ?? [])
    .filter((c) => !isHiddenCitationFinding(c.name, componentDisplayName(c.name)))
    .map((c) => ({
    key: c.name,
    label: componentDisplayName(c.name),
    score: Math.round(c.raw_score ?? 0),
    weight: c.weight ?? 0,
    weightedScore: c.weighted_score ?? 0,
    summary: customerReportCopy(c.explanation, "Measurement detail unavailable."),
  }));

  const websitePillar = r?.report_summary?.score_pillars?.website_readiness;
  const readinessCandidate =
    websitePillar?.score ?? crawl?.geo_readiness_score ?? gs?.website_geo_readiness;
  const readinessExplicitlyUnavailable =
    websitePillar?.status === "not_measured" ||
    websitePillar?.status === "unavailable" ||
    crawl?.crawl_evidence_available === false;
  const readinessAvailable =
    !readinessExplicitlyUnavailable &&
    typeof readinessCandidate === "number" &&
    Number.isFinite(readinessCandidate);
  const readinessScore = readinessAvailable ? Number(readinessCandidate) : null;
  const aiMetricsAvailable =
    gs?.ai_visibility_available !== false &&
    r?.report_summary?.ai_visibility.status !== "not_measured" &&
    r?.report_summary?.methodology.measurement_valid !== false;
  const mentionRate = aiMetricsAvailable && typeof gs?.mention_rate === "number" ? gs.mention_rate : null;
  const recRate = aiMetricsAvailable && typeof gs?.recommendation_rate === "number" ? gs.recommendation_rate : null;
  const sovValue = gs?.share_of_voice ?? gs?.ai_share_of_voice;
  const competitiveMetricsAvailable =
    aiMetricsAvailable && r?.report_summary?.competitor_intelligence.status !== "not_measured";
  const sov = competitiveMetricsAvailable && typeof sovValue === "number" ? sovValue : null;
  const headlineScore = overallGeoScore({
    geoReadiness: readinessScore,
    aiVisibilityMeasured: aiMetricsAvailable,
    mentionRate,
    shareOfVoice: sov,
    recommendationRate: recRate,
    technicalComponents: (gs?.score_components ?? [])
      .filter((component) => component.name !== "website_geo_readiness" || !readinessExplicitlyUnavailable)
      .map((component) => ({
        key: component.name,
        score: component.raw_score,
        weight: component.weight,
      })),
  });
  const numericAvailable = headlineScore.score !== null;
  const overallExact = headlineScore.score ?? 0;
  const overall = headlineScore.score ?? 0;
  const scorePresentation = headlineScore.rating;
  const rating = headlineScore.rating;

  // per-provider models
  const perProvider = gs?.per_provider_mention_rate ?? {};
  const models = Object.entries(perProvider)
    .filter(([k]) => k.toLowerCase() !== "mock")
    .map(([k, v]) => ({ key: k, label: providerLabel(k), presence: Number(v) || 0 }))
    .sort((a, b) => b.presence - a.presence);

  // prompts / evidence
  const promptList: AdaptedPrompt[] = queries.map((q, i) => {
    const isM = !!q.is_mentioned;
    const isC = !!q.is_cited;
    const neg = /neg/i.test(q.sentiment || "");
    let outcome: OutcomeKey = "absent";
    if (isM && isC) outcome = "cited";
    else if (isM && (neg || q.position == null || q.position > 3)) outcome = "weak";
    else if (isM) outcome = "present";
    return {
      id: `pe-${i + 1}`,
      prompt: q.prompt || "",
      model: providerLabel(q.engine),
      engineKey: (q.engine || "").toLowerCase(),
      outcome,
      isMentioned: isM,
      isCited: isC,
      position: q.position ?? null,
      sentiment: q.sentiment || "",
      response: q.full_response || q.snippet || "",
      snippet: q.snippet || (q.full_response ? q.full_response.slice(0, 200) + "…" : ""),
      citations: (q.sources ?? []).map((s) => s.url).filter(Boolean),
      error: q.error || undefined,
    };
  });

  // citation source breakdown
  const rawBreakdown = r?.citation_source_breakdown ?? {};
  const breakdownTotal = Object.values(rawBreakdown).reduce((s, n) => s + (Number(n) || 0), 0);
  const topDomains = Object.entries(rawBreakdown)
    .map(([d, n]) => ({
      domain: d,
      count: Number(n) || 0,
      share: breakdownTotal ? (Number(n) || 0) / breakdownTotal : 0,
      self: hostOf(d) === domain || d === domain,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const brandShare = topDomains.find((d) => d.self)?.share ?? 0;

  // cited pages: prompt sources whose host is the brand domain
  const citedPageMap = new Map<string, number>();
  promptList.forEach((p) =>
    p.citations.forEach((u) => {
      if (hostOf(u) === domain) {
        let path = "/";
        try {
          path = new URL(u).pathname || "/";
        } catch {
          /* keep "/" */
        }
        citedPageMap.set(path, (citedPageMap.get(path) ?? 0) + 1);
      }
    })
  );
  const citedPages = [...citedPageMap.entries()]
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count);

  const byEngineRaw = gs?.citations_by_engine ?? {};
  const byEngine = Object.entries(byEngineRaw)
    .filter(([k]) => k.toLowerCase() !== "mock")
    .map(([k, v]) => ({ key: k, label: providerLabel(k), value: Number(v) || 0 }));

  // crawler table
  const blocked = (crawl?.homepage?.blocked_crawlers ?? []).map((c) => c.toLowerCase());
  const crawlerTable = KNOWN_CRAWLERS.map((c) => ({
    ...c,
    blocked: blocked.includes(c.bot.toLowerCase()),
    explicit: blocked.length > 0,
  }));

  // actions from gaps
  const actions: AdaptedAction[] = gaps.filter((g) => !isHiddenCitationFinding(g.category, g.issue)).map((g, i) => {
    const impact = severityToImpact(g.severity);
    const effort = effortToNumber(g.estimated_effort);
    return {
      id: i + 1,
      gapId: g.gap_id || `gap-${i + 1}`,
      title: customerReportCopy(g.issue, "Untitled finding"),
      dimension: customerReportCopy(g.category, "General"),
      detail: customerReportCopy(g.recommended_action, ""),
      evidence: customerReportCopy(g.evidence, ""),
      competitorAdvantage: customerReportCopy(g.competitor_advantage, ""),
      pagesAffected: g.pages_affected ?? [],
      severity: g.severity || "MEDIUM",
      impact,
      effort,
      effortLabel: g.estimated_effort || "—",
      type: impact >= 4 && effort <= 2 ? "Quick win" : "Project",
      priority: (r?.gap_report?.top_3_priorities ?? []).includes(g.gap_id),
    };
  });
  const sortedActions = [...actions].sort((a, b) => b.impact - a.impact || a.effort - b.effort);

  // headline metric tiles
  const headlineMetrics: ViewModel["headlineMetrics"] = [];
  if (gs) {
    const successfulResponses = gs.sample_size ?? 0;
    const mentionPresentation = aiMetricPresentation(mentionRate, successfulResponses);
    const recommendationPresentation = aiMetricPresentation(recRate, successfulResponses);
    headlineMetrics.push({
      label: "AI Mention Rate",
      value: mentionPresentation.label,
      sub: mentionPresentation.explanation || AI_MENTION_RATE_EXPLANATION,
      tone: mentionRate == null ? "neutral" : mentionRate >= 50 ? "pos" : mentionRate >= 25 ? "warn" : "neg",
    });
    headlineMetrics.push({
      label: "Share of voice",
      value: sov == null ? "Not measured" : `${sov.toFixed(1)}%`,
      sub: `vs the tracked competitor set`,
      tone: sov == null ? "neutral" : sov >= 25 ? "pos" : sov >= 10 ? "warn" : "neg",
    });
    headlineMetrics.push({
      label: "AI Recommendation Rate",
      value: recommendationPresentation.label,
      sub: recommendationPresentation.explanation || AI_RECOMMENDATION_RATE_EXPLANATION,
      tone: recRate == null ? "neutral" : recRate >= 20 ? "pos" : recRate >= 8 ? "warn" : "neg",
    });
  }
  if (crawl && readinessScore !== null) {
    headlineMetrics.push({
      label: "GEO readiness",
      value: `${Math.round(readinessScore)}`,
      sub: `${crawl.total_pages_crawled || 0} pages crawled`,
      tone: readinessScore >= 70 ? "pos" : readinessScore >= 45 ? "warn" : "neg",
    });
  }
  if (gaps.length) {
    const critical = gaps.filter((g) => severityToImpact(g.severity) >= 4).length;
    headlineMetrics.push({
      label: "Open findings",
      value: `${gaps.length}`,
      sub: `${critical} high-impact`,
      tone: critical === 0 ? "pos" : critical <= 2 ? "warn" : "neg",
    });
  }

  // methodology
  const methodology: Array<{ label: string; value: string }> = [];
  if (r) {
    methodology.push({ label: "Audit ID", value: r.audit_id || "—" });
    if (r.generated_at) methodology.push({ label: "Generated", value: r.generated_at });
    if (gs?.scored_at) methodology.push({ label: "Scored at", value: gs.scored_at });
    methodology.push({ label: "Industry", value: cp?.industry || r.industry || "—" });
    if (gs?.total_prompts_tested)
      methodology.push({ label: "Prompts tested", value: String(gs.total_prompts_tested) });
    if (gs?.total_provider_runs)
      methodology.push({ label: "Provider runs", value: String(gs.total_provider_runs) });
    if (gs?.sample_size) methodology.push({ label: "Responses analysed", value: String(gs.sample_size) });
    const providers = r.execution_batch?.providers_used;
    if (providers?.length)
      methodology.push({ label: "Models queried", value: providers.map(providerLabel).join(", ") });
    if (crawl?.total_pages_crawled)
      methodology.push({ label: "Pages crawled", value: String(crawl.total_pages_crawled) });
    if (r.execution_batch?.total_cost_usd != null)
      methodology.push({ label: "Compute cost", value: `$${r.execution_batch.total_cost_usd.toFixed(4)}` });
  }

  const affected = [...new Set(gaps.flatMap((g) => g.pages_affected ?? []))];

  return {
    status,
    hasReport: !!r,

    brand,
    domain,
    url: r?.website_url || (domain ? `https://${domain}` : ""),
    industry: cp?.industry || r?.industry || "",
    auditId: r?.audit_id || "",
    generatedAt: r?.generated_at || "",
    headline: headlineScore.scoreSource === "geo_readiness"
      ? readinessBackedStatusCopy(brand, rating, aiMetricsAvailable)
      : overallGeoRatingCopy(brand, headlineScore),
    visibilityLevel: r?.current_visibility_level || "",

    score: {
      has: !!r,
      numericAvailable,
      overall,
      overallExact,
      grade: gradeFor(overall),
      tier: rating ?? (r?.current_visibility_level || tierFor(overall)),
      rating,
      presentation: scorePresentation,
      source: headlineScore.scoreSource,
      dataConfidence: headlineScore.dataConfidence,
    },

    dimensions,
    hasDimensions: dimensions.length > 0,

    headlineMetrics,

    aiVisibility: {
      has: mentionRate != null || recRate != null || (gs?.sample_size ?? 0) > 0,
      mentionRate,
      ciLow: gs?.mention_rate_ci_low ?? 0,
      ciHigh: gs?.mention_rate_ci_high ?? 0,
      recommendationRate: recRate,
      recommendationCount: gs?.brand_recommendation_count ?? 0,
      sampleSize: gs?.sample_size ?? 0,
      promptsTested: gs?.total_prompts_tested ?? 0,
      providerRuns: gs?.total_provider_runs ?? 0,
      sentiment: gs?.brand_sentiment ?? 0,
      models,
    },

    searchDiscovery: {
      has: !!r?.search_discovery?.enabled,
      data: r?.search_discovery ?? null,
    },

    company: {
      has: !!cp,
      name: cp?.company_name || brand,
      description: cp?.description || r?.audit_input?.description || "",
      industry: cp?.industry || r?.industry || "",
      products: cp?.products ?? [],
      services: cp?.services ?? [],
      keyPages: cp?.key_pages ?? [],
      detectedTopics: cp?.detected_topics ?? [],
      locations: cp?.locations ?? [],
      targetAudience: cp?.target_audience ?? [],
    },

    competitors: {
      has: (cp?.competitors?.length ?? 0) > 0,
      brandShareOfVoice: sov,
      list: cp?.competitors ?? [],
    },

    citations: {
      has: topDomains.length > 0 || byEngine.length > 0,
      total: breakdownTotal,
      brandShare,
      topDomains,
      byEngine,
      citedPages,
    },

    prompts: {
      has: promptList.length > 0,
      list: promptList,
      absentCount: promptList.filter((p) => p.outcome === "absent").length,
      citedCount: promptList.filter((p) => p.isCited).length,
    },

    technical: {
      has: !!crawl || !!r?.llms_txt || gaps.some((g) => /tech|crawl|schema|robots|render/i.test(g.category)),
      readinessScore: Math.round(crawl?.geo_readiness_score ?? 0),
      issues: crawl?.geo_readiness_issues ?? [],
      crawlerTable,
      llmsTxt: r?.llms_txt ?? null,
      hasLlmsTxt: !!r?.llms_txt,
      recommendedSchema: buildRecommendedSchema(brand, r?.website_url || `https://${domain}`),
      gaps: gaps.filter((g) => /tech|crawl|schema|robots|render|entity|structured/i.test(g.category))
        .filter((g) => !isHiddenCitationFinding(g.category, g.issue)),
    },

    pages: {
      has: (cp?.key_pages?.length ?? 0) > 0 || affected.length > 0 || (crawl?.geo_readiness_issues?.length ?? 0) > 0,
      totalCrawled: crawl?.total_pages_crawled ?? 0,
      keyPages: cp?.key_pages ?? [],
      affected,
      issues: crawl?.geo_readiness_issues ?? [],
    },

    actions: {
      has: actions.length > 0,
      list: sortedActions,
      quadrant: sortedActions,
      top3: r?.gap_report?.top_3_priorities ?? [],
      quickWinCount: actions.filter((a) => a.type === "Quick win").length,
    },

    roadmap: {
      has: !!r?.detailed_playbook,
      playbookMarkdown: customerReportMarkdown(r?.detailed_playbook),
    },

    report: {
      hasExecutive: !!r?.executive_report,
      executiveMarkdown: customerReportMarkdown(r?.executive_report),
      hasPlaybook: !!r?.detailed_playbook,
      playbookMarkdown: customerReportMarkdown(r?.detailed_playbook),
      topRecommendations: (r?.top_recommendations ?? [])
        .filter((item) => !isHiddenCitationFinding(item))
        .map((item) => customerReportCopy(item, ""))
        .filter(Boolean),
    },

    methodology,
  };
}
