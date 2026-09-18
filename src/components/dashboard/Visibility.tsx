import type { ViewModel } from "@/lib/adapter";
import AiVisibilitySection from "@/components/reports/AiVisibilitySection";

// Visibility tab: AI visibility by model — presence, sentiment, access — from geo_score per-provider data and report_summary. Real backend data via the ViewModel; honest empty state when the source is missing.

export default function Visibility({ vm }: { vm: ViewModel }) {
  return <AiVisibilitySection vm={vm} />;
}
