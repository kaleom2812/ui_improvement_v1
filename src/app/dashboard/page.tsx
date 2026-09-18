import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; auditId?: string }>;
}) {
  const { domain, auditId } = await searchParams;

  return <DashboardClient auditId={auditId} domain={domain} />;
}