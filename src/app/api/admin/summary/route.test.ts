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

describe("GET /api/admin/summary proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards the session cookie to FastAPI as a Bearer token", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ total_users: 3 });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/summary", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ total_users: 3 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/admin/summary",
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer sess-abc" } }),
    );
  });

  it("returns 401 and never calls the backend without a session cookie", async () => {
    const fetchMock = mockFetch({});
    const res = await GET(new NextRequest("http://localhost/api/admin/summary"));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves a FastAPI 403 for a non-admin session", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ detail: "Admin access required" }, 403);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/summary", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ detail: "Admin access required" });
  });

  it("never echoes the session token into the response", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ total_users: 1 });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/summary", { headers: { Cookie: "geo_session=super-secret-token" } }),
    );

    expect(await res.text()).not.toContain("super-secret-token");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
