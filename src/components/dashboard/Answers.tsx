import type { ViewModel } from "@/lib/adapter";
import PromptEvidenceSection from "@/components/reports/PromptEvidenceSection";

// Answers tab: every captured AI answer with its outcome and analysis, from report.queries / prompt_explorer. Real backend data via the ViewModel; honest empty state when the source is missing.

export default function Answers({ vm }: { vm: ViewModel }) {
  return <PromptEvidenceSection vm={vm} />;
}
