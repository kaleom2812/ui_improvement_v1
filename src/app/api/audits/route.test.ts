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

describe("GET /api/audits proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards the session cookie as a Bearer token", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ audits: [] });

    const res = await GET(
      new NextRequest("http://localhost/api/audits", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/audits",
      expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer sess-abc" } }),
    );
  });

  it("forwards only the documented limit query parameter, dropping anything else", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = mockFetch({ audits: [] });

    await GET(
      new NextRequest("http://localhost/api/audits?limit=10&user_id=other-user&status=complete", {
        headers: { Cookie: "geo_session=sess-abc" },
      }),
    );

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/audits");
    expect(Object.fromEntries(url.searchParams)).toEqual({ limit: "10" });
    expect(url.searchParams.has("user_id")).toBe(false);
    expect(url.searchParams.has("status")).toBe(false);
  });

  it("returns 401 without a session cookie and never calls the backend", async () => {
    const fetchMock = mockFetch({});
    const res = await GET(new NextRequest("http://localhost/api/audits"));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates a FastAPI error status and body unchanged", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ detail: "Not authenticated" }, 401);

    const res = await GET(
      new NextRequest("http://localhost/api/audits", { headers: { Cookie: "geo_session=expired-token" } }),
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ detail: "Not authenticated" });
  });

  it("propagates a backend 500 as-is", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ detail: "Internal Server Error" }, 500);

    const res = await GET(
      new NextRequest("http://localhost/api/audits", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(500);
  });

  it("returns 500 with a config error message when the backend URL is misconfigured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(
      new NextRequest("http://localhost/api/audits", { headers: { Cookie: "geo_session=sess-abc" } }),
    );

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never echoes the session token into the response", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    mockFetch({ audits: [] });

    const res = await GET(
      new NextRequest("http://localhost/api/audits", { headers: { Cookie: "geo_session=super-secret-token" } }),
    );

    expect(await res.text()).not.toContain("super-secret-token");
  });
});
