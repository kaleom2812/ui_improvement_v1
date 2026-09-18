import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AuditReport, ReportSummary } from "@/lib/types";
import { citationPageLabel, citationUrl, promptCitation, verifiedCitation, type VerifiedCitationVisibility } from "@/lib/citationVisibility";
import { simpleReport } from "@/lib/simpleReport";
import { buildViewModel } from "@/lib/adapter";
import { customerReportCopy, customerReportMarkdown, readinessBackedStatusCopy } from "@/lib/customerReport";
import { serializeReport } from "@/lib/reportExport";
import CitationVisibilitySection, { PromptCitationEvidence } from "./CitationVisibilitySection";
import StructuredReportView from "./StructuredReportView";
import ReportPdfDocument from "./ReportPdfDocument";
import { REPORT_TABS } from "../GeoDashboard";
import fixtures from "./fixtures/verified-citations.json";

const reportFor = (name: keyof typeof fixtures.cases): ReportSummary => ({
  ...fixtures.base as unknown as ReportSummary,
  citation_visibility: fixtures.cases[name] as unknown as VerifiedCitationVisibility,
});
afterEach(cleanup);

describe("verified Citation Visibility V1", () => {
  it("bounds the auto-margined report flex item instead of clipping intrinsic table width", () => {
    // JSDOM has no layout engine; keep the CSS contract covered alongside browser geometry checks.
    const stylesheet = readFileSync(path.resolve("src/components/reports/SimpleReport.module.css"), "utf8");
    const root = stylesheet.match(/\.report\s*\{([^}]+)\}/)![1];
    expect(root).toMatch(/(?:^|;)\s*width:\s*100%\s*;/);
    expect(root).toMatch(/box-sizing:\s*border-box/);
    expect(root).toMatch(/min-width:\s*0/);
    expect(root).toMatch(/max-width:\s*1080px/);
    expect(root).not.toMatch(/overflow(?:-x)?:\s*(?:hidden|clip)/);
    const wrapper = stylesheet.match(/\.tableScroll\s*\{([^}]+)\}/)![1];
    expect(wrapper).toMatch(/max-width:\s*100%/);
    expect(wrapper).toMatch(/overflow-x:\s*auto/);
    expect(stylesheet).toContain("minmax(min(100%, 185px), 1fr)");
    expect(stylesheet).toContain("overflow-wrap: anywhere");
  });
  it.each(["unavailable", "zero", "positive", "mixed"] as const)("keeps the complete %s report in one bounded root with inner table regions", name => {
    const { container } = render(<StructuredReportView data={{ report_summary: reportFor(name) } as AuditReport} />);
    const root = screen.getByRole("article");
    expect(root.className).toContain("report");
    expect(container.querySelector('[aria-label="Verified Citation Visibility"]')).toBeNull();
    const tables = Array.from(root.querySelectorAll("table"));
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(table.parentElement?.className).toContain("tableScroll");
      expect(table.parentElement).toHaveAttribute("role", "region");
      expect(table.parentElement).toHaveAttribute("tabindex", "0");
    }
    expect(screen.getByRole("button", { name: "Download Report" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeVisible();
  });
  it.each(["unavailable", "zero", "positive", "mixed"] as const)("hides %s citation presentation without changing stored metrics or JSON", name => {
    const report = reportFor(name);
    const before = structuredClone(report);
    const { container } = render(<StructuredReportView data={{ report_summary: report } as AuditReport} />);
    expect(container.textContent).not.toMatch(/citation visibility|citation rate|source citation|citation share|verified sources|citation_authority/i);
    expect(screen.queryByRole("columnheader", { name: "CITATION" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI visibility signals" })).toBeInTheDocument();
    expect(simpleReport(report).metrics).toHaveLength(8);
    expect(simpleReport(report).citationRate).toBe(verifiedCitation(report).rate);
    expect(report).toEqual(before);
    expect(JSON.parse(serializeReport(report))).toEqual(before);
  });
  it("keeps unavailable data out of rates and empty evidence tables", () => {
    render(<CitationVisibilitySection report={reportFor("unavailable")} />);
    expect(screen.queryByText(/0 of 5/)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
  it("renders the live HubSpot semantic fixture as measured zero, not unavailable", () => {
    render(<CitationVisibilitySection report={reportFor("zero")} />);
    expect(screen.getByText("0 of 1 measured AI responses cited the company.")).toBeInTheDocument();
    expect(screen.getByText("Verified third-party sources").parentElement).toHaveTextContent("5");
    expect(screen.getByText("Unique company pages cited").parentElement).toHaveTextContent("0");
    expect(screen.getByText("Citation Share").parentElement).toHaveTextContent("Not measured");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("shows target pages and only tracked competitor evidence with real denominators", () => {
    render(<CitationVisibilitySection report={reportFor("positive")} />);
    expect(screen.getByText("2 of 5 measured AI responses cited the company.")).toBeInTheDocument();
    expect(screen.getByText("Verified target citations").parentElement).toHaveTextContent("3");
    expect(screen.getByText("Unique company pages cited").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Citation Share").parentElement).toHaveTextContent("60%");
    expect(screen.getByRole("link", { name: "hubspot.com/pricing" })).toHaveAttribute("href", "https://hubspot.com/pricing");
    expect(within(screen.getByRole("region", { name: "Competitive citation visibility" })).getByRole("cell", { name: /Salesforce/ })).toHaveTextContent("salesforce.com");
  });
  it("excludes failed/unavailable measurements from the rate but retains coverage", () => {
    render(<CitationVisibilitySection report={reportFor("mixed")} />);
    expect(screen.getByText("1 of 3 measured AI responses cited the company.")).toBeInTheDocument();
    expect(screen.getByText("Citation measurement coverage: 3 of 5 eligible prompts.")).toBeInTheDocument();
    expect(promptCitation(reportFor("mixed"), "p3", "openai")[0].target_cited).toBeNull();
  });
  it("does not promote legacy nonempty citation arrays or attach OpenAI evidence to other providers", () => {
    const report = reportFor("positive");
    delete report.citation_visibility;
    report.prompt_explorer = [{ ...report.prompt_explorer[0], citations: [{ domain: "hubspot.com", url: "https://hubspot.com/legacy", supports_brand: true }] }];
    expect(verifiedCitation(report).label).toBe("Not measured");
    expect(verifiedCitation(report).rate).toBeNull();
    expect(promptCitation(reportFor("positive"), "p0", "claude")).toEqual([]);
  });
  it("omits legacy citation components from presentation without altering historical numbers", () => {
    const report = reportFor("positive");
    const original = report.score_breakdown.components[0];
    report.score_breakdown = { ...report.score_breakdown, components: [{ ...original, key: "citation_authority", label: "Citation authority" }] };
    expect(simpleReport(report).components).toEqual([]);
    expect(report.score_breakdown.components[0].score).toBe(original.score);
    expect(report.score_breakdown.components[0].max_score).toBe(original.max_score);
    expect(report.header.geo_score).toBe(fixtures.base.header.geo_score);
  });
  it("neutralizes generated copy without corrupting decimals or relabeling citation findings", () => {
    expect(customerReportCopy("GEO score is 51.7/100. Unavailable evidence (citation_authority) was omitted and available components were proportionally reweighted.")).toBe("GEO score is 51.7/100. Unavailable measurement components were excluded and available components were proportionally reweighted.");
    expect(customerReportCopy("Improves citation readiness.")).toBe("Improves GEO readiness.");
    expect(customerReportCopy("Citation rate is 0%. Brand mentioned in 2/5 answers.")).toBe("Brand mentioned in 2/5 answers.");
    expect(customerReportCopy("Citation Visibility was not measured.")).toBe("Not measured");
    expect(customerReportMarkdown("# Summary\n\nMention rate is 40%.\n\n## Citation Visibility\nCitation rate is 0%.\n\n- Improve technical readiness.")).toBe("# Summary\n\nMention rate is 40%.\n\n- Improve technical readiness.");
  });
  it("uses readiness-backed status copy without treating unavailable AI metrics as an incomplete report", () => {
    expect(readinessBackedStatusCopy("phazeai", "GOOD", false)).toBe(
      "phazeai has a Good GEO rating. Your website shows good GEO readiness. AI visibility metrics will be reported separately when sufficient measurement data is available.",
    );
    expect(readinessBackedStatusCopy("ExampleCo", "EXCELLENT", true)).toBe("ExampleCo has an Excellent GEO rating.");
  });
  it("omits legacy citation navigation, dimensions, actions and generated prose from customer presentation", () => {
    expect(REPORT_TABS.some((tab) => /citation/i.test(`${tab.id} ${tab.label}`))).toBe(false);
    const raw = {
      audit_id: "legacy-citation-copy",
      website_url: "https://hubspot.com",
      organization_name: "HubSpot",
      headline_finding: "Citation Visibility is not measured. AI mention rate is 40%.",
      executive_report: "# Summary\n\nAI mention rate is 40%.\n\n## Citation Visibility\nCitation rate is 0%.",
      detailed_playbook: "# Plan\n\n- Improve CRM pages.\n- Increase citation authority.",
      top_recommendations: ["Improve CRM pages.", "Increase citation authority."],
      geo_score: {
        score_components: [
          { name: "citation_authority", raw_score: 0, weight: 0.15, weighted_score: 0, explanation: "Citation score unavailable." },
          { name: "website_geo_readiness", raw_score: 80, weight: 0.1, weighted_score: 8, explanation: "Website readiness is strong." },
        ],
      },
      gap_report: {
        gaps: [
          { gap_id: "citation-gap", category: "Citations", issue: "No citations", evidence: "No citations", recommended_action: "Build citations", severity: "HIGH", estimated_effort: "1 week" },
          { gap_id: "content-gap", category: "Content", issue: "Missing comparison page", evidence: "No comparison page found", recommended_action: "Publish a comparison page", severity: "HIGH", estimated_effort: "1 week" },
        ],
        top_3_priorities: ["citation-gap", "content-gap"],
      },
    } as unknown as AuditReport;
    const vm = buildViewModel(raw);
    expect(vm.headline).toBe(
      "HubSpot has an Excellent GEO rating. Based on available website optimization signals.",
    );
    expect(vm.score.source).toBe("technical_fallback");
    expect(vm.dimensions.map((dimension) => dimension.key)).toEqual(["website_geo_readiness"]);
    expect(vm.actions.list.map((action) => action.gapId)).toEqual(["content-gap"]);
    expect(vm.report.executiveMarkdown).not.toMatch(/citation/i);
    expect(vm.report.playbookMarkdown).not.toMatch(/citation/i);
    expect(vm.report.topRecommendations).toEqual(["Improve CRM pages."]);
  });
  it("exposes verified prompt sources without consulted-source/raw-provider objects", () => {
    render(<PromptCitationEvidence report={reportFor("zero")} promptId="p0" provider="openai" />);
    expect(screen.getByText(/Target cited: No. Verified sources: 5/)).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByText(/consulted sources/i)).not.toBeInTheDocument();
  });
  it("keeps follow-up citations separate from the initial KPI", () => {
    const report = reportFor("zero");
    report.citation_visibility = { ...report.citation_visibility!, follow_up: reportFor("positive").citation_visibility!.initial };
    render(<CitationVisibilitySection report={report} />);
    expect(screen.getByRole("heading", { name: "Citation Visibility: 0%" })).toBeInTheDocument();
    expect(screen.getByText(/Follow-up Citation Visibility: 40%/)).toBeInTheDocument();
  });
  it("contains wide tables and retains safe full URLs while shortening visual labels", () => {
    const url = `https://hubspot.com/${"long-page-".repeat(40)}?ref=full`;
    const report = reportFor("positive");
    report.citation_visibility = structuredClone(report.citation_visibility);
    report.citation_visibility!.initial.top_cited_target_pages[0].url = url;
    render(<CitationVisibilitySection report={report} />);
    const region = screen.getByRole("region", { name: "Top cited company pages" });
    expect(region.className).toContain("tableScroll");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(screen.getByTitle(url)).toHaveAttribute("href", url);
    expect(citationPageLabel(url).length).toBeLessThanOrEqual(100);
    expect(citationUrl("javascript:alert(1)")).toBeUndefined();
    expect(citationUrl("https://secret:credential@example.com")).toBeUndefined();
  });
  it.each(["unavailable", "zero", "positive"] as const)("generates a real %s PDF", async name => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<ReportPdfDocument report={reportFor(name)} />).toBlob();
    expect(blob.size).toBeGreaterThan(1000);
    if (process.env.PHASE3_PDF_DIR) {
      const { writeFile, mkdir } = await import("node:fs/promises");
      await mkdir(process.env.PHASE3_PDF_DIR, { recursive: true });
      await writeFile(`${process.env.PHASE3_PDF_DIR}/${name}.pdf`, Buffer.from(await blob.arrayBuffer()));
    }
  });
});
