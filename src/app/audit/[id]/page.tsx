import type { AuditReport } from "@/lib/types";
import GeoDashboard from "@/components/GeoDashboard";
import {
  BackendConfigurationError,
  requireBackendUrl,
} from "@/lib/backendUrl";

async function loadReport(auditId: string): Promise<AuditReport | null> {
  try {
    const apiUrl = requireBackendUrl();

    const res = await fetch(`${apiUrl}/api/audit/${auditId}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (["complete", "incomplete"].includes(data.status) && data.data) {
      return data.data as AuditReport;
    }

    return null;
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      console.error("Backend configuration error:", error.message);
      return null;
    }

    console.error("Failed to load report:", error);
    return null;
  }
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const report = await loadReport(id);

  const domain = report?.website_url
    ? report.website_url
        .replace(/https?:\/\//, "")
        .replace(/\/$/, "")
    : "";

  return (
    <GeoDashboard
      auditId={id}
      initialDomain={domain}
      initialData={report}
    />
  );
}