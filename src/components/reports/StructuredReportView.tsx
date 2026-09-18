"use client";

import React, { useState } from "react";
import type { AuditReport } from "@/lib/types";
import {
  buildJsonFilename,
  buildReportFilename,
  pdfExportDiagnostic,
  serializeReport,
} from "@/lib/reportExport";
import {
  actionWhy,
  competitorCell,
  measuredPercent,
  outcome,
  pageCells,
  priority,
  simpleReport,
  visibilityExplanation,
} from "@/lib/simpleReport";
import PromptTurnEvidence from "./PromptTurnEvidence";
import CitationVisibilitySection, { PromptCitationEvidence } from "./CitationVisibilitySection";
import { CITATION_METHOD, CITATION_NOTE, CITATION_UNAVAILABLE_METHOD, promptCitationLabel } from "@/lib/citationVisibility";
import css from "./SimpleReport.module.css";
import { CUSTOMER_SCORING_RULE, customerConfidenceLevel, customerReportCopy, SHOW_REPORT_CITATIONS } from "@/lib/customerReport";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
function Table({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div
      className={css.tableScroll}
      tabIndex={0}
      role="region"
      aria-label={`${columns[0]} table`}
    >
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function StructuredReportView({ data }: { data: AuditReport }) {
  const [isExporting, setIsExporting] = useState(false),
    [exportError, setExportError] = useState("");
  const report = data?.report_summary;
  if (!report) return null;
  const m = simpleReport(report, data.geo_score),
    h = report.header,
    v = report.ai_visibility;
  const rivals = report.competitor_intelligence,
    methodology = report.methodology;
  const confidence =
    h.audit_confidence ?? report.executive_summary.audit_confidence;
  const competitionAvailable =
    !m.discovery &&
    rivals.status !== "not_measured" &&
    (rivals.competitors.length > 0 || rivals.brand_mentions > 0);
  const exportReport = report;
  async function downloadPdf() {
    setIsExporting(true);
    setExportError("");
    try {
      const [{ pdf }, { default: ReportPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ReportPdfDocument"),
      ]);
      downloadBlob(
        await pdf(
          <ReportPdfDocument
            report={exportReport}
            companyProfile={data.company_profile}
            geoScore={data.geo_score}
          />,
        ).toBlob(),
        buildReportFilename(exportReport),
      );
    } catch (error) {
      console.error(pdfExportDiagnostic(error));
      setExportError(
        "The PDF could not be generated. Please try again or use your browser's Print command to save this report as PDF.",
      );
    } finally {
      setIsExporting(false);
    }
  }
  function downloadJson() {
    try {
      setExportError("");
      downloadBlob(
        new Blob([serializeReport(exportReport)], { type: "application/json" }),
        buildJsonFilename(exportReport),
      );
    } catch {
      setExportError(
        "The JSON report could not be downloaded. Please try again.",
      );
    }
  }

  return (
    <article className={`geo-structured-report ${css.report}`}>
      <header className="report-cover report-print-section">
        <div className={`report-cover__layout ${css.header}`}>
          <div>
            <p className={css.eyebrow}>GEO OVERVIEW</p>
            <h1>{h.organization}</h1>
            <p>
              {h.domain} / {h.audit_date?.slice(0, 10) || "Date unavailable"}
            </p>
          </div>
          <div className={`report-actions ${css.actions}`}>
            <button onClick={downloadPdf} disabled={isExporting}>
              {isExporting ? "Generating PDF..." : "Download Report"}
            </button>
            <button onClick={downloadJson}>Download JSON</button>
          </div>
        </div>
        {exportError && <p role="alert">{exportError}</p>}
        <div className={css.score}>
          {m.overallRating}
        </div>
        <p>Overall GEO Rating</p>
        {m.numericScore && <h2>Overall GEO Score: {m.numericScore}</h2>}
        <p>{m.interpretation}</p>
        {m.dataConfidence === "Limited" && <p>Data confidence: Limited</p>}
        <div
          className={`report-grid--compact report-position-grid ${css.metrics}`}
        >
          {m.metrics.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
              {label === "Citation Visibility" && <p className={css.note}>{CITATION_NOTE}</p>}
            </div>
          ))}
        </div>
      </header>
      <section className="report-print-section">
        <p className={css.eyebrow}>EXECUTIVE SUMMARY</p>
        <h2>
          Your visibility, in context
        </h2>
        <p>{m.summary}</p>
        <dl className="report-insight-grid">
          <div>
            <dt>BIGGEST STRENGTH</dt>
            <dd>{m.strength}</dd>
          </div>
          <div>
            <dt>BIGGEST GAP</dt>
            <dd>{m.gap}</dd>
          </div>
          <div>
            <dt>NEXT BEST ACTION</dt>
            <dd>{m.nextAction}</dd>
          </div>
        </dl>
      </section>
      <section className="report-print-section">
        <p className={css.eyebrow}>01 / SCORE BREAKDOWN</p>
        <h2>Observed performance vs. site readiness</h2>
        <p>
          Only calculated components are shown; unavailable metrics are not
          zeroes.
        </p>
        {SHOW_REPORT_CITATIONS && <p className={css.note}>Verified Citation Visibility is not a weighted component.</p>}
        {m.components.map((c) => (
          <div key={c.key} className={css.component}>
            <div>
              <strong>{c.label}</strong>
              <p>
                {c.score == null
                  ? "Not measured"
                  : `${c.score}/${c.max_score} points`}
              </p>
            </div>
            <div>
              {Number.isFinite(c.percentage) && (
                <div className={css.bar}>
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, c.percentage))}%`,
                    }}
                  />
                </div>
              )}
              <p>{c.evidence}</p>
            </div>
          </div>
        ))}
        {!m.components.length && <p>Score components: Not measured</p>}
      </section>
      <section className="report-print-section">
        <p className={css.eyebrow}>02 / AI VISIBILITY &amp; PROMPT EVIDENCE</p>
        <h2>What the models actually said</h2>
        <p>{visibilityExplanation(report)}</p>
        <p>
          Initial AI Visibility:{" "}
          <strong>{measuredPercent(m.mentionRate)}</strong> / {m.attempted}{" "}
          attempted / {m.successful} successful /{" "}
          {methodology.responses_failed ?? v.failed ?? 0} failed
        </p>
        {v.follow_up_visibility && (
          <p>
            Follow-up visibility (not scored):{" "}
            {measuredPercent(v.follow_up_visibility.mention_rate)} /
            Recommendations:{" "}
            {measuredPercent(v.follow_up_visibility.recommendation_rate)}
          </p>
        )}
        <Table
          columns={["PROMPT", "PROVIDER", "OUTCOME", "COMPETITORS", ...(SHOW_REPORT_CITATIONS ? ["CITATION"] : [])]}
        >
          {report.prompt_explorer.map((p, i) => (
            <tr key={`${p.prompt_id}-${i}`}>
              <td>{p.prompt}</td>
              <td>
                {p.provider}
                <br />
                {p.model}
              </td>
              <td>{outcome(p, m.discovery)}</td>
              <td>{competitorCell(p, m.discovery)}</td>
              {SHOW_REPORT_CITATIONS && <td>{promptCitationLabel(report, p.prompt_id, p.provider)}</td>}
            </tr>
          ))}
        </Table>
        <p className={css.note}>
          Follow-up Only means the brand appeared later, not initially.
          Discovery Only responses are supporting evidence, never scored.
        </p>
        <details className="report-prompt-evidence">
          <summary>Inspect full prompt evidence</summary>
          {report.prompt_explorer.map((p, i) => (
            <details key={`${p.prompt_id}-${i}`}>
              <summary>
                {p.prompt} / {outcome(p, m.discovery)}
              </summary>
              <p>
                {p.provider} / {p.model} / Status:{" "}
                {p.status || (p.error ? "provider_error" : "success")}
              </p>
              {SHOW_REPORT_CITATIONS && <PromptCitationEvidence report={report} promptId={p.prompt_id} provider={p.provider} />}
              {outcome(p, m.discovery) === "Failed" ? (
                <p>
                  {p.error || p.status}. No analyzable AI response was
                  collected.
                </p>
              ) : (
                <>
                  <p>
                    Initial brand mentioned:{" "}
                    {p.brand_mentioned == null
                      ? "Not recorded"
                      : p.brand_mentioned
                        ? "Yes"
                        : "No"}{" "}
                    / Recommended:{" "}
                    {p.brand_recommended == null
                      ? "Not recorded"
                      : p.brand_recommended
                        ? "Yes"
                        : "No"}
                  </p>
                  <PromptTurnEvidence
                    prompt={{
                      ...p,
                      scoring_eligible: m.discovery
                        ? false
                        : p.scoring_eligible,
                    }}
                  />
                </>
              )}
            </details>
          ))}
        </details>
        {report.profile_discovery && (
          <details>
            <summary>Stage A: profile discovery (not scored)</summary>
            <p>{report.profile_discovery.validation.rule}</p>
            <p>
              Validation: {report.profile_discovery.validation.status}.{" "}
              {report.profile_discovery.validation.limitation}
            </p>
            {report.profile_discovery.validation.measurement_blocker && (
              <p>{report.profile_discovery.validation.measurement_blocker}</p>
            )}
            {report.profile_discovery.batch.responses.map((r, i) => (
              <details key={i}>
                <summary>
                  {r.prompt_text} / {r.provider} / {r.status}
                </summary>
                <p>{r.initial_response || r.raw_response || r.error}</p>
              </details>
            ))}
          </details>
        )}
      </section>
      <section className="report-print-section">
        <p className={css.eyebrow}>03 / COMPETITIVE INTELLIGENCE</p>
        <h2>Share of AI Voice</h2>
        {competitionAvailable ? (
          <Table columns={["COMPANY", "MENTIONS", "SHARE OF VOICE"]}>
            <tr>
              <td>{h.organization}</td>
              <td>{rivals.brand_mentions}</td>
              <td>{measuredPercent(rivals.brand_share_of_ai_voice)}</td>
            </tr>
            {rivals.competitors.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>{c.mention_count}</td>
                <td>{measuredPercent(c.share_of_ai_voice)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p>Competitive visibility was not measured.</p>
        )}
        <h3>AI visibility signals</h3>
        <div className={css.metrics}>
          {[
            ["BRAND MENTION", m.mentionRate],
            ["EXPLICIT RECOMMENDATION", m.recommendationRate],
            ...(SHOW_REPORT_CITATIONS ? [["CITATION VISIBILITY", m.citationRate]] : []),
          ].map(([label, value]) => (
            <div key={String(label)}>
              <strong>{label === "CITATION VISIBILITY" ? m.citation.label : measuredPercent(value as number | null)}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {SHOW_REPORT_CITATIONS && <CitationVisibilitySection report={report} />}
        <dl>
          <div>
            <dt>WHAT IS WORKING</dt>
            <dd>{m.strength}</dd>
          </div>
          <div>
            <dt>WHAT IS MISSING</dt>
            <dd>{m.gap}</dd>
          </div>
          <div>
            <dt>HOW TO IMPROVE</dt>
            <dd>{m.nextAction}</dd>
          </div>
        </dl>
        <details>
          <summary>Inspect competitive evidence</summary>
          {rivals.competitors.map((c) => (
            <div key={c.name}>
              <h4>{c.name}</h4>
              <p>Appeared: {c.prompts_where_mentioned.join(" / ")}</p>
              <p>
                Brand wins:{" "}
                {c.prompts_where_brand_wins.join(" / ") || "None recorded"}
              </p>
              <p>
                Brand loses:{" "}
                {c.prompts_where_brand_loses.join(" / ") || "None recorded"}
              </p>
            </div>
          ))}
          {SHOW_REPORT_CITATIONS && !!report.citations.cited_urls.length && <p>Legacy source records below are not verified Citation Visibility V1 evidence.</p>}
          {SHOW_REPORT_CITATIONS && report.citations.cited_urls.map((url, i) => (
            <p key={i}>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </p>
          ))}
        </details>
      </section>
      <section className="report-print-section">
        <p className={css.eyebrow}>04 / PAGE-LEVEL FINDINGS</p>
        <h2>Priority pages, page by page</h2>
        {!m.crawlAvailable && (
          <p>
            Website Readiness: Not measured. Website technical readiness was not
            measured because no pages were successfully analyzed.
          </p>
        )}
        <Table
          columns={[
            "PAGE",
            "TYPE",
            "CONTENT",
            "STRUCTURED DATA",
            "GEO READINESS",
          ]}
        >
          {m.pages.slice(0, 10).map((p, i) => (
            <tr key={i}>
              <td>
                <a href={p.url}>{p.url}</a>
              </td>
              {pageCells(p)
                .slice(1)
                .map((cell, n) => (
                  <td key={n}>{cell}</td>
                ))}
            </tr>
          ))}
        </Table>
        {!report.content_analysis.pages.length && (
          <p>
            No URL attempts were recorded; missing website features cannot be
            inferred.
          </p>
        )}
        <p className={css.note}>
          Page readiness uses the recorded GEO-readiness assessment, not a
          new page score.
        </p>
        <details>
          <summary>
            Full crawl inventory and findings (
            {report.content_analysis.pages.length})
          </summary>
          {report.content_analysis.pages.map((p, i) => (
            <div key={i}>
              <a href={p.url}>{p.url}</a>
              <p>
                {p.crawl_status} / {customerReportCopy(p.issues.join("; "), "No additional visible findings recorded")}
              </p>
            </div>
          ))}
        </details>
      </section>
      <section className="report-print-section">
        <p className={css.eyebrow}>05 / ACTION CENTER</p>
        <h2>Your priority actions</h2>
        <p>
          Up to five evidence-backed actions. Impact is directional, not a
          ranking guarantee.
        </p>
        {m.actions.map((a, i) => (
          <div className={css.action} key={i}>
            <strong>{priority(a.priority)}</strong>
            <div>
              <p className={css.eyebrow}>
                {a.category} / Effort: {a.effort || "Not estimated"}
              </p>
              <h3>{a.recommended_action}</h3>
              <p>Why it matters: {actionWhy(a)}</p>
              <p>Evidence: {a.evidence}</p>
              <details>
                <summary>Implementation &amp; affected pages</summary>
                <p>{a.implementation_guidance}</p>
                <p>
                  Owner: {a.owner || "Not assigned"} / Timeframe:{" "}
                  {a.timeframe || "Not estimated"}
                </p>
                <p>Success metric: {a.success_metric || "Not recorded"}</p>
                {a.affected_urls.map((url, n) => (
                  <p key={n}>
                    <a href={url}>{url}</a>
                  </p>
                ))}
              </details>
            </div>
          </div>
        ))}
        {!m.actions.length && (
          <p>No evidence-backed recommendations were recorded.</p>
        )}
        {report.action_center.length > m.actions.length && (
          <p className={css.note}>
            The JSON retains the complete recorded recommendation inventory.
          </p>
        )}
      </section>
      <section className="report-print-section">
        <p className={css.eyebrow}>06 / 30-DAY GEO PLAN</p>
        <h2>Four weeks to a re-test</h2>
        <div className={css.plan}>
          {m.plan.map((p) => (
            <div key={p.week} className="report-roadmap-phase">
              <p className={css.eyebrow}>{p.week}</p>
              <h3>{p.title}</h3>
              {p.actions.map((a, i) => (
                <p key={i}>{a}</p>
              ))}
            </div>
          ))}
        </div>
        {!m.plan.length && (
          <p>No week-specific action is supported by this audit.</p>
        )}
      </section>
      <section className="report-print-section">
        <p className={css.eyebrow}>07 / METHODOLOGY &amp; CONFIDENCE</p>
        <h2>A sampled measurement, not an absolute ranking</h2>
        {SHOW_REPORT_CITATIONS && <><p>{CITATION_METHOD}</p><p>{CITATION_UNAVAILABLE_METHOD}</p></>}
        <dl>
          <div>
            <dt>PROMPT SET</dt>
            <dd>
              {h.prompts_tested} prompts / {m.successful} successful initial
              responses.{" "}
              {m.discovery
                ? "Discovery only; not scored."
                : v.measurement_scope === "initial_response"
                  ? "Successful eligible initial answers only."
                  : "Legacy scope unspecified; stored scores preserved."}
            </dd>
          </div>
          <div>
            <dt>PROVIDERS</dt>
            <dd>
              {h.providers.join(", ")} / {h.models.join(", ")}
            </dd>
          </div>
          <div>
            <dt>SCORING RULE</dt>
            <dd>
              {CUSTOMER_SCORING_RULE}
              <p>
                Follow-up Visibility does not increase Initial AI Visibility.
              </p>
            </dd>
          </div>
          <div>
            <dt>WEBSITE SAMPLE</dt>
            <dd>
              {methodology.pages_successfully_crawled ?? h.pages_analyzed}{" "}
              successful /{" "}
              {methodology.pages_attempted ??
                report.content_analysis.pages.length}{" "}
              attempted.
            </dd>
          </div>
          <div>
            <dt>CONFIDENCE</dt>
            <dd>
              {customerConfidenceLevel(confidence?.level)}
              <p>{customerReportCopy(confidence?.reason, "Stored scores preserved.")}</p>
            </dd>
          </div>
        </dl>
        <details>
          <summary>Profile sources and limitations</summary>
          <p>
            Profile source:{" "}
            {methodology.profile_source || "Legacy: not recorded"}
          </p>
          <p>
            Category source:{" "}
            {methodology.category_source || "Legacy: not recorded"}
          </p>
          <p>
            Category confidence:{" "}
            {methodology.category_confidence == null
              ? "Not recorded"
              : methodology.category_confidence}
          </p>
          <p>
            Prompt strategy:{" "}
            {methodology.prompt_strategy || "Legacy: not recorded"}
          </p>
          <p>{methodology.profile_diagnostic}</p>
          <p>{methodology.sampling_note}</p>
          <p>{customerReportCopy(methodology.limitations, "")}</p>
        </details>
      </section>
    </article>
  );
}
