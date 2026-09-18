import React from "react";
import type { ReportSummary } from "@/lib/types";
import { CITATION_NOTE, citationPageLabel, citationPercent, citationProviders, citationUrl, promptCitation, verifiedCitation } from "@/lib/citationVisibility";
import css from "./SimpleReport.module.css";

function SourceLink({ url }: { url: string }) {
  return <a href={citationUrl(url)} title={url} target="_blank" rel="noreferrer">{citationPageLabel(url)}</a>;
}

export default function CitationVisibilitySection({ report }: { report: ReportSummary }) {
  const v = verifiedCitation(report), f = verifiedCitation(report, true), s = v.scope;
  return <div className={css.citation} aria-label="Verified Citation Visibility">
    <h3>Citation Visibility: {v.label}</h3>
    <p>{v.explanation}</p><p className={css.note}>{CITATION_NOTE}</p>
    {!v.measured && s?.status === "failed" && <p>Collection failed. No zero-citation conclusion can be drawn.</p>}
    {v.measured && s && <>
      <p className={css.note}>Citation sample: {citationProviders(report) || "Provider/model not recorded"}. Separate search-enabled execution; not source verification of the normal AI answer.</p>
      <div className={css.metrics}>
        {[["Measured responses", s.eligible_responses], ["Responses citing company", s.responses_with_target_citation],
          ["Verified target citations", s.target_citation_count], ["Unique company pages cited", s.unique_target_pages],
          ["Citation Share", v.share], ["Verified third-party sources", v.thirdPartySources ?? "Not recorded"]].map(([label, value]) =>
          <div key={String(label)}><strong>{value ?? "Not measured"}</strong><span>{label}</span></div>)}
      </div>
      {s.prompt_coverage && <p>Citation measurement coverage: {s.prompt_coverage.measured_prompts} of {s.prompt_coverage.eligible_prompts} eligible prompts.</p>}
      {v.pages.length ? <div className={css.tableScroll} role="region" aria-label="Top cited company pages" tabIndex={0}>
        <table><thead><tr><th>Page</th><th>Citations</th><th>Prompts</th></tr></thead><tbody>
          {v.pages.map(p => <tr key={p.url}><td><SourceLink url={p.url} /></td><td>{p.citation_count}</td><td>{p.prompt_ids.length}</td></tr>)}
        </tbody></table></div> : <p>No verified company-page citations were observed.</p>}
      {v.competitors.length > 0 && <div className={css.tableScroll} role="region" aria-label="Competitive citation visibility" tabIndex={0}>
        <table><thead><tr><th>Brand / Domain</th><th>Verified citations</th><th>Citation share</th></tr></thead><tbody>
          {v.competitors.map(c => <tr key={c.name}><td>{c.name}<br />{[...new Set(c.evidence.map(e => e.hostname))].join(", ")}</td><td>{c.citation_count}</td><td>{citationPercent(c.citation_share)}</td></tr>)}
        </tbody></table></div>}
    </>}
    {f.measured && <p>Follow-up Citation Visibility: {f.label}. {f.explanation} Separate from initial citation measurement.</p>}
  </div>;
}

export function PromptCitationEvidence({ report, promptId, provider }: { report: ReportSummary; promptId: string; provider: string }) {
  const rows = promptCitation(report, promptId, provider);
  return <div className={css.citation}>
    <strong>Verified citation sample (separate search-enabled execution)</strong>
    {!rows.length && <p>Citation status: Not measured</p>}
    {rows.map(p => <div key={p.response_id}>
      <p>{p.provider} / {p.model}. Citation status: {p.status === "measured" ? "Measured" : p.status === "failed" ? "Failed / Not measured" : "Not measured"}</p>
      {p.status === "measured" && <>
        <p>Target cited: {p.target_cited ? "Yes" : "No"}. Verified sources: {p.verified_source_count}.</p>
        <p>Target pages: {p.target_pages.length ? p.target_pages.map(url => <React.Fragment key={url}><SourceLink url={url} />{" "}</React.Fragment>) : "None observed"}</p>
        <details><summary>Inspect verified source links</summary>
          {report.citation_visibility?.initial.evidence.filter(e => e.response_id === p.response_id && e.provider === p.provider).map(e => <p key={e.normalized_url}><SourceLink url={e.normalized_url} /> ({e.attribution.replaceAll("_", " ")})</p>)}
        </details>
      </>}
    </div>)}
  </div>;
}
