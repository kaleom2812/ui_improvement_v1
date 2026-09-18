"use client";

import type { ViewModel } from "@/lib/adapter";
import { DashHead, Panel } from "./shared";
import { EmptyState } from "@/components/primitives";
import MarkdownReportViewer from "@/components/MarkdownReportViewer";

/** The narrative report — the backend's executive_report + detailed_playbook. */
export default function ExecutiveSummarySection({ vm }: { vm: ViewModel }) {
  const hasAny = vm.report.hasExecutive || vm.report.hasPlaybook;

  return (
    <>
      <DashHead title="Full report" lede={`The written analysis and action playbook for ${vm.brand}.`} />

      {vm.report.topRecommendations.length > 0 && (
        <Panel title="Top recommendations" className="mb-4">
          <ol className="space-y-2">
            {vm.report.topRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink-2">
                <span className="data-fig mt-0.5 text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                {rec}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {hasAny ? (
        <div className="card p-6">
          <MarkdownReportViewer
            executiveReport={vm.report.executiveMarkdown || undefined}
            detailedPlaybook={vm.report.playbookMarkdown || undefined}
          />
        </div>
      ) : (
        <EmptyState title="No written report">
          The backend did not return an <code className="rounded bg-subtle px-1 py-0.5 text-2xs">executive_report</code> or{" "}
          <code className="rounded bg-subtle px-1 py-0.5 text-2xs">detailed_playbook</code> for this audit.
        </EmptyState>
      )}
    </>
  );
}
