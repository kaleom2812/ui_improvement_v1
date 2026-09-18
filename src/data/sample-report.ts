/**
 * ILLUSTRATIVE SAMPLE — marketing pages only.
 *
 * These numbers describe a fictional example brand and are used purely to
 * populate the sample charts on the marketing site (Home, Product). They are
 * NEVER rendered inside the audit flow, the report or the dashboard — those
 * surfaces consume live AuditReport data via src/lib/adapter.ts.
 *
 * If you prefer the marketing site to show no example figures at all, delete
 * this file and the components that import it will fall back to copy only.
 */

export const sampleBrand = "Example brand";

export const sampleScore = {
  overall: 61,
  delta: 6,
  grade: "C+",
  projected90: 76,
};

export const sampleDimensions = [
  { key: "mention_rate", label: "AI Visibility", score: 55 },
  { key: "ai_share_of_voice", label: "Brand Prominence", score: 51 },
  { key: "recommendation_rate", label: "Recommendation Performance", score: 46 },
  { key: "competitive_position", label: "Competitive Position", score: 41 },
  { key: "brand_sentiment", label: "Authority & Trust", score: 53 },
  { key: "website_geo_readiness", label: "Technical GEO", score: 80 },
  { key: "entity_consistency", label: "Entity Consistency", score: 69 },
];

export const sampleAiPresence = 0.31;

/**
 * A few additional illustrative figures for the hero's ambient metric cards
 * (src/components/marketing/AmbientMetricCards.tsx). Same rules as above —
 * marketing-only, never rendered inside the real audit/report/dashboard.
 */
export const sampleCitationRate = 24;
export const sampleAnswerability = 58;
export const sampleDiscoverability = 72;
export const sampleAiMentions = 143;
export const sampleQueriesAnalyzed = 1280;

export const sampleBenchmark = [
  { name: "Market leader", value: 78 },
  { name: "Challenger", value: 71 },
  { name: "Mid-market", value: 52 },
  { name: "Example brand", value: 31, self: true },
  { name: "Newcomer", value: 26 },
];

export const sampleShareOfVoice = [
  { name: "Market leader", value: 34 },
  { name: "Challenger", value: 24 },
  { name: "Mid-market", value: 14 },
  { name: "Example brand", value: 9, self: true },
  { name: "Newcomer", value: 8 },
  { name: "Others", value: 11 },
];

export const samplePagePriorities = [
  { name: "Pricing", value: 18 },
  { name: "Product overview", value: 15 },
  { name: "Comparisons", value: 12 },
  { name: "Use cases", value: 9 },
  { name: "FAQ", value: 6 },
];

export const sampleActions = [
  { id: 1, title: "Unblock AI crawlers in robots.txt", type: "Quick win" },
  { id: 2, title: "Publish llms.txt at the domain root", type: "Quick win" },
  { id: 3, title: "Ship complete Organization schema", type: "Quick win" },
  { id: 4, title: "Server-render the pricing table", type: "Project" },
];

export const sampleTechnicalChecks = [
  { check: "AI crawler access", score: 55, status: "fail" as const },
  { check: "Rendering / JS dependency", score: 61, status: "warn" as const },
  { check: "Core Web Vitals", score: 88, status: "pass" as const },
  { check: "Structured-data coverage", score: 34, status: "fail" as const },
  { check: "Mobile parity", score: 92, status: "pass" as const },
];

export const sampleMethodologyIntro =
  "phazeAi measures how large language models and AI answer engines perceive and represent a brand. It combines live model probing with a technical crawl.";

export const sampleMethodologyItems = [
  { label: "Prompts", value: "Buyer-intent prompts derived from keyword research and interviews" },
  { label: "Models", value: "The AI engines the audit backend is configured to run" },
  { label: "Runs", value: "Each prompt run multiple times per model and aggregated" },
  { label: "Crawl", value: "Your site fetched both rendered and raw-HTML" },
  { label: "Scoring", value: "Weighted dimensions, 0–100, calibrated against a benchmark set" },
];
