import type { ViewModel } from "@/lib/adapter";
import PagesSection from "@/components/reports/PagesSection";

// Content tab: page-level crawl findings and content gaps, from crawl_result + content_analysis. Real backend data via the ViewModel; honest empty state when the source is missing.

export default function Content({ vm }: { vm: ViewModel }) {
  return <PagesSection vm={vm} />;
}
