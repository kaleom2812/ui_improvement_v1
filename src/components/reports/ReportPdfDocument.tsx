import React from "react";
import { Document, Page, StyleSheet, Text, View, Link } from "@react-pdf/renderer";
import type { CompanyProfile, GEOScore, ReportSummary } from "@/lib/types";
import { excerptPdfText } from "@/lib/reportExport";
import { CUSTOMER_SCORING_RULE, customerConfidenceLevel, customerReportCopy, SHOW_REPORT_CITATIONS } from "@/lib/customerReport";
import { CITATION_METHOD, CITATION_NOTE, CITATION_UNAVAILABLE_METHOD, citationPageLabel, citationPercent, citationProviders, citationUrl, promptCitationLabel, verifiedCitation } from "@/lib/citationVisibility";
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

const s = StyleSheet.create({
  page: {
    padding: 42,
    paddingTop: 56,
    paddingBottom: 42,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#202020",
    backgroundColor: "#fff",
  },
  header: {
    position: "absolute",
    top: 22,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#777",
    fontSize: 7,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#777",
    fontSize: 7,
  },
  eyebrow: {
    color: "#be210e",
    fontSize: 8,
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 27,
    lineHeight: 1.15,
    marginBottom: 15,
  },
  hero: {
    fontFamily: "Helvetica-Bold",
    fontSize: 39,
    lineHeight: 1.1,
    marginBottom: 18,
  },
  score: {
    fontFamily: "Helvetica-Bold",
    fontSize: 65,
    lineHeight: 1.1,
    color: "#ec3219",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 17,
    lineHeight: 1.25,
    marginBottom: 9,
    marginTop: 16,
  },
  body: { marginBottom: 12, lineHeight: 1.45 },
  muted: { color: "#666", fontSize: 8, lineHeight: 1.4 },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#aaa",
    paddingTop: 14,
  },
  metric: { width: "50%", paddingRight: 12, marginBottom: 20 },
  metricValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 17,
    lineHeight: 1.2,
    marginBottom: 5,
  },
  label: {
    fontSize: 7,
    lineHeight: 1.3,
    color: "#666",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 10,
  },
  cell: { paddingRight: 8, fontSize: 8, lineHeight: 1.35 },
  tableHead: { fontFamily: "Helvetica-Bold", backgroundColor: "#f6f6f6" },
  insightLabel: {
    width: "26%",
    fontFamily: "Helvetica-Bold",
    color: "#a82211",
    fontSize: 8,
  },
  insightText: { width: "74%", fontSize: 11, lineHeight: 1.4 },
  barTrack: { height: 5, backgroundColor: "#e6e6e6", marginTop: 7 },
  bar: { height: 5, backgroundColor: "#ef321a" },
  plan: {
    marginBottom: 14,
    borderTopWidth: 2,
    borderTopColor: "#ef321a",
    paddingTop: 8,
  },
});
const short = (text: unknown, max = 400, fallback = "Not measured") =>
  excerptPdfText(text, max, fallback).text;
const chunks = <T,>(items: T[], size: number) =>
  items.length
    ? Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
        items.slice(i * size, (i + 1) * size),
      )
    : [[]];

function Table({
  columns,
  rows,
  widths,
}: {
  columns: string[];
  rows: string[][];
  widths: number[];
}) {
  return (
    <View>
      <View style={[s.row, s.tableHead]}>
        {columns.map((c, i) => (
          <Text key={c} style={[s.cell, { width: `${widths[i]}%` }]}>
            {c}
          </Text>
        ))}
      </View>
      {rows.map((row, n) => (
        <View style={s.row} wrap={false} key={n}>
          {row.map((c, i) => (
            <Text key={i} style={[s.cell, { width: `${widths[i]}%` }]}>
              {short(c, i === 0 ? 230 : 220)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
function Insight({ label, children }: { label: string; children: string }) {
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.insightLabel}>{label}</Text>
      <Text style={s.insightText}>{short(children, 600)}</Text>
    </View>
  );
}

function PdfCitations({ report }: { report: ReportSummary }) {
  const v = verifiedCitation(report), s = v.scope, follow = verifiedCitation(report, true);
  return <View style={{ marginTop: 8 }}>
    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>Citation Visibility: {v.label}</Text>
    <Text style={sPdfCitation}>{v.explanation} {CITATION_NOTE}</Text>
    {v.measured && s && <>
      <Text style={sPdfCitation}>Citation sample: {short(citationProviders(report), 160, "Provider/model not recorded")} (separate search-enabled execution).</Text>
      <Text style={sPdfCitation}>Measured responses: {s.eligible_responses} / Responses citing company: {s.responses_with_target_citation}</Text>
      <Text style={sPdfCitation}>Verified target citations: {s.target_citation_count} / Unique company pages cited: {s.unique_target_pages}</Text>
      <Text style={sPdfCitation}>Citation Share: {v.share} / Verified third-party sources: {v.thirdPartySources ?? "Not recorded"}</Text>
      {s.prompt_coverage && <Text style={sPdfCitation}>Citation measurement coverage: {s.prompt_coverage.measured_prompts} of {s.prompt_coverage.eligible_prompts} eligible prompts.</Text>}
      {v.pages.length ? <>
        <Text style={sPdfCitation}>TOP CITED COMPANY PAGES / CITATIONS / PROMPTS</Text>
        {v.pages.slice(0, 3).map(p => <Text key={p.url} style={sPdfCitation}>
          <Link src={citationUrl(p.url)}>{short(citationPageLabel(p.url), 65)}</Link> / {p.citation_count} / {p.prompt_ids.length}
        </Text>)}
      </> : <Text style={sPdfCitation}>No verified company-page citations were observed.</Text>}
      {v.competitors.length > 0 && <>
        <Text style={sPdfCitation}>COMPETITIVE CITATIONS / VERIFIED CITATIONS / SHARE</Text>
        {v.competitors.slice(0, 2).map(c => <Text key={c.name} style={sPdfCitation}>
          {short(c.name, 35)} / {short([...new Set(c.evidence.map(e => e.hostname))].join(", "), 50)} / {c.citation_count} / {citationPercent(c.citation_share)}
        </Text>)}
      </>}
      {(v.pages.length > 3 || v.competitors.length > 2) && <Text style={sPdfCitation}>Additional verified citation evidence is available in the web report and JSON.</Text>}
    </>}
    {follow.measured && <Text style={sPdfCitation}>Follow-up Citation Visibility: {follow.label}. Separate from initial citations.</Text>}
  </View>;
}
const sPdfCitation = { fontSize: 8, lineHeight: 1.3, marginBottom: 4 };

export default function ReportPdfDocument({
  report,
  geoScore,
}: {
  report: ReportSummary;
  companyProfile?: CompanyProfile;
  geoScore?: GEOScore;
}) {
  const model = simpleReport(report, geoScore),
    h = report.header;
  const confidence =
    h.audit_confidence ?? report.executive_summary.audit_confidence;
  const rivals = report.competitor_intelligence;
  const eligibleCompetition =
    !model.discovery &&
    rivals.status !== "not_measured" &&
    (rivals.competitors?.length > 0 || rivals.brand_mentions > 0);
  const date = h.audit_date?.slice(0, 10) || "Date unavailable";
  const page = (key: string, children: React.ReactNode) => (
    <Page key={key} size="A4" style={s.page} wrap>
      <View style={s.header} fixed>
        <Text>
          {short(h.organization, 70)} / {short(h.domain, 90)}
        </Text>
        <Text>{date}</Text>
      </View>
      {children}
      <View style={s.footer} fixed>
        <Text>GENERATIVE ENGINE OPTIMIZATION</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </View>
    </Page>
  );
  return (
    <Document title={`${h.organization} GEO Audit`} author="GEO Audit">
      {page(
        "overview",
        <>
          <Text style={s.eyebrow}>GEO OVERVIEW</Text>
          <Text style={s.hero}>{"Generative Engine\nOptimization"}</Text>
          <Text style={s.body}>
            {short(h.organization, 100)} / {short(h.domain, 120)} / {date}
          </Text>
          <Text style={[s.score, !model.available ? { fontSize: 37 } : {}]}>
            {model.overallRating}
          </Text>
          <Text style={s.label}>Overall GEO Rating</Text>
          {model.numericScore && <Text style={s.subtitle}>Overall GEO Score: {model.numericScore}</Text>}
          <Text style={s.body}>{model.interpretation}</Text>
          {model.dataConfidence === "Limited" && <Text style={s.body}>Data confidence: Limited</Text>}
          <View style={s.metrics}>
            {model.metrics.map(([label, value]) => (
              <View style={s.metric} key={label}>
                <Text style={s.metricValue}>{value}</Text>
                <Text style={s.label}>{label}</Text>
                {label === "Citation Visibility" && <Text style={s.muted}>{CITATION_NOTE}</Text>}
              </View>
            ))}
          </View>
        </>,
      )}
      {page(
        "summary",
        <>
          <Text style={s.eyebrow}>EXECUTIVE SUMMARY</Text>
          <Text style={s.title}>Your visibility, in context</Text>
          <Text style={s.body}>{short(model.summary, 850)}</Text>
          <Insight label="BIGGEST STRENGTH">{model.strength}</Insight>
          <Insight label="BIGGEST GAP">{model.gap}</Insight>
          <Insight label="NEXT BEST ACTION">{model.nextAction}</Insight>
        </>,
      )}
      {page(
        "scores",
        <>
          <Text style={s.eyebrow}>01 / SCORE BREAKDOWN</Text>
          <Text style={s.title}>AI performance &amp; site readiness</Text>
          <Text style={s.body}>
            Overall GEO Score uses website readiness when available, followed by measured AI visibility or available website optimization signals. Unavailable metrics are not zeroes.
          </Text>
          {model.components.map((c) => (
            <View key={c.key} style={s.row} wrap={false}>
              <View style={{ width: "35%", paddingRight: 12 }}>
                <Text>{short(c.label, 80)}</Text>
                <Text style={s.muted}>
                  {c.score == null
                    ? "Not measured"
                    : `${c.score}/${c.max_score}`}
                </Text>
                {Number.isFinite(c.percentage) && (
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.bar,
                        {
                          width: `${Math.max(0, Math.min(100, c.percentage))}%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
              <Text style={{ width: "65%", fontSize: 8 }}>
                {short(c.evidence, 220)}
              </Text>
            </View>
          ))}
          {!model.components.length && (
            <Text style={s.body}>Score components: Not measured</Text>
          )}
          <Text style={s.subtitle}>AI Visibility &amp; Prompt Evidence</Text>
          <Text style={s.body}>What the models actually said</Text>
          <Text style={s.body}>
            {short(visibilityExplanation(report), 600)}
          </Text>
          <Text style={s.muted}>
            Initial responses determine visibility. Follow-up visibility is
            separate and never increases the initial score. Full model response
            is available in the web report / JSON export.
          </Text>
        </>,
      )}
      {chunks(report.prompt_explorer || [], 8).map((group, index) =>
        page(
          `prompts-${index}`,
          <>
            <Text style={s.eyebrow}>02 / PROMPT EVIDENCE</Text>
            <Text style={s.title}>What the models actually said</Text>
            <Table
              columns={[
                "PROMPT",
                "PROVIDER",
                "OUTCOME",
                "COMPETITORS",
                ...(SHOW_REPORT_CITATIONS ? ["CITATION"] : []),
              ]}
              widths={SHOW_REPORT_CITATIONS ? [33, 17, 18, 18, 14] : [40, 20, 20, 20]}
              rows={group.map((p) => [
                p.prompt,
                `${p.provider || "Not recorded"}\n${p.model || "Not recorded"}`,
                outcome(p, model.discovery),
                competitorCell(p, model.discovery),
                ...(SHOW_REPORT_CITATIONS ? [promptCitationLabel(report, p.prompt_id, p.provider)] : []),
              ])}
            />
            {!group.length && <Text>No prompt evidence recorded.</Text>}
            <Text style={[s.muted, { marginTop: 18 }]}>
              Follow-up Only means the brand was absent initially and appeared
              later. Discovery Only responses do not enter any GEO denominator.
              Full transcripts stay in the web report and JSON.
            </Text>
            {SHOW_REPORT_CITATIONS && <Text style={s.muted}>The citation column describes separate search-enabled samples, not source verification of the normal AI answer. Citation provider/model is listed in the citation section.</Text>}
            {report.ai_visibility.follow_up_visibility && (
              <Text style={s.body}>
                Follow-up visibility (not scored):{" "}
                {measuredPercent(
                  report.ai_visibility.follow_up_visibility.mention_rate,
                )}
              </Text>
            )}
          </>,
        ),
      )}
      {page(
        "competition",
        <>
          <Text style={s.eyebrow}>03 / COMPETITIVE INTELLIGENCE</Text>
          <Text style={s.title}>Share of AI Voice</Text>
          {eligibleCompetition ? (
            <Table
              columns={["COMPANY", "MENTIONS", "SHARE OF VOICE"]}
              widths={[55, 20, 25]}
              rows={[
                [
                  h.organization,
                  String(rivals.brand_mentions),
                  measuredPercent(rivals.brand_share_of_ai_voice),
                ],
                ...(rivals.competitors || [])
                  .slice(0, 3)
                  .map((c) => [
                    c.name,
                    String(c.mention_count),
                    measuredPercent(c.share_of_ai_voice),
                  ]),
              ]}
            />
          ) : (
            <Text style={s.body}>Competitive visibility was not measured.</Text>
          )}
          {(rivals.competitors || []).length > 3 && (
            <Text style={s.muted}>
              Additional competitors are available in the web report and JSON.
            </Text>
          )}
          <Text style={s.subtitle}>AI visibility signals</Text>
          <View style={s.metrics}>
            {[
              ["AI MENTION RATE", model.mentionPresentation.label],
              ["AI RECOMMENDATION RATE", model.recommendationPresentation.label],
              ...(SHOW_REPORT_CITATIONS ? [["CITATION VISIBILITY", model.citationRate]] : []),
            ].map(([label, val]) => (
              <View key={String(label)} style={[s.metric, { width: SHOW_REPORT_CITATIONS ? "33.33%" : "50%" }]}>
                <Text style={s.metricValue}>
                  {label === "CITATION VISIBILITY" ? model.citation.label : String(val)}
                </Text>
                <Text style={s.label}>{label}</Text>
              </View>
            ))}
          </View>
          {SHOW_REPORT_CITATIONS && <PdfCitations report={report} />}
          <Text style={[sPdfCitation, { marginTop: 8 }]}>WHAT IS WORKING: {short(model.strength, 100)}</Text>
          <Text style={sPdfCitation}>WHAT IS MISSING: {short(model.gap, 100)}</Text>
          <Text style={sPdfCitation}>HOW TO IMPROVE: {short(model.nextAction, 100)}</Text>
        </>,
      )}
      {page(
        "pages",
        <>
          <Text style={s.eyebrow}>04 / PAGE-LEVEL FINDINGS</Text>
          <Text style={s.title}>Priority pages, page by page</Text>
          {!model.crawlAvailable && (
            <Text style={s.body}>
              Website Readiness: Not measured. No pages were successfully
              analyzed.
            </Text>
          )}
          <Table
            columns={[
              "PAGE",
              "TYPE",
              "CONTENT",
              "STRUCTURED DATA",
              "GEO READINESS",
            ]}
            widths={[32, 15, 18, 18, 17]}
            rows={model.pages.slice(0, 12).map(pageCells)}
          />
          {!(report.content_analysis.pages || []).length && (
            <Text style={s.body}>
              No URL attempts were recorded. No missing-feature or thin-content
              finding can be inferred.
            </Text>
          )}
          <Text style={[s.muted, { marginTop: 12 }]}>
            Page readiness uses the recorded GEO-readiness assessment, not
            a new page score. Full crawl inventory remains in the web report /
            JSON.
          </Text>
        </>,
      )}
      {page(
        "actions",
        <>
          <Text style={s.eyebrow}>05 / ACTION CENTER</Text>
          <Text style={s.title}>Your priority actions</Text>
          <Text style={s.body}>
            Up to five evidence-backed actions. Expected impact is directional,
            not a ranking guarantee.
          </Text>
          {model.actions.map((a, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={[s.insightLabel, { width: "10%" }]}>
                {priority(a.priority)}
              </Text>
              <View style={{ width: "90%" }}>
                <Text style={s.label}>
                  {short(a.category, 70)} / Effort:{" "}
                  {short(a.effort, 80, "Not estimated")}
                </Text>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 5 }}>
                  {short(a.recommended_action, 330)}
                </Text>
                <Text style={s.muted}>
                  Why it matters: {short(actionWhy(a), 220)}
                </Text>
                <Text style={s.muted}>Evidence: {short(a.evidence, 260)}</Text>
                {a.affected_urls?.length > 0 && (
                  <Text style={s.muted}>
                    Where: {short(a.affected_urls.join(", "), 160)}
                  </Text>
                )}
              </View>
            </View>
          ))}
          {!model.actions.length && (
            <Text>No evidence-backed recommendations were recorded.</Text>
          )}
        </>,
      )}
      {page(
        "plan",
        <>
          <Text style={s.eyebrow}>06 / 30-DAY GEO PLAN</Text>
          <Text style={s.title}>Four weeks to a re-test</Text>
          {model.plan.map((p) => (
            <View key={p.week} style={s.plan} wrap={false}>
              <Text style={s.label}>
                {p.week} / {p.title}
              </Text>
              {p.actions.map((a, i) => (
                <Text key={i} style={{ fontSize: 8 }}>
                  {short(a, 260)}
                </Text>
              ))}
            </View>
          ))}
          {!model.plan.length && (
            <Text>No week-specific action is supported by this audit.</Text>
          )}
          <Text style={s.subtitle}>Methodology &amp; confidence</Text>
          <Text style={s.body}>
            A sampled measurement, not an absolute ranking.
          </Text>
          <Table
            columns={["METHOD", "SCOPE"]}
            widths={[26, 74]}
            rows={[
              [
                "PROMPT SET",
                `${h.prompts_tested} prompts; ${model.successful}/${model.attempted} successful AI responses. ${model.discovery ? "Discovery only; not scored." : report.ai_visibility.measurement_scope === "initial_response" ? "Eligible initial responses only; follow-ups excluded." : "Legacy scope unspecified; stored scores preserved."}`,
              ],
              [
                "PROVIDERS",
                `${h.providers.join(", ")} / ${h.models.join(", ")}`,
              ],
              [
                "SCORING RULE",
                CUSTOMER_SCORING_RULE,
              ],
              [
                "WEBSITE SAMPLE",
                `${report.methodology.pages_successfully_crawled ?? h.pages_analyzed} successful / ${report.methodology.pages_attempted ?? report.content_analysis.pages.length} attempted. ${!model.crawlAvailable ? "Website Readiness: Not measured." : "Readiness is independent from AI performance."}`,
              ],
              [
                "CONFIDENCE",
                `${customerConfidenceLevel(confidence?.level)}. ${customerReportCopy(confidence?.reason, "Stored scores preserved.")}`,
              ],
            ]}
          />
          {report.profile_discovery && (
            <Text style={[s.muted, { marginTop: 8 }]}>
              Profile recovery: {report.profile_discovery.validation.status}.
              Discovery evidence is preserved separately and never scored.{" "}
              {report.profile_discovery.validation.limitation}
            </Text>
          )}
          {SHOW_REPORT_CITATIONS && <><Text style={[sPdfCitation, { marginTop: 8 }]}>{CITATION_METHOD}</Text>
          <Text style={sPdfCitation}>{CITATION_UNAVAILABLE_METHOD}</Text></>}
        </>,
      )}
    </Document>
  );
}
