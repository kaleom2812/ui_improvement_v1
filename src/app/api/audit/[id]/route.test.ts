import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";
import fixtures from "@/components/reports/fixtures/verified-citations.json";

describe("GET /api/audit/[id] proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([["unavailable", null], ["zero", false], ["positive", true]] as const)("preserves nullable citation state for %s legacy proxy queries", async (name, cited) => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const summary = { ...fixtures.base, citation_visibility: fixtures.cases[name] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "complete", data: { organization_name: "HubSpot", geo_score: { total_score: 50 },
        report_summary: summary, execution_batch: { responses: [{ prompt_id: "p0", provider: "openai",
          citations: [{ url: "https://hubspot.com/legacy-unverified-url" }] }] } },
    }), { status: 200 })));
    const response = await GET(new NextRequest("http://localhost/api/audit/test", { headers: { Cookie: "geo_session=test-token" } }), { params: Promise.resolve({ id: "test" }) });
    const body = await response.json();
    expect(body.data.queries[0].is_cited).toBe(cited);
    expect(body.data.report_summary.citation_visibility).toEqual(summary.citation_visibility);
    expect(body.data.geo_score.total_score).toBe(50);
  });

  it("returns an incomplete report without converting unavailable scores to zero", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: "incomplete",
        data: {
          organization_name: "Example",
          geo_score: {
            total_score: null,
            score_status: "incomplete",
            ai_visibility_available: false,
            mention_rate: null,
            citation_rate: null,
            website_geo_readiness: 85,
          },
          report_summary: {
            header: { geo_score: null, score_status: "incomplete" },
          },
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    ));

    const response = await GET(
      new NextRequest("http://localhost/api/audit/audit-incomplete", { headers: { Cookie: "geo_session=test-token" } }),
      { params: Promise.resolve({ id: "audit-incomplete" }) },
    );
    const body = await response.json();

    expect(body.status).toBe("incomplete");
    expect(body.data.geo_score.total_score).toBeNull();
    expect(body.data.geo_score.mention_rate).toBeNull();
    expect(body.data.geo_score.citation_rate).toBeNull();
    expect(body.data.geo_score.website_geo_readiness).toBe(85);
  });

  it("forwards Authorization for an authenticated session (never a Cookie header)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "processing" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      new NextRequest("http://localhost/api/audit/test", { headers: { Cookie: "geo_session=test-token" } }),
      { params: Promise.resolve({ id: "test" }) },
    );

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(headers).not.toHaveProperty("Cookie");
  });

  it("forwards the geo_anon_token cookie for a logged-out visitor (no Authorization)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "processing" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("http://localhost/api/audit/anon-audit", { headers: { Cookie: "geo_anon_token=raw-anon-token" } }),
      { params: Promise.resolve({ id: "anon-audit" }) },
    );

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Cookie).toBe("geo_anon_token=raw-anon-token");
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("sends neither Authorization nor Cookie when the browser has no session and no anon token", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Audit not found" }), { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("http://localhost/api/audit/unknown"),
      { params: Promise.resolve({ id: "unknown" }) },
    );

    expect(response.status).toBe(404);
    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
    expect(headers).not.toHaveProperty("Cookie");
  });
});
