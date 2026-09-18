import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

describe("POST /api/audit proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends the expected audit payload to the backend", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubEnv("NEXT_AUDIT_PROVIDERS", "mock");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ audit_id: "audit-1", status: "processing" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/audit", {
        method: "POST",
        headers: { Cookie: "geo_session=test-token" },
        body: JSON.stringify({ url: "example.com", org: "Example", industry: "saas" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/audit",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
        body: JSON.stringify({
          url: "example.com",
          org: "Example",
          industry: "saas",
          description: "",
          custom_prompts: "",
          prompts: 8,
          providers: ["mock"],
        }),
      }),
    );
    expect(response.headers.get("x-geo-backend-url-configured")).toBe("true");
    expect(response.headers.get("x-geo-backend-hostname")).toBe("backend.test");
  });

  it("proceeds anonymously when there is no session cookie (no Authorization sent to the backend)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ audit_id: "anon-audit-1", status: "processing" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new NextRequest("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify({ url: "example.com" }),
    }));

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers as Record<string, string>).not.toHaveProperty("Authorization");
  });

  it("forwards an existing geo_anon_token cookie to the backend (never Authorization)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ audit_id: "anon-audit-2", status: "processing" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(new NextRequest("http://localhost/api/audit", {
      method: "POST",
      headers: { Cookie: "geo_anon_token=existing-raw-token" },
      body: JSON.stringify({ url: "example.com" }),
    }));

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Cookie).toBe("geo_anon_token=existing-raw-token");
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("relays a freshly minted geo_anon_token Set-Cookie from FastAPI to the browser", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ audit_id: "anon-audit-3", status: "processing" }), {
        status: 200,
        headers: { "set-cookie": "geo_anon_token=fresh-raw-token; HttpOnly; Path=/; SameSite=lax; Max-Age=604800" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new NextRequest("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify({ url: "example.com" }),
    }));

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("geo_anon_token=fresh-raw-token");
    expect(setCookie).toContain("HttpOnly");
    // The raw token is relayed only via the Set-Cookie header, never in the body.
    const body = await response.text();
    expect(body).not.toContain("fresh-raw-token");
  });

  it("does not relay a Set-Cookie header that isn't geo_anon_token", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ audit_id: "anon-audit-4", status: "processing" }), {
        status: 200,
        headers: { "set-cookie": "some_other_cookie=unrelated-value; Path=/" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new NextRequest("http://localhost/api/audit", {
      method: "POST",
      body: JSON.stringify({ url: "example.com" }),
    }));

    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("allows a URL-only audit request", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ audit_id: "audit-1", status: "processing" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/audit", {
        method: "POST",
        headers: { Cookie: "geo_session=test-token" },
        body: JSON.stringify({ url: "example.com" }),
      }),
    );

    expect(response.status).toBe(200);
  });

  it("returns 400 when url and org are missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/audit", {
        method: "POST",
        headers: { Cookie: "geo_session=test-token" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "url or org is required" });
  });

  it("returns a stable error when the backend cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const response = await POST(
      new NextRequest("http://localhost/api/audit", {
        method: "POST",
        headers: { Cookie: "geo_session=test-token" },
        body: JSON.stringify({ url: "example.com", org: "Example" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Could not connect to FastAPI backend" });
  });

  it("returns a clear configuration error in production when the backend URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    const response = await POST(
      new NextRequest("http://localhost/api/audit", {
        method: "POST",
        headers: { Cookie: "geo_session=test-token" },
        body: JSON.stringify({ url: "example.com", org: "Example" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "NEXT_PUBLIC_API_URL is required in production and must point to the Railway backend",
      diagnostic: {
        backendUrlConfigured: false,
        backendHostname: null,
      },
    });
  });

  it("rejects localhost backend URLs in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:8000");

    const response = await POST(
      new NextRequest("http://localhost/api/audit", {
        method: "POST",
        headers: { Cookie: "geo_session=test-token" },
        body: JSON.stringify({ url: "example.com", org: "Example" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "NEXT_PUBLIC_API_URL must not use 127.0.0.1 in production",
      diagnostic: {
        backendUrlConfigured: true,
        backendHostname: "127.0.0.1",
      },
    });
  });
});
