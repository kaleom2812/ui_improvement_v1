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

describe("GET /api/admin/audits proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards the session cookie as a Bearer token", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ audits: [], summary: {} });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/audits", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/admin/audits",
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer sess-abc" } }),
    );
  });

  it("forwards only the documented query parameters, dropping anything else", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ audits: [] });

    await GET(
      new NextRequest(
        "http://localhost/api/admin/audits?page=2&limit=25&status=failed&user_id=u1" +
          "&search=acme&start_date=2026-01-01&end_date=2026-02-01&sort=geo_score&order=desc&audit_id=a1&is_admin=1",
        { headers: { Cookie: "geo_session=sess-abc" } },
      ),
    );

    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe("/admin/audits");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "2",
      limit: "25",
      status: "failed",
      user_id: "u1",
      search: "acme",
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      sort: "geo_score",
      order: "desc",
    });
    // audit_id is not a documented /admin/audits param, and is_admin is untrusted
    expect(url.searchParams.has("audit_id")).toBe(false);
    expect(url.searchParams.has("is_admin")).toBe(false);
  });

  it("returns 401 without a session cookie", async () => {
    const fetchMock = mockFetch({});
    const res = await GET(new NextRequest("http://localhost/api/admin/audits?status=failed"));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves a FastAPI 403 for a non-admin session", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ detail: "Admin access required" }, 403);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/audits", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ detail: "Admin access required" });
  });

  it("never echoes the session token into the response", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ audits: [] });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/audits", { headers: { Cookie: "geo_session=super-secret-token" } }),
    );

    expect(await res.text()).not.toContain("super-secret-token");
  });
});
