import type { ViewModel } from "@/lib/adapter";
import CompetitorsSection from "@/components/reports/CompetitorsSection";

// Competitors tab: share of AI voice and the tracked competitor set, from company_profile + competitor_intelligence. Real backend data via the ViewModel; honest empty state when the source is missing.

export default function Competitors({ vm }: { vm: ViewModel }) {
  return <CompetitorsSection vm={vm} />;
}
