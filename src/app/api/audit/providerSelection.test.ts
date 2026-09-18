import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuditProviders } from "./providerSelection";

describe("getAuditProviders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not force real providers when no provider env is configured", () => {
    vi.stubEnv("NEXT_AUDIT_PROVIDERS", "");
    vi.stubEnv("ACTIVE_PROVIDERS", "");

    expect(getAuditProviders()).toBeUndefined();
  });

  it("reads provider configuration from the environment", () => {
    vi.stubEnv("NEXT_AUDIT_PROVIDERS", "mock, openai");

    expect(getAuditProviders()).toEqual(["mock", "openai"]);
  });
});
