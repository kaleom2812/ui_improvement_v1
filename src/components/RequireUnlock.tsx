"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuditFlow } from "@/state/audit-flow";
import { FullPageLoading } from "./Loading";

/**
 * Gate for the interactive dashboard. Ported from the approved prototype's
 * <RequireUnlock> (GEO-UI-Version-5/src/App.jsx). When not unlocked, redirects
 * to the report preview / paywall.
 *
 * The production geo-dashboard renders /dashboard freely. To restore that
 * behaviour when porting, set REQUIRE_DASHBOARD_UNLOCK to false (or remove this
 * wrapper). See FINAL-INTEGRATION.md § Paywall.
 */
export const REQUIRE_DASHBOARD_UNLOCK = true;

export function RequireUnlock({ auditId, children }: { auditId?: string; children: ReactNode }) {
  const router = useRouter();
  const { unlocked: lastAuditUnlocked, account, hydrated, authLoaded } = useAuditFlow();
  // `unlocked` depends on the account fetched from the backend (GET
  // /api/auth/me), so wait for that to resolve too — otherwise a paid,
  // signed-in user would be bounced during the brief window before their
  // session/entitlement loads back in on refresh.
  const ready = hydrated && authLoaded;

  // When a specific audit is requested (e.g. /dashboard?auditId=<id> from "My
  // Reports"), decide unlock status directly from THAT id + account.paidAuditIds
  // instead of the AuditFlow context's `unlocked`, which is keyed on `lastAudit`
  // — a value from localStorage that DashboardClient/GeoDashboard only update
  // *after* this component has already rendered/redirected, so it can still be
  // pointing at a different (or no) audit on the very first render of a new
  // auditId. Falls back to the existing `lastAudit`-based value when no auditId
  // is supplied, preserving current behaviour for that flow unchanged. This is a
  // client-side UX gate only — GET /api/audit/{id}'s entitlement check remains
  // the actual security boundary.
  const unlocked = auditId ? !!account?.isAdmin || !!account?.paidAuditIds.includes(auditId) : lastAuditUnlocked;

  useEffect(() => {
    if (!REQUIRE_DASHBOARD_UNLOCK) return;
    if (ready && !unlocked) router.replace("/audit/report");
  }, [unlocked, ready, router]);

  if (!REQUIRE_DASHBOARD_UNLOCK) return <>{children}</>;
  if (!ready) return <FullPageLoading label="Checking access…" />;
  if (!unlocked) return <FullPageLoading label="Redirecting…" />;
  return <>{children}</>;
}
