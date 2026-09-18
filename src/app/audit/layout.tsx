"use client";

import { usePathname } from "next/navigation";
import { AuditStepper } from "@/components/AuditStepper";

// The static audit-flow screens (/audit, /audit/processing, /audit/results,
// /audit/report) get the stepper chrome. The dynamic /audit/[id] route — the
// production shareable-report route — renders the dashboard shell instead, so
// it is passed straight through with no stepper.
const STEPPED = ["/audit", "/audit/processing", "/audit/results", "/audit/report"];

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (STEPPED.includes(pathname)) return <AuditStepper>{children}</AuditStepper>;
  return <>{children}</>;
}
