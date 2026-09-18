import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { AuditReport, ReportSummary } from "@/lib/types";
import {
  buildJsonFilename,
  buildReportFilename,
  countTranscriptFollowUps,
  excerptPdfText,
  extractPrimaryAiEvidence,
  formatPdfUrl,
  pdfExportDiagnostic,
  PDF_PRIMARY_EVIDENCE_LIMIT,
  serializeReport,
} from "@/lib/reportExport";
import ReportPdfDocument from "./ReportPdfDocument";
import StructuredReportView from "./StructuredReportView";
import { citationCell, competitorCell, outcome, pageCells, simpleReport, visibilityExplanation } from "@/lib/simpleReport";

const report: ReportSummary = {
  header: {
    organization: "ExampleCo",
    domain: "example.com",
    website_url: "https://example.com",
    audit_date: "2026-08-27T10:00:00Z",
    geo_score: 45,
    pages_analyzed: 1,
    prompts_tested: 1,
    responses_analyzed: 1,
    providers: ["openai"],
    models: ["gpt-4o-mini"],
    audit_confidence: { level: "MEDIUM CONFIDENCE", reason: "Successful AI and crawl evidence was collected.", response_success_rate: 100, crawl_success_rate: 100 },
  },
  executive_summary: {
    answer: "ExampleCo appeared in one sampled response.",
    geo_score: 45,
    mention_rate: 100,
    citation_rate: 0,
    prompts_mentioned: 1,
    total_prompts: 1,
    top_competitors: ["Real Rival"],
    pages_crawled: 1,
    critical_issues: 0,
    high_priority_opportunities: 1,
    biggest_strength: "The brand was visible in the sampled answer.",
    biggest_weakness: "No comparison page was found in the crawl sample.",
    top_recommended_action: "Publish a product comparison page.",
  },
  score_breakdown: {
    total_score: 45,
    sum_weighted_score: 45,
    components: [{ key: "mention_rate", label: "AI Visibility", score: 20, max_score: 20, percentage: 100, weight: 0.2, raw_score: 100, weighted_score: 20, evidence: "1/1 response mentioned ExampleCo." }],
  },
  score_pillars: {
    ai_performance: { status: "measured", score: 45, reason: "Based on successful AI responses." },
    website_readiness: { status: "measured", score: 75, reason: "Based on successfully crawled pages." },
  },
  ai_visibility: {
    total_prompts: 1,
    total_responses: 1,
    brand_mentions: 1,
    mention_rate: 100,
    non_mention_rate: 0,
    average_prominence: 1,
    sentiment_counts: { positive: 1, neutral: 0, negative: 0 },
    competitor_mentions: [],
    citation_count: 0,
    prompt_evidence: [],
  },
  prompt_explorer: [{
    prompt_id: "p1",
    prompt: "Which CRM is useful?",
    provider: "openai",
    model: "gpt-4o-mini",
    response: "ExampleCo is a useful CRM for small teams.",
    brand_mentioned: true,
    brand_position: 1,
    brand_sentiment: "positive",
    brand_recommended: true,
    competitors_mentioned: [{ name: "Real Rival", position: 2, recommended: false, sentiment: "neutral" }],
    citations: [],
    citation_status: "not_detected",
    citation_count: 0,
    follow_ups: [],
    score_contribution: { visibility_evidence: 1, recommendation_evidence: 1, citation_evidence: 0 },
    error: "",
    is_mock: false,
    cost_usd: 0.001,
    latency_ms: 100,
  }],
  competitor_intelligence: {
    audited_brand: "ExampleCo",
    brand_mentions: 1,
    brand_share_of_ai_voice: 50,
    top_ai_competitor: "Real Rival",
    competitors: [{ name: "Real Rival", mention_count: 1, mention_rate: 100, prompts_where_mentioned: ["Which CRM is useful?"], prompt_ids: ["p1"], prompts_where_brand_wins: ["Which CRM is useful?"], prompts_where_brand_loses: [], share_of_ai_voice: 50 }],
    competitor_only_prompts: [],
    brand_wins: [{ prompt: "Which CRM is useful?", reason: "ExampleCo appeared first." }],
    competitive_content_opportunities: [],
  },
  citations: {
    total_citations: 0,
    citation_rate: 0,
    status: "measured",
    eligible_responses: 1,
    unavailable_responses: 0,
    cited_domains: [],
    cited_urls: [],
    audited_domain_citations: [],
    competitor_citations: [],
    diagnostic: "No citations were detected in the sampled AI responses.",
  },
  content_analysis: {
    pages: [{ url: "https://example.com", page_type: "Homepage", title: "ExampleCo", crawl_status: "Crawled", word_count: 500, has_schema_markup: true, schema_types: ["Organization"], has_faq: false, has_llms_txt: false, robots_accessible: true, blocked_crawlers: [], issues: [], citation_readiness: "Strong" }],
    best_pages_for_ai_visibility: [],
    weak_pages: [],
    missing_content_opportunities: [],
    technical_blockers: [],
    has_llms_txt: false,
  },
  action_center: [{ priority: "High", category: "Content", problem: "No comparison page found", evidence: "No comparison page was found in the crawl sample.", recommended_action: "Publish a product comparison page.", affected_urls: ["https://example.com"], expected_geo_impact: "Improves AI understanding of product differences.", implementation_guidance: "Publish a clearly structured comparison page.", effort: "Low", timeframe: "1 day" }],
  methodology: { provider_tested: "openai", model_tested: "gpt-4o-mini", number_of_prompts: 1, number_of_responses: 1, citation_responses_eligible: 1, citation_responses_unavailable: 0, pages_crawled: 1, audit_timestamp: "2026-08-27T10:00:00Z", scoring_methodology: "Weighted evidence-based scoring.", sampling_note: "Results are a sample." },
};

const data = {
  audit_id: "audit-1",
  organization_name: "ExampleCo",
  website_url: "https://example.com",
  industry: "saas",
  generated_at: "2026-08-27T10:00:00Z",
  headline_finding: "",
  current_visibility_level: "Moderate",
  top_recommendations: [],
  citation_source_breakdown: {},
  geo_score: { recommendation_rate: 100 } as AuditReport["geo_score"],
  report_summary: report,
} satisfies AuditReport;

const incompleteReport: ReportSummary = {
  ...report,
  header: {
    ...report.header,
    geo_score: null,
    score_status: "incomplete",
    responses_analyzed: 0,
    responses_failed: 5,
    audit_confidence: { level: "INCOMPLETE", reason: "0 of 5 OpenAI requests completed successfully. Website analysis completed, but AI visibility could not be measured.", response_success_rate: 0, crawl_success_rate: 100 },
  },
  executive_summary: {
    ...report.executive_summary,
    answer: "AI response collection failed, so visibility metrics could not be measured reliably.",
    geo_score: null,
    mention_rate: null,
    citation_rate: null,
    prompts_mentioned: 0,
    total_prompts: 0,
    top_competitors: [],
    biggest_strength: "Website analysis completed across 20 pages.",
    biggest_weakness: "AI visibility could not be measured because every provider request failed.",
    top_recommended_action: "Add structured entity data to applicable primary pages.",
  },
  score_breakdown: {
    total_score: null,
    sum_weighted_score: 0,
    components: [{ key: "website_geo_readiness", label: "Website GEO Readiness", score: 85, max_score: 100, percentage: 85, weight: 1, raw_score: 85, weighted_score: 85, evidence: "Website analysis completed across 20 pages." }],
  },
  score_pillars: {
    ai_performance: { status: "not_measured", score: null, reason: "5/5 provider requests failed." },
    website_readiness: { status: "measured", score: 85, reason: "Based on 20 successfully crawled pages." },
  },
  ai_visibility: { ...report.ai_visibility, status: "not_measured", attempted: 5, successful: 0, failed: 5, total_responses: 0, brand_mentions: 0, mention_rate: null, non_mention_rate: null },
  prompt_explorer: Array.from({ length: 5 }, (_, index) => ({ ...report.prompt_explorer[0], prompt_id: `failed-${index}`, status: "provider_error", response: "Error", brand_mentioned: null, brand_recommended: null, brand_position: null, brand_sentiment: null, competitors_mentioned: [], citations: [], citation_status: "not_available", citation_count: null, score_contribution: null, error: "Connection error." })),
  competitor_intelligence: { ...report.competitor_intelligence, status: "not_measured", diagnostic: "Competitive visibility not measured because no successful AI responses were collected.", competitors: [], brand_share_of_ai_voice: 0 },
  citations: { ...report.citations, status: "not_measured", citation_rate: null, eligible_responses: 0, unavailable_responses: 0, diagnostic: "Citation performance was not measured because AI response collection failed." },
  content_analysis: { ...report.content_analysis, site_summary: { pages_attempted: 20, pages_successful: 20, pages_failed: 0, pages_with_schema: 0, citation_readiness: { strong: 0, moderate: 20, weak: 0 } }, top_problem_pages: [] },
  methodology: { ...report.methodology, prompts_attempted: 5, responses_successful: 0, responses_failed: 5, citation_responses_eligible: 0, citation_responses_unavailable: 0, pages_attempted: 20, pages_successfully_crawled: 20, limitations: "AI response collection failed." },
  action_center: [{ ...report.action_center[0], category: "Technical", problem: "Structured data was not detected", evidence: "0/20 successfully crawled pages contained detected schema.", recommended_action: "Add Organization and applicable product schema.", affected_urls: ["https://example.com"], expected_geo_impact: "Clarifies the entity and product relationships for answer engines.", implementation_guidance: "Add and validate JSON-LD on primary templates.", owner: "Engineering / SEO", effort: "Low", timeframe: "1-2 days", success_metric: "Schema is detected on every applicable primary page." }],
  top_priorities: [{ ...report.action_center[0], category: "Technical", problem: "Structured data was not detected", evidence: "0/20 successfully crawled pages contained detected schema.", recommended_action: "Add Organization and applicable product schema.", affected_urls: ["https://example.com"], expected_geo_impact: "Clarifies the entity and product relationships for answer engines.", implementation_guidance: "Add and validate JSON-LD on primary templates.", owner: "Engineering / SEO", effort: "Low", timeframe: "1-2 days", success_metric: "Schema is detected on every applicable primary page." }],
  roadmap_90_days: { "0_30_days": [{ ...report.action_center[0], problem: "Structured data was not detected", recommended_action: "Add Organization and applicable product schema." }], "30_60_days": [], "60_90_days": [] },
  opportunity_summary: {},
};

const incompleteData: AuditReport = { ...data, report_summary: incompleteReport };

const citationUnavailableReport: ReportSummary = {
  ...report,
  executive_summary: { ...report.executive_summary, citation_rate: null, biggest_weakness: "Citation visibility was not measured because verifiable source metadata was unavailable." },
  prompt_explorer: report.prompt_explorer.map(prompt => ({ ...prompt, citation_status: "not_available", citation_count: null, citations: [], score_contribution: { ...prompt.score_contribution!, citation_evidence: null } })),
  citations: {
    ...report.citations,
    status: "not_measured",
    citation_rate: null,
    total_citations: 0,
    eligible_responses: 0,
    unavailable_responses: 1,
    diagnostic: "The selected AI provider did not expose verifiable citation/source metadata for these responses, so citation performance was not scored.",
  },
  action_center: [],
  top_priorities: [],
  roadmap_90_days: { "0_30_days": [], "30_60_days": [], "60_90_days": [] },
  methodology: { ...report.methodology, citation_responses_eligible: 0, citation_responses_unavailable: 1, scoring_methodology: "Citation-unavailable responses are excluded and available score components are proportionally reweighted." },
};

const citationUnavailableData: AuditReport = { ...data, report_summary: citationUnavailableReport };

describe("Simplified template integrity", () => {
  it.each([
    [20, "LOW"],
    [45, "MODERATE"],
    [60, "GOOD"],
    [80, "EXCELLENT"],
  ] as const)("uses website readiness %s for the headline %s rating", (readiness, rating) => {
    const readinessReport: ReportSummary = {
      ...report,
      header: { ...report.header, geo_score: 99, score_status: "complete" },
      score_pillars: {
        ...report.score_pillars!,
        website_readiness: { status: "measured", score: readiness, reason: "Crawl evidence." },
      },
    };
    render(<StructuredReportView data={{ ...data, report_summary: readinessReport }} />);
    expect(screen.getByText(rating)).toBeInTheDocument();
    expect(screen.getByText("Overall GEO Rating")).toBeInTheDocument();
    expect(screen.getByText(`Overall GEO Score: ${readiness}/100`)).toBeInTheDocument();
    expect(screen.queryByText("Overall GEO Score: 99/100")).not.toBeInTheDocument();
  });

  it("uses valid readiness when AI evidence is unavailable", () => {
    const contradictory = {
      ...incompleteData,
      report_summary: {
        ...incompleteData.report_summary!,
        executive_summary: {
          ...incompleteData.report_summary!.executive_summary,
          answer: "Audit incomplete -- AI visibility evidence was insufficient for a reliable overall GEO score.",
        },
      },
    };
    render(<StructuredReportView data={contradictory} />);
    expect(screen.getByText("EXCELLENT")).toBeInTheDocument();
    expect(screen.getByText("Overall GEO Score: 85/100")).toBeInTheDocument();
    expect(screen.getAllByText("Not measured").length).toBeGreaterThan(0);
    expect(screen.getByText(/ExampleCo has an Excellent GEO rating/)).toBeInTheDocument();
    expect(screen.queryByText(/Audit incomplete|reliable overall GEO score/i)).not.toBeInTheDocument();
    expect(screen.queryByText("LOW")).not.toBeInTheDocument();
  });

  it("preserves a measured zero AI mention rate independently of readiness", () => {
    const measuredZero: ReportSummary = {
      ...report,
      score_pillars: {
        ...report.score_pillars!,
        website_readiness: { status: "measured", score: 60, reason: "Crawl evidence." },
      },
      ai_visibility: {
        ...report.ai_visibility,
        status: "measured",
        brand_mentions: 0,
        mention_rate: 0,
        non_mention_rate: 100,
      },
    };
    render(<StructuredReportView data={{ ...data, report_summary: measuredZero }} />);
    expect(screen.getByText("GOOD")).toBeInTheDocument();
    expect(screen.getByText("Overall GEO Score: 60/100")).toBeInTheDocument();
    expect(screen.getByText("AI Mention Rate").parentElement).toHaveTextContent("0.0%");
  });

  it("uses measured AI visibility when crawl readiness is unavailable", () => {
    const notMeasured: ReportSummary = {
      ...report,
      header: { ...report.header, geo_score: null, score_status: "incomplete", pages_analyzed: 0 },
      score_pillars: {
        ...report.score_pillars!,
        website_readiness: { status: "not_measured", score: null, reason: "No crawl evidence." },
      },
      content_analysis: {
        ...report.content_analysis,
        pages: [{ ...report.content_analysis.pages[0], crawl_status: "Failed" }],
        site_summary: { pages_attempted: 1, pages_successful: 0, pages_failed: 1, pages_with_schema: 0, citation_readiness: { strong: 0, moderate: 0, weak: 0 }, status: "not_measured" },
      },
    };
    render(<StructuredReportView data={{ ...data, report_summary: notMeasured }} />);
    expect(screen.getAllByText("EXCELLENT").length).toBeGreaterThan(0);
    expect(screen.getByText("Overall GEO Score: 100/100")).toBeInTheDocument();
    expect(screen.getByText("Based on measured AI visibility performance.")).toBeInTheDocument();
    expect(screen.queryByText("INCOMPLETE")).not.toBeInTheDocument();
  });

  it("keeps failed responses and missing page fields unavailable", () => {
    const failed = { ...report.prompt_explorer[0], status: "timeout" as const, error: "" };
    expect(outcome(failed)).toBe("Failed");
    expect(competitorCell(failed)).toBe("Not measured");
    expect(citationCell(failed)).toBe("Not measured");
    const page = { ...report.content_analysis.pages[0], crawl_status: "Failed", issues: ["HTTP 403"] };
    expect(pageCells(page)).toEqual([page.url, page.page_type, "Failed: HTTP 403", "Not measured", "Not measured"]);
  });

  it("suppresses historical zero-crawl technical findings, including content-category gaps", () => {
    const unmeasured = { ...report, content_analysis: { ...report.content_analysis, pages: [] },
      action_center: [{ ...report.action_center[0], category: "Content", problem: "Thin pages", evidence: "0/0 pages contain schema" }] };
    expect(simpleReport(unmeasured).actions).toEqual([]);
    expect(simpleReport(unmeasured).readiness).toBeNull();
    expect(simpleReport(unmeasured).interpretation).toContain("measured AI visibility performance");
  });

  it("distinguishes five successful discovery answers from collection failure", async () => {
    const discovery: ReportSummary = {
      ...citationUnavailableReport,
      header: { ...report.header, geo_score: null, score_status: "incomplete", prompts_tested: 5, responses_analyzed: 5, pages_analyzed: 0 },
      ai_visibility: { ...report.ai_visibility, status: "not_measured", mention_rate: null, successful: 5, attempted: 5, failed: 0 },
      methodology: { ...report.methodology, measurement_valid: false, prompt_strategy: "profile_discovery", responses_successful: 5, prompts_attempted: 5, responses_failed: 0 },
      content_analysis: { ...report.content_analysis, pages: [], site_summary: { status: "not_measured", pages_attempted: 0, pages_successful: 0, pages_failed: 0, pages_with_schema: null, citation_readiness: null } },
      action_center: [],
      prompt_explorer: Array.from({ length: 5 }, (_, i) => ({ ...report.prompt_explorer[0], prompt_id: `discovery-${i}`, measurement_scope: "initial_response", initial_response: "ExampleCo profile discovery.", scoring_eligible: false })),
    };
    render(<StructuredReportView data={{ ...data, report_summary: discovery }} />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
    expect(screen.queryByText(/Overall GEO Score:/)).not.toBeInTheDocument();
    expect(screen.getByText("Data confidence: Limited")).toBeInTheDocument();
    expect(screen.getAllByText("Discovery Only")).toHaveLength(5);
    expect(screen.getByText("AI Mention Rate").parentElement).toHaveTextContent("Limited data");
    expect(screen.getByText("AI Recommendation Rate").parentElement).toHaveTextContent("Limited data");
    expect(screen.getAllByText(/AI responses were collected successfully/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/insufficient successful provider responses/i)).not.toBeInTheDocument();
    expect(simpleReport(discovery).components).toEqual([]);
    expect(simpleReport(discovery).readiness).toBeNull();
    expect(visibilityExplanation(discovery)).toContain("not eligible for GEO scoring");
    expect(citationCell(discovery.prompt_explorer[0])).toBe("Not measured");
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={discovery} />).toBlob();
    expect(blob.size).toBeGreaterThan(1_000);
    if (process.env.DISCOVERY_PDF_FIXTURE_PATH) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(process.env.DISCOVERY_PDF_FIXTURE_PATH, Buffer.from(await blob.arrayBuffer()));
      await writeFile(process.env.DISCOVERY_PDF_FIXTURE_PATH + ".json", serializeReport(discovery));
    }
  });

  it("caps action center at five evidence-backed actions and keeps weeks distinct", () => {
    const many = { ...report, action_center: Array.from({ length: 8 }, (_, i) => ({ ...report.action_center[0], recommended_action: `Evidence-backed action ${i}` })) };
    const model = simpleReport(many);
    expect(model.actions).toHaveLength(5);
    expect(model.plan.flatMap(p => p.actions).filter(a => a.startsWith("Evidence-backed"))).toHaveLength(5);
    expect(new Set(model.plan.flatMap(p => p.actions)).size).toBe(model.plan.flatMap(p => p.actions).length);
    expect(outcome({ ...report.prompt_explorer[0], status: "timeout", scoring_eligible: false })).toBe("Failed");
  });
});

const turnScopedReport: ReportSummary = {
  ...citationUnavailableReport,
  executive_summary: { ...citationUnavailableReport.executive_summary, mention_rate: 0, prompts_mentioned: 0 },
  ai_visibility: {
    ...citationUnavailableReport.ai_visibility, measurement_scope: "initial_response", mention_rate: 0, brand_mentions: 0,
    scope_note: "Initial discovery visibility uses successful initial responses only. Follow-ups never increase these metrics.",
    follow_up_visibility: { attempted: 1, successful: 1, failed: 0, brand_mentions: 1, mention_rate: 100, recommendation_rate: 100 },
  },
  prompt_explorer: [{
    ...citationUnavailableReport.prompt_explorer[0], measurement_scope: "initial_response",
    initial_response: "Real Rival is one option.", response: "**AI:** Real Rival is one option. **User:** Compare? **AI:** I recommend ExampleCo.",
    brand_mentioned: false, initial_brand_mentioned: false, brand_recommended: false, initial_brand_recommended: false,
    follow_ups: [{ follow_up_prompt: "Compare?", response: "I recommend ExampleCo.", status: "success", brand_mentioned: true, brand_recommended: true, citation_status: "not_available" }],
  }],
};

describe("Initial discovery and follow-up evidence", () => {
  afterEach(cleanup);

  it("explains initial zero visibility alongside positive follow-up evidence", () => {
    render(<StructuredReportView data={{ ...data, report_summary: turnScopedReport }} />);
    expect(screen.getAllByText(/Initial AI Visibility/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Initial brand mentioned: No/)).toBeInTheDocument();
    expect(screen.getByText("Initial AI response (scored)")).toBeInTheDocument();
    expect(screen.getByText("Real Rival is one option.")).toBeInTheDocument();
    expect(screen.getByText(/Follow-up brand mentioned: Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up visibility \(not scored\): 100.0%/)).toBeInTheDocument();
    expect(screen.getAllByText("0.0%").length).toBeGreaterThan(0);
    expect(screen.getByText(/not included in initial visibility/)).toBeInTheDocument();
  });

  it("keeps the full transcript and turn-level evidence in JSON", () => {
    const exported = JSON.parse(serializeReport(turnScopedReport));
    expect(exported.prompt_explorer[0].response).toContain("I recommend ExampleCo.");
    expect(exported.prompt_explorer[0].initial_response).toBe("Real Rival is one option.");
    expect(exported.ai_visibility.mention_rate).toBe(0);
    expect(exported.prompt_explorer[0].follow_ups[0].brand_recommended).toBe(true);
  });

  it("labels legacy evidence without relabeling stored metrics as initial-only", () => {
    render(<StructuredReportView data={data} />);
    expect(screen.getByText("Legacy response / transcript")).toBeInTheDocument();
    expect(screen.getByText(/Turn-level scoring scope was not recorded/)).toBeInTheDocument();
    expect(screen.queryByText("Initial AI response (scored)")).not.toBeInTheDocument();
  });

  it("renders failed follow-ups without a fake negative mention", () => {
    const failed: ReportSummary = { ...turnScopedReport, prompt_explorer: [{ ...turnScopedReport.prompt_explorer[0], follow_ups: [{ follow_up_prompt: "Compare?", response: "", status: "timeout", error: "OpenAI request timed out", brand_mentioned: null }] }] };
    render(<StructuredReportView data={{ ...data, report_summary: failed }} />);
    expect(screen.getByText(/OpenAI request timed out/)).toBeInTheDocument();
    expect(screen.queryByText(/Follow-up brand mentioned: No/)).not.toBeInTheDocument();
  });

  it("generates a PDF with separate initial and follow-up evidence", async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={turnScopedReport} />).toBlob();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
  });
});

describe("Executive report hierarchy", () => {
  afterEach(cleanup);

  it("renders GEO Position and evidence-backed What This Means insights", () => {
    render(<StructuredReportView data={data} />);

    expect(screen.getByText("GEO OVERVIEW")).toBeInTheDocument();
    expect(screen.getByText("AI Mention Rate")).toBeInTheDocument();
    expect(screen.getByText("EXPLICIT RECOMMENDATION")).toBeInTheDocument();
    expect(screen.getByText("Share of AI Voice")).toBeInTheDocument();
    expect(screen.getByText("EXECUTIVE SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("BIGGEST GAP")).toBeInTheDocument();
    expect(screen.getAllByText("The brand was visible in the sampled answer.").length).toBeGreaterThan(0);
  });

  it("labels initial recommendations and follow-up-only discovery without changing initial visibility", () => {
    const { rerender } = render(<StructuredReportView data={data} />);
    expect(screen.getByText("Mentioned / Recommended")).toBeInTheDocument();

    rerender(<StructuredReportView data={{ ...data, report_summary: turnScopedReport }} />);
    expect(screen.getByText("Follow-up Only")).toBeInTheDocument();
    expect(screen.getAllByText("0.0%").length).toBeGreaterThan(0);
    expect(screen.getByText(/does not increase Initial AI Visibility/i)).toBeInTheDocument();
  });

  it("distinguishes visible and not-visible initial answers", () => {
    const visiblePrompt = { ...report.prompt_explorer[0], brand_recommended: false };
    const missedPrompt = { ...visiblePrompt, prompt_id: "p2", brand_mentioned: false, brand_position: null };
    render(<StructuredReportView data={{ ...data, report_summary: { ...report, prompt_explorer: [visiblePrompt, missedPrompt] } }} />);

    expect(screen.getByText("Mentioned")).toBeInTheDocument();
    expect(screen.getByText("Not Mentioned")).toBeInTheDocument();
  });

  it("renders quick wins and roadmap rationale without duplicating actions across phases", () => {
    const duplicatedRoadmap: ReportSummary = {
      ...report,
      roadmap_90_days: {
        "0_30_days": report.action_center,
        "30_60_days": report.action_center,
        "60_90_days": [],
      },
    };
    render(<StructuredReportView data={{ ...data, report_summary: duplicatedRoadmap }} />);

    expect(screen.getByText("Your priority actions")).toBeInTheDocument();
    expect(screen.getAllByText("Publish a product comparison page.").length).toBeGreaterThan(0);
    expect(screen.getByText("Week 3")).toBeInTheDocument();
    expect(screen.getByText("Week 4")).toBeInTheDocument();
    expect(screen.queryByText("90-Day GEO Roadmap")).not.toBeInTheDocument();
    expect(screen.getByText(/Evidence: No comparison page was found/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish a product comparison page." })).toBeInTheDocument();
  });

  it("keeps unavailable and legacy metrics explicit rather than turning them into zero", () => {
    render(<StructuredReportView data={citationUnavailableData} />);
    expect(screen.getAllByText("Not measured").length).toBeGreaterThan(0);
    cleanup();

    render(<StructuredReportView data={{ ...data, geo_score: undefined, report_summary: report }} />);
    expect(screen.getAllByText("Not measured").length).toBeGreaterThan(0);
    expect(screen.getByText(/Legacy scope unspecified; stored scores preserved/)).toBeInTheDocument();
  });

  it("exposes mobile-safe grids and generates the improved PDF", async () => {
    const { container } = render(<StructuredReportView data={data} />);
    expect(container.querySelector(".report-position-grid")).toBeInTheDocument();
    expect(container.querySelector(".report-insight-grid")).toBeInTheDocument();
    expect(container.querySelector('[role="region"]')).toBeInTheDocument();
    expect(container.querySelectorAll(".report-roadmap-phase")).toHaveLength(2);

    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={report} geoScore={data.geo_score} />).toBlob();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
  });
});

const productionAnswer = (
  "ExampleCo is a strong option for growing teams - it combines CRM workflows, automation, reporting, and integrations. "
  + "Evidence remains available in the complete JSON export. https://example.com/research/customer-platform.\n\n"
).repeat(140).slice(0, 24_000);

function productionSizedReport(promptCount = 5): ReportSummary {
  const longUrl = `https://example.com/${"customer-platform-integrations/".repeat(30)}details`;
  return {
    ...citationUnavailableReport,
    header: { ...citationUnavailableReport.header, pages_analyzed: 19, prompts_tested: promptCount, responses_analyzed: promptCount },
    executive_summary: { ...citationUnavailableReport.executive_summary, total_prompts: promptCount, prompts_mentioned: promptCount },
    ai_visibility: { ...citationUnavailableReport.ai_visibility, attempted: promptCount, successful: promptCount, failed: 0, total_prompts: promptCount, total_responses: promptCount, brand_mentions: promptCount },
    prompt_explorer: Array.from({ length: promptCount }, (_, promptIndex) => ({
      ...report.prompt_explorer[0],
      prompt_id: `production-${promptIndex + 1}`,
      prompt: `Which CRM platform is best for growing teams? Scenario ${promptIndex + 1}`,
      response: productionAnswer,
      citation_status: "not_available" as const,
      citation_count: null,
      citations: [],
      follow_ups: Array.from({ length: 4 }, (_, followUpIndex) => ({
        follow_up_prompt: `Compare the strongest option for follow-up ${followUpIndex + 1}.`,
        response: productionAnswer.slice(0, 4_000),
      })),
    })),
    content_analysis: {
      ...report.content_analysis,
      pages: Array.from({ length: 20 }, (_, i) => ({
        ...report.content_analysis.pages[0], url: i === 0 ? longUrl : `https://example.com/page-${i}`,
        crawl_status: i === 19 ? "Failed" : "Crawled", has_schema_markup: false, schema_types: [],
        issues: i === 19 ? ["HTTP 403"] : ["No structured data detected"],
        citation_readiness: i < 2 ? "Strong" : i < 14 ? "Moderate" : "Weak",
      })),
      site_summary: { pages_attempted: 20, pages_successful: 19, pages_failed: 1, pages_with_schema: 0, citation_readiness: { strong: 2, moderate: 12, weak: 5 } },
      top_problem_pages: [{ ...report.content_analysis.pages[0], url: longUrl, why_it_matters: "The primary page lacks explicit entity data.", recommended_fix: "Add and validate Organization schema.", priority: "High" }],
    },
    action_center: report.action_center.map(action => ({ ...action, affected_urls: [longUrl] })),
    citations: { ...citationUnavailableReport.citations, unavailable_responses: promptCount },
    methodology: { ...citationUnavailableReport.methodology, number_of_prompts: promptCount, number_of_responses: promptCount, prompts_attempted: promptCount, responses_successful: promptCount, responses_failed: 0, citation_responses_unavailable: promptCount, pages_attempted: 20, pages_successfully_crawled: 19 },
  };
}

afterEach(cleanup);

describe("StructuredReportView exports", () => {
  it("exposes responsive report header, metric grid, actions, and prompt evidence hooks", () => {
    const { container } = render(<StructuredReportView data={data} />);

    expect(container.querySelector(".report-cover__layout")).toBeInTheDocument();
    expect(container.querySelector(".report-grid--compact")).toBeInTheDocument();
    expect(container.querySelector(".report-actions")).toBeInTheDocument();
    expect(container.querySelector(".report-prompt-evidence")).toBeInTheDocument();
  });

  it("renders a live download action and report_summary evidence", () => {
    render(<StructuredReportView data={data} />);

    expect(screen.getByRole("button", { name: "Download Report" })).toBeEnabled();
    expect(screen.getByText("ExampleCo is a useful CRM for small teams.")).toBeInTheDocument();
    expect(screen.getAllByText(/No comparison page was found/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Real Rival").length).toBeGreaterThan(0);
  });

  it("builds stable customer-facing PDF and JSON filenames", () => {
    expect(buildReportFilename(report)).toBe("exampleco-geo-audit-2026-08-27.pdf");
    expect(buildJsonFilename(report)).toBe("exampleco-geo-audit-2026-08-27.json");
  });

  it("serializes the same structured report used by the visible view", () => {
    const exported = JSON.parse(serializeReport(report));
    expect(exported.header.geo_score).toBe(45);
    expect(exported.prompt_explorer[0].response).toBe("ExampleCo is a useful CRM for small teams.");
    expect(exported.action_center[0].evidence).toBe("No comparison page was found in the crawl sample.");
  });

  it("generates a non-empty PDF from the structured report", async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={report} />).toBlob();

    if (process.env.SUCCESS_PDF_FIXTURE_PATH) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(process.env.SUCCESS_PDF_FIXTURE_PATH, Buffer.from(await blob.arrayBuffer()));
    }

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
  });

  it("generates a PDF from production-sized prompt evidence", async () => {
    const longReport = productionSizedReport();

    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={longReport} />).toBlob();

    if (process.env.PRODUCTION_PDF_FIXTURE_PATH) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(process.env.PRODUCTION_PDF_FIXTURE_PATH, Buffer.from(await blob.arrayBuffer()));
      await writeFile(process.env.PRODUCTION_PDF_FIXTURE_PATH + ".json", serializeReport(longReport));
    }

    expect(longReport.prompt_explorer).toHaveLength(5);
    expect(longReport.prompt_explorer.every(prompt => prompt.response.length === 24_000)).toBe(true);
    expect(JSON.parse(serializeReport(longReport)).prompt_explorer[0].response).toHaveLength(24_000);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
  }, 60_000);

  it("keeps PDF evidence deterministic and bounded without changing source evidence", () => {
    const transcript = `**User:** Initial question\n\n**AI:** ${productionAnswer}\n\n**User:** Follow-up question\n\n**AI:** Follow-up answer`;
    const excerpt = excerptPdfText(extractPrimaryAiEvidence(transcript), PDF_PRIMARY_EVIDENCE_LIMIT);

    expect(excerpt.truncated).toBe(true);
    expect(excerpt.text.length).toBeLessThanOrEqual(PDF_PRIMARY_EVIDENCE_LIMIT + 3);
    expect(countTranscriptFollowUps(transcript)).toBe(1);
    expect(productionAnswer).toHaveLength(24_000);
    expect(formatPdfUrl(`https://example.com/${"segment/".repeat(30)}`)).toContain("\n");
  });

  it("generates a bounded PDF for 25 long successful prompts", async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={productionSizedReport(25)} />).toBlob();

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
    expect(blob.size).toBeLessThan(2_000_000);
  }, 60_000);

  it("renders null optional prompt values without undefined output or renderer errors", async () => {
    const nullSafeReport: ReportSummary = {
      ...report,
      prompt_explorer: [{
        ...report.prompt_explorer[0],
        response: "Useful evidence with Unicode punctuation: \u201csmart quotes\u201d, an \u2014 em dash, and an ellipsis\u2026",
        competitors_mentioned: null,
        citations: null,
        follow_ups: null,
        cost_usd: null,
        latency_ms: null,
      } as unknown as ReportSummary["prompt_explorer"][number]],
    };
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={nullSafeReport} />).toBlob();

    expect(blob.size).toBeGreaterThan(1_000);
  });

  it("creates safe PDF diagnostics without logging report content", () => {
    expect(pdfExportDiagnostic(new Error("raw model response must not be logged"), "document-render")).toEqual({
      message: "PDF export failed",
      errorType: "Error",
      section: "document-render",
    });
  });

  it("does not reinterpret legacy zero citations as verified measurement", () => {
    render(<StructuredReportView data={data} />);
    expect(screen.queryByText("Verified citation measurement was not available for this audit.")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Top cited company pages" })).not.toBeInTheDocument();
  });

  it("does not expose a download action when report data is missing", () => {
    render(<StructuredReportView data={{ ...data, report_summary: undefined }} />);
    expect(screen.queryByRole("button", { name: "Download Report" })).not.toBeInTheDocument();
  });

  it("hides unavailable citation presentation without a fake zero or placeholder", () => {
    render(<StructuredReportView data={citationUnavailableData} />);

    expect(screen.getAllByText(/not measured/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("CITATION VISIBILITY")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified citation measurement was not available for this audit.")).not.toBeInTheDocument();
    expect(screen.queryByText(/0 citations detected/i)).not.toBeInTheDocument();
  });

  it("generates a citation-unavailable PDF without converting it to zero", async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={citationUnavailableReport} />).toBlob();

    if (process.env.CITATION_UNAVAILABLE_PDF_FIXTURE_PATH) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(process.env.CITATION_UNAVAILABLE_PDF_FIXTURE_PATH, Buffer.from(await blob.arrayBuffer()));
    }

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
  });

  it("keeps a valid readiness headline when provider responses fail", () => {
    render(<StructuredReportView data={incompleteData} />);

    expect(screen.getByText("EXCELLENT")).toBeInTheDocument();
    expect(screen.getByText("Overall GEO Score: 85/100")).toBeInTheDocument();
    expect(screen.getByText(/ExampleCo has an Excellent GEO rating/)).toBeInTheDocument();
    expect(screen.getByText(/AI visibility metrics will be reported separately when sufficient measurement data is available/i)).toBeInTheDocument();
    expect(screen.queryByText(/audit incomplete|reliable overall GEO score/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Failed")).toHaveLength(5);
    expect(screen.queryByText("Brand not mentioned")).not.toBeInTheDocument();
  });

  it("generates a downloadable PDF with readiness despite unavailable AI evidence", async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={incompleteReport} />).toBlob();

    if (process.env.PDF_FIXTURE_PATH) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(process.env.PDF_FIXTURE_PATH, Buffer.from(await blob.arrayBuffer()));
    }

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
  });

  it("renders and exports zero-crawl evidence as not measured without technical claims", async () => {
    const zeroCrawlReport: ReportSummary = {
      ...report,
      header: { ...report.header, geo_score: null, score_status: "incomplete", pages_analyzed: 0 },
      score_pillars: {
        ai_performance: { status: "not_measured", score: null, reason: "Company/category understanding was insufficient." },
        website_readiness: { status: "not_measured", score: null, reason: "Website technical readiness was not measured because no pages were successfully analyzed." },
      },
      content_analysis: {
        ...report.content_analysis,
        pages: [],
        site_summary: {
          status: "not_measured", pages_attempted: 1, pages_successful: 0, pages_failed: 1,
          pages_with_schema: null, citation_readiness: null,
          diagnostic: "Website technical readiness was not measured because no pages were successfully analyzed.",
        },
        top_problem_pages: [], technical_blockers: [], missing_content_opportunities: [],
      },
      action_center: [],
      methodology: {
        ...report.methodology,
        pages_attempted: 1, pages_successfully_crawled: 0,
        profile_source: "domain_only", category_source: "insufficient_evidence",
        category_confidence: 0, prompt_strategy: "profile_discovery", measurement_valid: false,
        profile_diagnostic: "Company/category understanding was insufficient for category-specific GEO prompts.",
      },
    };
    const zeroCrawlData = {
      ...data,
      geo_score: { ...data.geo_score!, total_score: null, website_geo_readiness: null },
      report_summary: zeroCrawlReport,
    };

    render(<StructuredReportView data={zeroCrawlData} />);
    expect(screen.getAllByText(/website technical readiness was not measured because no pages were successfully analyzed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prompt strategy: profile_discovery/)).toBeInTheDocument();
    expect(screen.queryByText("Pages with schema")).not.toBeInTheDocument();
    expect(screen.queryByText(/implement organization schema/i)).not.toBeInTheDocument();

    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={zeroCrawlReport} />).toBlob();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1_000);
  });
});
