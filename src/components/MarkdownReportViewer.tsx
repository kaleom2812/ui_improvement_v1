"use client";

// Rebuilt from geo-dashboard/src/components/MarkdownReportViewer.tsx.
// Renders the backend's `executive_report` and `detailed_playbook` markdown
// strings. Styling comes from the `.prose-report` block in globals.css.

import { useMemo, useState } from "react";
import { marked } from "marked";
import { usePrinting } from "./reports/print-context";
import { customerReportMarkdown } from "@/lib/customerReport";

interface Props {
  executiveReport?: string;
  detailedPlaybook?: string;
  /** Hide the tab bar and stack both docs (used by the print/export view). */
  stacked?: boolean;
}

function toHtml(md?: string): string {
  if (!md) return "";
  return marked.parse(customerReportMarkdown(md), { async: false }) as string;
}

export default function MarkdownReportViewer({ executiveReport, detailedPlaybook, stacked }: Props) {
  const printing = usePrinting();
  const [tab, setTab] = useState<"report" | "playbook">(executiveReport ? "report" : "playbook");

  const html = useMemo(
    () => ({ report: toHtml(executiveReport), playbook: toHtml(detailedPlaybook) }),
    [executiveReport, detailedPlaybook]
  );

  if (!executiveReport && !detailedPlaybook) return null;

  const showStacked = stacked || printing;

  if (showStacked) {
    return (
      <div className="space-y-8">
        {executiveReport && <div className="prose-report" dangerouslySetInnerHTML={{ __html: html.report }} />}
        {detailedPlaybook && (
          <div className="prose-report border-t border-line pt-8" dangerouslySetInnerHTML={{ __html: html.playbook }} />
        )}
      </div>
    );
  }

  return (
    <div>
      {executiveReport && detailedPlaybook && (
        <div className="mb-5 flex gap-1 rounded-lg border border-line bg-subtle p-1 text-sm">
          {[
            { id: "report" as const, label: "Executive report" },
            { id: "playbook" as const, label: "Action playbook" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
                tab === t.id ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div
        className="prose-report"
        dangerouslySetInnerHTML={{ __html: tab === "report" && executiveReport ? html.report : html.playbook }}
      />
    </div>
  );
}
