"use client";

import GeoDashboard from "./GeoDashboard";
import { RequireUnlock } from "./RequireUnlock";
import { useAuditFlow } from "@/state/audit-flow";

/**
 * Client wrapper for /dashboard. Recovers the audit id/domain from query params
 * (production convention: /dashboard?domain=&auditId=) or, failing that, from
 * the persisted last audit, then renders the gated dashboard shell. Report
 * history has moved to /history (src/components/HistoryClient.tsx) — this
 * page now renders only the audit dashboard itself.
 */
export function DashboardClient({ auditId, domain }: { auditId?: string; domain?: string }) {
  const { lastAudit } = useAuditFlow();
  const id = auditId || lastAudit?.id || "";
  const dom = domain || lastAudit?.domain || "";
  return (
    <RequireUnlock auditId={id}>
      <GeoDashboard auditId={id} initialDomain={dom} />
    </RequireUnlock>
  );
}
