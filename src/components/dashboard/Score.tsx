import type { ViewModel } from "@/lib/adapter";
import OverviewSection from "@/components/reports/OverviewSection";
import ExecutiveSummarySection from "@/components/reports/ExecutiveSummarySection";

// Score tab: the GEO score + dimension breakdown + headline metrics (Overview),
// and the written executive report + playbook (ExecutiveSummary -> MarkdownReportViewer).
// All real backend data; each block shows an honest empty state when its source is missing.

export default function Score({ vm }: { vm: ViewModel }) {
  return (
    <div className="space-y-12">
      <OverviewSection vm={vm} />
      <ExecutiveSummarySection vm={vm} />
    </div>
  );
}
