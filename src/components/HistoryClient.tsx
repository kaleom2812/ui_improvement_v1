"use client";

// Client shell for /history. Session-presence gate only — the same
// convention used by /admin (see src/app/admin/layout.tsx): signed-out
// visitors are sent to sign in and back via ?redirect=, but nothing here
// decides who can see which reports. That authorization is entirely
// server-side (GET /api/audits -> FastAPI `_require_user`, scoped to the
// caller's own user id), which MyReports already relies on.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuditFlow } from "@/state/audit-flow";
import { FullPageLoading } from "./Loading";
import { MyReports } from "./MyReports";

export function HistoryClient() {
  const router = useRouter();
  const { account, authLoaded } = useAuditFlow();

  useEffect(() => {
    if (authLoaded && !account) {
      router.replace("/login?redirect=/history");
    }
  }, [authLoaded, account, router]);

  if (!authLoaded) return <FullPageLoading label="Loading…" />;
  if (!account) return <FullPageLoading label="Redirecting to sign in…" />;

  return (
    <>
      <section className="site-container py-12 sm:py-16">
        <p className="eyebrow">History</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Your previous reports</h1>
      </section>
      <MyReports hideHeading />
    </>
  );
}
