import type { ViewModel } from "@/lib/adapter";
import CitationsSection from "@/components/reports/CitationsSection";

// Citations tab: most-cited domains and your citation share, from citation_source_breakdown. Real backend data via the ViewModel; honest empty state when the source is missing.

export default function Citations({ vm }: { vm: ViewModel }) {
  return <CitationsSection vm={vm} />;
}
