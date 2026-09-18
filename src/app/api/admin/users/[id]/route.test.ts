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

describe("GET /api/admin/users/[id] proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards the id and session cookie to FastAPI", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ user: { id: "u-42" }, audits: [], payments: [], entitlements: [] });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/users/u-42", { headers: { Cookie: "geo_session=sess-abc" } }),
      { params: Promise.resolve({ id: "u-42" }) },
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/admin/users/u-42",
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer sess-abc" } }),
    );
  });

  it("URL-encodes the customer id", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ user: {} });

    await GET(
      new NextRequest("http://localhost/api/admin/users/x", { headers: { Cookie: "geo_session=s" } }),
      { params: Promise.resolve({ id: "a/b c" }) },
    );

    expect(fetchMock.mock.calls[0][0]).toBe("http://backend.test/admin/users/a%2Fb%20c");
  });

  it("preserves a FastAPI 404 for an unknown customer", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ detail: "User not found" }, 404);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/users/ghost", { headers: { Cookie: "geo_session=sess-abc" } }),
      { params: Promise.resolve({ id: "ghost" }) },
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ detail: "User not found" });
  });

  it("preserves a FastAPI 403 for a non-admin session", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ detail: "Admin access required" }, 403);

    const res = await GET(
      new NextRequest("http://localhost/api/admin/users/u-42", { headers: { Cookie: "geo_session=sess-abc" } }),
      { params: Promise.resolve({ id: "u-42" }) },
    );

    expect(res.status).toBe(403);
  });

  it("returns 401 without a session cookie", async () => {
    const fetchMock = mockFetch({});
    const res = await GET(
      new NextRequest("http://localhost/api/admin/users/u-42"),
      { params: Promise.resolve({ id: "u-42" }) },
    );
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never echoes the session token into the response", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ user: { id: "u-42" } });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/users/u-42", { headers: { Cookie: "geo_session=super-secret-token" } }),
      { params: Promise.resolve({ id: "u-42" }) },
    );

    expect(await res.text()).not.toContain("super-secret-token");
  });
});
