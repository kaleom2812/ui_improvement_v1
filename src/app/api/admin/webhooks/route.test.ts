import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function calledUrl(fetchMock: ReturnType<typeof vi.fn>) {
  return new URL(fetchMock.mock.calls[0][0] as string);
}

describe("GET /api/admin/webhooks proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards the session cookie as a Bearer token to FastAPI /admin/webhooks", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ webhook_events: [], summary: { total: 0 } });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/webhooks", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/admin/webhooks",
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer sess-abc" } }),
    );
  });

  it("forwards only page/limit/sort/order, dropping anything else", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ webhook_events: [] });

    await GET(
      new NextRequest(
        "http://localhost/api/admin/webhooks?page=2&limit=25&sort=received_at&order=asc" +
          "&search=acme&status=paid&is_admin=1&evil=1",
        { headers: { Cookie: "geo_session=sess-abc" } },
      ),
    );

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe("/admin/webhooks");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "2",
      limit: "25",
      sort: "received_at",
      order: "asc",
    });
    // webhook_events has no search/status filters; is_admin/evil are untrusted
    expect(url.searchParams.has("search")).toBe(false);
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.has("is_admin")).toBe(false);
    expect(url.searchParams.has("evil")).toBe(false);
  });

  it("returns 401 and never calls the backend without a session cookie", async () => {
    const fetchMock = mockFetch({});
    const res = await GET(new NextRequest("http://localhost/api/admin/webhooks?page=1"));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves a FastAPI 403 for a non-admin session", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ detail: "Admin access required" }, 403);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/webhooks", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ detail: "Admin access required" });
  });

  it("passes the FastAPI 200 body and status straight through", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const payload = {
      webhook_events: [{ event_id: "pay_1", received_at: "2026-01-01T00:00:00+00:00" }],
      page: 1,
      total: 1,
      summary: { total: 1 },
    };
    mockFetch(payload, 200);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/webhooks", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(payload);
  });

  it("never echoes the session token and never targets the private worker", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ webhook_events: [] });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/webhooks", { headers: { Cookie: "geo_session=super-secret-token" } }),
    );

    expect(await res.text()).not.toContain("super-secret-token");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain("/v1/admin");
    expect(url).not.toContain("super-secret-token");
  });
});
