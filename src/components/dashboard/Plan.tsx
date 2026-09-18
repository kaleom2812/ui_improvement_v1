import type { ViewModel } from "@/lib/adapter";
import ActionCenterSection from "@/components/reports/ActionCenterSection";
import RoadmapSection from "@/components/reports/RoadmapSection";

// Plan tab: the prioritised action list with the impact/effort quadrant
// (ActionCenter), then the phased roadmap / detailed playbook (Roadmap). Impact
// and effort come from gap_report severity/effort via the adapter; the playbook
// is the backend's detailed_playbook markdown. No invented projected outcomes.

export default function Plan({ vm }: { vm: ViewModel }) {
  return (
    <div className="space-y-12">
      <ActionCenterSection vm={vm} />
      <RoadmapSection vm={vm} />
    </div>
  );
}
