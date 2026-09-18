import { describe, expect, it } from "vitest";
import { buildViewModel, type ExtendedAuditReport } from "./adapter";

// A realistic AuditReport shaped exactly like what
// geo-dashboard/src/app/api/audit/[id]/route.ts returns (including the fields it
// injects: geo_score.citations_by_engine, geo_score.share_of_voice, queries[]).
const fixture: ExtendedAuditReport = {
  audit_id: "GEO-TEST-1",
  organization_name: "Acme CRM",
  website_url: "https://acme.example",
  industry: "B2B SaaS",
  generated_at: "2026-09-03T12:00:00Z",
  headline_finding: "Acme is nearly invisible in AI answers.",
  current_visibility_level: "Low",
  top_recommendations: ["Unblock GPTBot", "Publish llms.txt"],
  citation_source_breakdown: { "g2.com": 40, "acme.example": 6, "reddit.com": 20 },
  geo_score: {
    audit_id: "GEO-TEST-1",
    organization_name: "Acme CRM",
    total_score: 61,
    score_status: "complete",
    ai_visibility_available: true,
    mention_rate: 31.2,
    mention_rate_ci_low: 25.1,
    mention_rate_ci_high: 37.3,
    ai_share_of_voice: 9.4,
    recommendation_rate: 12.5,
    citation_authority: 40,
    competitive_position: 41,
    brand_sentiment: 0.32,
    website_geo_readiness: 80,
    entity_consistency: 69,
    sample_size: 300,
    total_prompts_tested: 60,
    total_provider_runs: 180,
    brand_mention_count: 94,
    brand_recommendation_count: 15,
    score_components: [
      { name: "mention_rate", weight: 0.18, raw_score: 55, weighted_score: 9.9, explanation: "Present in 31% of answers." },
      { name: "website_geo_readiness", weight: 0.14, raw_score: 80, weighted_score: 11.2, explanation: "Fast, mobile-friendly." },
    ],
    per_provider_mention_rate: { openai: 37, gemini: 23, claude: 42, mock: 100 },
    scored_at: "2026-09-03T12:00:00Z",
    citations_by_engine: { chatgpt: 37, gemini: 23, claude: 42, mock: 100 },
    share_of_voice: 9.4,
  },
  crawl_result: {
    website_url: "https://acme.example",
    total_pages_crawled: 214,
    geo_readiness_score: 72,
    geo_readiness_issues: ["robots.txt blocks GPTBot", "No llms.txt"],
    extracted_brand_name: "Acme CRM",
    extracted_products: ["Pipelines"],
    extracted_locations: ["Denver"],
    homepage: { blocked_crawlers: ["GPTBot"] },
  },
  gap_report: {
    gaps: [
      {
        gap_id: "g1",
        issue: "GPTBot is blocked in robots.txt",
        severity: "CRITICAL",
        category: "Technical GEO",
        evidence: "User-agent: GPTBot / Disallow: /",
        recommended_action: "Remove the disallow; add explicit allows.",
        estimated_effort: "1-2 hours",
        competitor_advantage: "Competitors are all crawlable.",
      },
      {
        gap_id: "g2",
        issue: "No comparison pages",
        severity: "MEDIUM",
        category: "AI Visibility",
        evidence: "0 of 5 competitors have a comparison page.",
        recommended_action: "Build 3 comparison pages.",
        estimated_effort: "2 weeks",
        competitor_advantage: "",
      },
    ],
    top_3_priorities: ["g1"],
  },
  execution_batch: { responses: [], total_cost_usd: 0.12, providers_used: ["openai", "claude", "gemini"] },
  company_profile: {
    company_name: "Acme CRM",
    domain: "acme.example",
    description: "CRM for mid-market teams.",
    industry: "B2B SaaS",
    company_type: "software_company",
    primary_category: "CRM software",
    products_services: ["Pipelines", "Sequences"],
    target_customer: "Mid-market sales teams",
    location_relevance: "regional",
    education_business: false,
    local_business: false,
    products: ["Pipelines", "Sequences"],
    services: [],
    target_audience: ["Sales teams"],
    locations: ["Denver"],
    key_pages: [{ type: "Pricing", url: "https://acme.example/pricing", title: "Pricing" }],
    detected_topics: ["CRM"],
    competitors: [
      { name: "HubSpot", domain: "hubspot.com", reason: "Category leader" },
      { name: "Pipedrive", domain: "pipedrive.com" },
    ],
  },
  executive_report: "# Executive summary\n\nAcme is losing the AI answer layer.",
  detailed_playbook: "# 90-day plan\n\n## Phase 1\n\nUnblock crawlers.",
  llms_txt: "# Acme CRM\n\n> CRM for mid-market teams.",
  queries: [
    {
      prompt: "best CRM for a small team?",
      engine: "openai",
      is_mentioned: false,
      is_cited: false,
      snippet: "The usual picks are HubSpot, Pipedrive...",
      full_response: "The usual picks are HubSpot, Pipedrive, and Close.",
      sources: [{ title: "g2", url: "https://g2.com/best-crm" }],
      position: null,
      sentiment: "",
    },
    {
      prompt: "Acme CRM review",
      engine: "claude",
      is_mentioned: true,
      is_cited: true,
      snippet: "Acme CRM is a solid mid-market option...",
      full_response: "Acme CRM is a solid mid-market option with good sequencing.",
      sources: [{ title: "acme", url: "https://acme.example/blog/metrics" }],
      position: 1,
      sentiment: "positive",
    },
  ],
};

describe("buildViewModel", () => {
  it("maps an idle state cleanly", () => {
    const vm = buildViewModel(null, "idle");
    expect(vm.hasReport).toBe(false);
    expect(vm.score.has).toBe(false);
    expect(vm.dimensions).toEqual([]);
    expect(vm.headlineMetrics).toEqual([]);
  });

  it("maps the core score + dimensions from geo_score", () => {
    const vm = buildViewModel(fixture, "complete");
    expect(vm.score.overall).toBe(72);
    expect(vm.score.rating).toBe("GOOD");
    expect(vm.score.presentation).toBe("GOOD");
    expect(vm.score.grade).toBe("B");
    expect(vm.brand).toBe("Acme CRM");
    expect(vm.domain).toBe("acme.example");
    expect(vm.hasDimensions).toBe(true);
    expect(vm.dimensions[0]).toMatchObject({ key: "mention_rate", label: "Mention Rate", score: 55 });
  });

  it("uses valid readiness when the weighted AI score is incomplete", () => {
    const readinessOnly = buildViewModel(
      {
        ...fixture,
        geo_score: { ...fixture.geo_score!, total_score: null, score_status: "incomplete" },
      },
      "incomplete",
    );
    expect(readinessOnly.score.has).toBe(true);
    expect(readinessOnly.score.overallExact).toBe(72);
    expect(readinessOnly.score.presentation).toBe("GOOD");
    expect(readinessOnly.headline).toMatch(/^Acme CRM has a Good GEO rating\./);
    expect(readinessOnly.headline).not.toMatch(/audit incomplete|reliable overall GEO score/i);
  });

  it("uses the limited-data headline only when no report evidence exists", () => {
    const unavailable = buildViewModel(
      { ...fixture, geo_score: undefined, crawl_result: undefined },
      "complete",
    );
    expect(unavailable.score.has).toBe(true);
    expect(unavailable.score.presentation).toBe("LOW");
    expect(unavailable.score.source).toBe("limited_data_fallback");
    expect(unavailable.score.dataConfidence).toBe("Limited");
    expect(unavailable.score.numericAvailable).toBe(false);
  });

  it("uses measured AI visibility as the headline fallback when readiness is unavailable", () => {
    const aiFallback = buildViewModel({
      ...fixture,
      crawl_result: undefined,
      geo_score: {
        ...fixture.geo_score!,
        website_geo_readiness: null,
        mention_rate: 80,
        ai_share_of_voice: 25,
        share_of_voice: 25,
        recommendation_rate: 0,
        score_components: fixture.geo_score!.score_components.filter(
          (component) => component.name !== "website_geo_readiness",
        ),
      },
    });
    expect(aiFallback.score).toMatchObject({
      overallExact: 48,
      presentation: "MODERATE",
      source: "ai_visibility_fallback",
    });
    expect(aiFallback.headlineMetrics.slice(0, 3).map((metric) => metric.value)).toEqual([
      "80.0%",
      "25.0%",
      "0.0%",
    ]);
  });

  it("uses existing technical component scores without promoting unavailable AI metrics", () => {
    const technicalFallback = buildViewModel({
      ...fixture,
      crawl_result: undefined,
      geo_score: {
        ...fixture.geo_score!,
        ai_visibility_available: false,
        website_geo_readiness: null,
        mention_rate: null,
        ai_share_of_voice: null,
        recommendation_rate: null,
        score_components: [
          { name: "page_content_quality", weight: 0.75, raw_score: 80, weighted_score: 60, explanation: "Measured page quality." },
          { name: "schema_coverage", weight: 0.25, raw_score: 20, weighted_score: 5, explanation: "Measured schema coverage." },
        ],
      },
    });
    expect(technicalFallback.score).toMatchObject({
      overallExact: 65,
      presentation: "GOOD",
      source: "technical_fallback",
    });
    expect(technicalFallback.headlineMetrics.slice(0, 3).map((metric) => metric.value)).toEqual([
      "Limited data",
      "Not measured",
      "Limited data",
    ]);
  });

  it("preserves true AI zeroes and does not fabricate unavailable AI metrics", () => {
    const measuredZero = buildViewModel({
      ...fixture,
      geo_score: {
        ...fixture.geo_score!,
        mention_rate: 0,
        recommendation_rate: 0,
        ai_share_of_voice: 0,
        share_of_voice: 0,
      },
    });
    expect(measuredZero.headlineMetrics.slice(0, 3).map((metric) => metric.value)).toEqual([
      "0.0%",
      "0.0%",
      "0.0%",
    ]);

    const unavailable = buildViewModel({
      ...fixture,
      geo_score: {
        ...fixture.geo_score!,
        ai_visibility_available: false,
        mention_rate: null,
        recommendation_rate: null,
        ai_share_of_voice: null,
        share_of_voice: undefined,
      },
    });
    expect(unavailable.headlineMetrics.slice(0, 3).map((metric) => metric.value)).toEqual([
      "Limited data",
      "Not measured",
      "Limited data",
    ]);
    expect(unavailable.headline).toContain("AI visibility metrics will be reported separately");
  });

  it("derives per-model presence and excludes the mock provider", () => {
    const vm = buildViewModel(fixture, "complete");
    const keys = vm.aiVisibility.models.map((m) => m.key);
    expect(keys).toContain("openai");
    expect(keys).toContain("claude");
    expect(keys).not.toContain("mock");
    expect(vm.aiVisibility.models[0].label).toBe("Claude"); // sorted by presence desc (42)
  });

  it("maps queries -> prompt evidence with derived outcomes", () => {
    const vm = buildViewModel(fixture, "complete");
    expect(vm.prompts.has).toBe(true);
    expect(vm.prompts.list[0].outcome).toBe("absent");
    expect(vm.prompts.list[1].outcome).toBe("cited");
    expect(vm.prompts.absentCount).toBe(1);
    expect(vm.prompts.citedCount).toBe(1);
  });

  it("maps gaps -> ranked actions with impact/effort", () => {
    const vm = buildViewModel(fixture, "complete");
    expect(vm.actions.has).toBe(true);
    expect(vm.actions.list[0].title).toBe("GPTBot is blocked in robots.txt");
    expect(vm.actions.list[0].impact).toBe(5); // CRITICAL
    expect(vm.actions.list[0].effort).toBe(1); // "1-2 hours"
    expect(vm.actions.list[0].type).toBe("Quick win");
    expect(vm.actions.quickWinCount).toBe(1);
  });

  it("builds the crawler table and picks up blocked bots", () => {
    const vm = buildViewModel(fixture, "complete");
    const gptbot = vm.technical.crawlerTable.find((c) => c.bot === "GPTBot");
    expect(gptbot?.blocked).toBe(true);
    expect(vm.technical.hasLlmsTxt).toBe(true);
  });

  it("derives citation domains, brand share and cited pages", () => {
    const vm = buildViewModel(fixture, "complete");
    expect(vm.citations.has).toBe(true);
    expect(vm.citations.topDomains[0].domain).toBe("g2.com");
    const self = vm.citations.topDomains.find((d) => d.self);
    expect(self?.domain).toBe("acme.example");
    expect(vm.citations.citedPages[0].page).toBe("/blog/metrics");
  });

  it("carries competitors as names only (no fabricated metrics)", () => {
    const vm = buildViewModel(fixture, "complete");
    expect(vm.competitors.has).toBe(true);
    expect(vm.competitors.list.map((c) => c.name)).toEqual(["HubSpot", "Pipedrive"]);
    expect(vm.competitors.brandShareOfVoice).toBe(9.4);
  });

  it("exposes the narrative markdown untouched", () => {
    const vm = buildViewModel(fixture, "complete");
    expect(vm.report.hasExecutive).toBe(true);
    expect(vm.report.executiveMarkdown).toContain("# Executive summary");
    expect(vm.roadmap.has).toBe(true);
  });

  // Stage 2 (server-side free preview): GET /api/audit/{id} now returns this
  // trimmed shape — not the full AuditReport — to an unpaid/anonymous caller
  // (see geo_pipeline/api.py::_free_preview). No frontend change was needed
  // to consume it: adapter.ts already defaults every field defensively, so a
  // preview renders the free sections normally and every paid section's
  // `has` flag comes back false (its EmptyState, not a crash) — this test is
  // the proof for that claim.
  it("renders a server-side free preview (no paid fields) without crashing", () => {
    // Deliberately partial, cast as unknown -> ExtendedAuditReport: this
    // literal is exactly the shape geo_pipeline/api.py::_free_preview sends
    // (real free fields, paid fields genuinely absent rather than typed
    // optional), which necessarily doesn't satisfy the full type.
    const preview = {
      audit_id: "GEO-PREVIEW-1",
      organization_name: "Acme CRM",
      website_url: "https://acme.example",
      industry: "B2B SaaS",
      generated_at: "2026-09-03T12:00:00Z",
      headline_finding: "Acme is nearly invisible in AI answers.",
      current_visibility_level: "Low",
      executive_report: "# Executive summary\n\nAcme is losing the AI answer layer.",
      geo_score: {
        audit_id: "GEO-PREVIEW-1",
        organization_name: "Acme CRM",
        total_score: 61,
        mention_rate: 31.2,
        ai_share_of_voice: 9.4,
        recommendation_rate: 12.5,
        sample_size: 300,
        total_prompts_tested: 60,
        total_provider_runs: 180,
        brand_recommendation_count: 15,
        score_components: [
          { name: "mention_rate", weight: 0.18, raw_score: 55, weighted_score: 9.9, explanation: "Present in 31% of answers." },
        ],
        scored_at: "2026-09-03T12:00:00Z",
        // Deliberately absent (paid, stripped server-side): per_provider_mention_rate,
        // mention_rate_ci_low/high, citations_by_engine, brand_sentiment.
      },
      company_profile: {
        company_name: "Acme CRM",
        domain: "acme.example",
        industry: "B2B SaaS",
        // Deliberately absent: description, products, services, target_audience,
        // locations, key_pages, detected_topics, competitors.
      },
      crawl_result: {
        geo_readiness_score: 72,
        total_pages_crawled: 214,
        // Deliberately absent: homepage, geo_readiness_issues, extracted_*.
      },
      gap_report: {
        gaps: [
          {
            gap_id: "g1",
            issue: "GPTBot is blocked in robots.txt",
            severity: "CRITICAL",
            category: "Technical GEO",
            evidence: "User-agent: GPTBot / Disallow: /",
            recommended_action: "Remove the disallow; add explicit allows.",
            estimated_effort: "1-2 hours",
            competitor_advantage: "Competitors are all crawlable.",
          },
        ],
        top_3_priorities: ["g1"],
      },
      execution_batch: { responses: [], providers_used: ["openai", "claude"] },
      // Deliberately absent entirely (paid): detailed_playbook, citation_source_breakdown,
      // top_recommendations, llms_txt, queries.
    } as unknown as ExtendedAuditReport;

    const vm = buildViewModel(preview, "complete");

    // Free sections render with real data.
    expect(vm.hasReport).toBe(true);
    expect(vm.score.overall).toBe(72);
    expect(vm.hasDimensions).toBe(true);
    expect(vm.dimensions[0].key).toBe("mention_rate");
    expect(vm.report.hasExecutive).toBe(true);
    expect(vm.headlineMetrics.length).toBeGreaterThan(0);
    expect(vm.actions.has).toBe(true);
    expect(vm.actions.list[0].title).toBe("GPTBot is blocked in robots.txt");

    // Paid sections have no data — PaywallGate renders their EmptyState,
    // never fabricated or leaked content.
    expect(vm.aiVisibility.models).toEqual([]);
    expect(vm.prompts.has).toBe(false);
    expect(vm.competitors.has).toBe(false);
    expect(vm.citations.has).toBe(false);
    expect(vm.roadmap.has).toBe(false);
    expect(vm.report.hasPlaybook).toBe(false);
  });
});
