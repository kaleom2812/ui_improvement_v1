import type { ViewModel } from "@/lib/adapter";
import TechnicalSection from "@/components/reports/TechnicalSection";

// Technical tab: GEO readiness, the crawler-access table and copy-paste robots.txt / llms.txt / schema. Real backend data via the ViewModel; honest empty state when the source is missing.

export default function Technical({ vm }: { vm: ViewModel }) {
  return <TechnicalSection vm={vm} />;
}
