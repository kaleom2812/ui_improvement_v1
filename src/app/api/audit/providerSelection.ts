export function getAuditProviders(): string[] | undefined {
  const configured = process.env.NEXT_AUDIT_PROVIDERS || process.env.ACTIVE_PROVIDERS;
  if (!configured) {
    return undefined;
  }

  const providers = configured
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);

  return providers.length > 0 ? providers : undefined;
}
