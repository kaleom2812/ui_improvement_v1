// Shared TypeScript types matching the Python pipeline models
export interface AuditReport {
  audit_id: string;
  organization_name: string;
  website_url: string;
  industry: string;
  generated_at: string;
  headline_finding: string;
  current_visibility_level: string;
  top_recommendations: string[];
  citation_source_breakdown: Record<string, number>;

  geo_score?: GEOScore;
  crawl_result?: CrawlResult;
  gap_report?: GapReport;
  search_discovery?: SearchDiscoveryResult;
  execution_batch?: ExecutionBatch;
  company_profile?: CompanyProfile;
  report_summary?: ReportSummary;
  executive_report?: string;
  detailed_playbook?: string;
}

export interface ReportSummary {
  citation_visibility?: import("./citationVisibility").VerifiedCitationVisibility;
  profile_discovery?: {
    scoring_eligible: false;
    validation: { status: string; agreement_ratio: number; rule: string; limitation: string; measurement_blocker?: string };
    batch: { responses: Array<{ prompt_text: string; provider: string; model_used: string; initial_response?: string | null; raw_response: string; status: string; error?: string }> };
  } | null;
  header: ReportHeader;
  executive_summary: ExecutiveSummary;
  score_breakdown: {
    total_score: number | null;
    sum_weighted_score: number;
    components: ReportScoreComponent[];
  };
  ai_visibility: AIVisibilitySummary;
  prompt_explorer: PromptEvidence[];
  competitor_intelligence: CompetitorIntelligence;
  citations: CitationSummary;
  content_analysis: ContentAnalysisSummary;
  action_center: ActionItem[];
  methodology: MethodologySummary;
  score_pillars?: {
    ai_performance: { status: string; score: number | null; reason: string };
    website_readiness: { status: string; score: number | null; reason: string };
  };
  top_priorities?: ActionItem[];
  roadmap_90_days?: Record<"0_30_days" | "30_60_days" | "60_90_days", ActionItem[]>;
  opportunity_summary?: Record<string, ActionItem | null>;
}

export interface ReportHeader {
  organization: string;
  domain: string;
  website_url: string;
  audit_date: string;
  geo_score: number | null;
  score_status?: string;
  audit_confidence?: AuditConfidence;
  pages_analyzed: number;
  prompts_tested: number;
  responses_analyzed: number;
  responses_failed?: number;
  providers: string[];
  models: string[];
}

export interface ExecutiveSummary {
  answer: string;
  geo_score: number | null;
  mention_rate: number | null;
  citation_rate: number | null;
  prompts_mentioned: number;
  total_prompts: number;
  top_competitors: string[];
  pages_crawled: number;
  critical_issues: number;
  high_priority_opportunities: number;
  biggest_strength: string;
  biggest_weakness: string;
  top_recommended_action: string;
  top_priorities?: ActionItem[];
  audit_confidence?: AuditConfidence;
}

export interface AuditConfidence {
  level: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE" | "INCOMPLETE";
  reason: string;
  response_success_rate: number;
  crawl_success_rate: number;
}

export interface ReportScoreComponent {
  key: string;
  label: string;
  score: number;
  max_score: number;
  percentage: number;
  weight: number;
  raw_score: number;
  weighted_score: number;
  evidence: string;
}

export interface PromptCitation {
  domain: string;
  url?: string;
  citation_type?: string;
  supports_brand?: boolean;
}

export interface FollowUpEvidence {
  follow_up_prompt: string;
  response: string;
  status?: "success" | "failed" | "timeout" | "provider_error";
  error?: string;
  brand_mentioned?: boolean | null;
  brand_recommended?: boolean | null;
  competitors_mentioned?: string[];
  citation_status?: "measured" | "not_available" | "not_detected";
  citations?: PromptCitation[];
}

export interface PromptEvidence {
  scoring_eligible?: boolean;
  prompt_id: string;
  prompt: string;
  provider: string;
  model: string;
  response: string;
  initial_response?: string | null;
  measurement_scope?: "initial_response" | "legacy_unspecified";
  initial_brand_mentioned?: boolean | null;
  initial_brand_recommended?: boolean | null;
  follow_up_brand_mentioned?: boolean | null;
  follow_up_brand_recommended?: boolean | null;
  status?: "success" | "failed" | "timeout" | "provider_error";
  citation_status?: "measured" | "not_available" | "not_detected";
  citation_count?: number | null;
  brand_mentioned: boolean | null;
  brand_position: number | null;
  brand_sentiment: string | null;
  brand_recommended: boolean | null;
  competitors_mentioned: Array<{
    name: string;
    position: number;
    recommended: boolean;
    sentiment: string;
  }>;
  citations: PromptCitation[];
  follow_ups: FollowUpEvidence[];
  score_contribution: {
    visibility_evidence: number;
    recommendation_evidence: number;
    citation_evidence: number | null;
  } | null;
  error: string;
  error_details?: {
    provider: string;
    error_type: string;
    error_category: string;
    message: string;
    http_status_code?: number | null;
    request_id?: string;
  } | null;
  is_mock: boolean;
  cost_usd: number;
  latency_ms: number;
}

export interface CompetitorSummary {
  name: string;
  mention_count: number;
  mention_rate: number;
  prompts_where_mentioned: string[];
  prompt_ids: string[];
  prompts_where_brand_wins: string[];
  prompts_where_brand_loses: string[];
  share_of_ai_voice: number;
}

export interface CompetitorIntelligence {
  status?: "measured" | "not_measured";
  diagnostic?: string;
  audited_brand: string;
  brand_mentions: number;
  brand_share_of_ai_voice: number;
  top_ai_competitor: string;
  competitors: CompetitorSummary[];
  competitor_only_prompts: Array<{ prompt: string; competitors: string[] }>;
  brand_wins: Array<{ prompt: string; reason: string }>;
  competitive_content_opportunities: string[];
}

export interface CitationSummary {
  total_citations: number;
  citation_rate: number | null;
  status?: "measured" | "not_measured";
  eligible_responses?: number;
  unavailable_responses?: number;
  cited_domains: string[];
  cited_urls: string[];
  audited_domain_citations: PromptCitation[];
  competitor_citations: PromptCitation[];
  diagnostic: string;
}

export interface PageFinding {
  url: string;
  page_type: string;
  title: string;
  crawl_status: string;
  word_count: number;
  has_schema_markup: boolean;
  schema_types: string[];
  has_faq: boolean;
  has_llms_txt: boolean;
  robots_accessible: boolean;
  blocked_crawlers: string[];
  issues: string[];
  citation_readiness: string;
}

export interface ContentAnalysisSummary {
  pages: PageFinding[];
  site_summary?: {
    status?: "measured" | "not_measured";
    pages_attempted: number;
    pages_successful: number;
    pages_failed: number;
    pages_with_schema: number | null;
    citation_readiness: Record<"strong" | "moderate" | "weak", number> | null;
    diagnostic?: string;
  };
  top_problem_pages?: Array<PageFinding & { why_it_matters: string; recommended_fix: string; priority: string }>;
  best_pages_for_ai_visibility: PageFinding[];
  weak_pages: PageFinding[];
  missing_content_opportunities: string[];
  technical_blockers: string[];
  has_llms_txt: boolean;
}

export interface ActionItem {
  priority: string;
  category: string;
  problem: string;
  evidence: string;
  recommended_action: string;
  affected_urls: string[];
  expected_geo_impact: string;
  implementation_guidance: string;
  effort?: string;
  owner?: string;
  timeframe?: string;
  success_metric?: string;
}

export interface AIVisibilitySummary {
  diagnostic?: string;
  recommendation_rate?: number | null;
  measurement_scope?: "initial_response" | "legacy_unspecified";
  scope_note?: string;
  follow_up_visibility?: {
    attempted: number;
    successful: number;
    failed: number;
    brand_mentions: number;
    mention_rate: number | null;
    recommendation_rate: number | null;
  } | null;
  total_prompts: number;
  total_responses: number;
  brand_mentions: number;
  mention_rate: number | null;
  non_mention_rate: number | null;
  status?: "measured" | "not_measured";
  attempted?: number;
  successful?: number;
  failed?: number;
  average_prominence: number | null;
  sentiment_counts: Record<string, number>;
  competitor_mentions: CompetitorSummary[];
  citation_count: number;
  prompt_evidence: PromptEvidence[];
}

export interface MethodologySummary {
  provider_tested: string;
  model_tested: string;
  number_of_prompts: number;
  prompts_attempted?: number;
  responses_successful?: number;
  responses_failed?: number;
  citation_responses_eligible?: number;
  citation_responses_unavailable?: number;
  number_of_responses: number;
  pages_crawled: number;
  pages_attempted?: number;
  pages_successfully_crawled?: number;
  audit_timestamp: string;
  scoring_methodology: string;
  sampling_note: string;
  limitations?: string;
  profile_source?: string;
  category_source?: string;
  category_confidence?: number | null;
  prompt_strategy?: string;
  measurement_valid?: boolean;
  profile_diagnostic?: string;
}

export interface CompanyProfile {
  company_name: string;
  domain: string;
  description: string;
  industry: string;
  company_type: string;
  primary_category: string;
  products_services: string[];
  target_customer: string;
  location_relevance: string;
  education_business: boolean;
  local_business: boolean;
  products: string[];
  services: string[];
  target_audience: string[];
  locations: string[];
  key_pages: Array<{ type: string; url: string; title: string }>;
  detected_topics: string[];
  competitors: Array<{ name: string; domain?: string; reason?: string }>;
  profile_source?: string;
  category_source?: string;
  category_confidence?: number | null;
  prompt_strategy?: string;
}

export interface GEOScore {
  audit_id: string;
  organization_name: string;
  total_score: number | null;
  score_status: string;
  ai_visibility_available: boolean;
  mention_rate: number | null;
  mention_rate_ci_low: number;
  mention_rate_ci_high: number;
  ai_share_of_voice: number | null;
  recommendation_rate: number | null;
  citation_authority: number | null;
  competitive_position: number | null;
  brand_sentiment: number | null;
  website_geo_readiness: number | null;
  entity_consistency: number | null;
  sample_size: number;           // was total_responses
  total_prompts_tested: number;
  total_provider_runs: number;
  brand_mention_count: number;
  brand_recommendation_count: number;
  score_components: ScoreComponent[];  // was components
  per_provider_mention_rate: Record<string, number>;
  scored_at: string;
}

export interface ScoreComponent {
  name: string;
  weight: number;
  raw_score: number;         // 0-100
  weighted_score: number;
  explanation: string;
}

export interface CrawlResult {
  website_url: string;
  total_pages_crawled: number;
  pages_attempted?: number;
  pages_successful?: number;
  crawl_evidence_available?: boolean | null;
  crawl_error_summary?: string;
  geo_readiness_score: number | null;
  geo_readiness_issues: string[];
  extracted_brand_name: string;
  extracted_products: string[];
  extracted_locations: string[];
}

export interface GapReport {
  gaps: Gap[];
  top_3_priorities: string[];
}

export interface Gap {
  gap_id: string;
  issue: string;           // was title
  severity: string;
  category: string;
  evidence: string;
  recommended_action: string;
  estimated_effort: string;
  pages_affected?: string[];
  competitor_advantage: string;
}

export interface SearchDiscoveryResult {
  enabled: boolean;
  queries_run: number;
  queries_with_ai_overview: number;
  brand_in_ai_overview_count: number;
  ai_overview_brand_rate: number;
  brand_in_featured_snippet_count: number;
  brand_has_knowledge_panel: boolean;
  brand_in_paa_count: number;
  avg_organic_rank: number | null;
}

export interface ExecutionBatch {
  responses: AIResponse[];
  total_cost_usd: number;
  providers_used: string[];
}

export interface AIResponse {
  provider: string;
  model_used: string;
  prompt_text: string;
  raw_response: string;
  is_mock: boolean;
  token_cost_usd: number;
}

// Utility types
export type VisibilityLevel = "Very Low" | "Low" | "Moderate" | "Good" | "Strong";
export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export function severityToBadge(severity: string): string {
  const s = severity.toUpperCase();
  if (s === "P0" || s === "CRITICAL") return "p0";
  if (s === "P1" || s === "HIGH")     return "p1";
  if (s === "P2" || s === "MEDIUM")   return "p2";
  if (s === "P3" || s === "LOW")      return "p3";
  return "p3";
}

export function severityLabel(severity: string): string {
  const s = severity.toUpperCase();
  if (s === "P0" || s === "CRITICAL") return "P0";
  if (s === "P1" || s === "HIGH")     return "P1";
  if (s === "P2" || s === "MEDIUM")   return "P2";
  if (s === "P3" || s === "LOW")      return "P3";
  return severity.toUpperCase();
}

export function visibilityClass(level: string): string {
  const l = level.toLowerCase().replace(/\s/g, "");
  if (l === "verylow")  return "verylow";
  if (l === "low")      return "low";
  if (l === "moderate") return "moderate";
  if (l === "good")     return "good";
  if (l === "strong")   return "strong";
  return "verylow";
}

export function scoreColor(score: number): string {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "good";
  return "strong";
}

export function componentDisplayName(name: string): string {
  const map: Record<string, string> = {
    mention_rate:          "Mention Rate",
    ai_share_of_voice:     "AI Share of Voice",
    recommendation_rate:   "Recommendation Rate",
    citation_authority:    "Citation Authority",
    competitive_position:  "Competitive Position",
    brand_sentiment:       "Brand Sentiment",
    website_geo_readiness: "GEO Readiness",
    entity_consistency:    "Entity Consistency",
  };
  return map[name] ?? name;
}
