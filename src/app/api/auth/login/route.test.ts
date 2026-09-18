import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

function backendLoginResponse(overrides: Partial<{ status: number; body: unknown }> = {}) {
  return new Response(
    JSON.stringify(overrides.body ?? { token: "session-token-1", user: { id: "u1", email: "a@example.com" } }),
    { status: overrides.status ?? 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("POST /api/auth/login proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sets the geo_session cookie on a successful login", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backendLoginResponse()));

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "a@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("geo_session=session-token-1");
    expect(setCookie).toContain("HttpOnly");
  });

  it("does not call the claim endpoint when there is no anonymous cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(backendLoginResponse());
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "a@example.com", password: "password123" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1); // only /auth/login, no claim round-trip
  });

  it("claims anonymous audits server-side when the browser has a geo_anon_token cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (String(url).endsWith("/auth/login")) return Promise.resolve(backendLoginResponse());
      if (String(url).endsWith("/auth/claim-anonymous-audits")) {
        return Promise.resolve(
          new Response(JSON.stringify({ claimed: 1 }), {
            status: 200,
            headers: { "set-cookie": "geo_anon_token=; Max-Age=0; Path=/; HttpOnly; SameSite=lax" },
          }),
        );
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=raw-anon-token" },
        body: JSON.stringify({ email: "a@example.com", password: "password123" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const claimCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/auth/claim-anonymous-audits"))!;
    const claimHeaders = claimCall[1]!.headers as Record<string, string>;
    expect(claimHeaders.Authorization).toBe("Bearer session-token-1");
    expect(claimHeaders.Cookie).toBe("geo_anon_token=raw-anon-token");

    // The now-expired geo_anon_token cookie is relayed alongside the new geo_session one.
    const setCookie = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
    const joined = setCookie.join(" | ");
    expect(joined).toContain("geo_session=session-token-1");
    expect(joined).toContain("geo_anon_token=");
    expect(joined).toContain("Max-Age=0");
  });

  it("does not clear the anonymous cookie when the claim call fails or claims nothing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn((url: string) => {
      if (String(url).endsWith("/auth/login")) return Promise.resolve(backendLoginResponse());
      if (String(url).endsWith("/auth/claim-anonymous-audits")) {
        // claimed: 0 -> FastAPI never sets a Set-Cookie header in this case.
        return Promise.resolve(new Response(JSON.stringify({ claimed: 0 }), { status: 200 }));
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=raw-anon-token" },
        body: JSON.stringify({ email: "a@example.com", password: "password123" }),
      }),
    );

    const setCookie = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
    const joined = setCookie.join(" | ");
    expect(joined).toContain("geo_session=session-token-1");
    expect(joined).not.toContain("geo_anon_token");
  });

  it("login still succeeds even if the claim call throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn((url: string) => {
      if (String(url).endsWith("/auth/login")) return Promise.resolve(backendLoginResponse());
      if (String(url).endsWith("/auth/claim-anonymous-audits")) return Promise.reject(new Error("network blip"));
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=raw-anon-token" },
        body: JSON.stringify({ email: "a@example.com", password: "password123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).user).toBeDefined();
  });

  it("never includes the raw anon token or session token in the JSON body", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).endsWith("/auth/login")) return Promise.resolve(backendLoginResponse());
        return Promise.resolve(
          new Response(JSON.stringify({ claimed: 1 }), {
            status: 200,
            headers: { "set-cookie": "geo_anon_token=; Max-Age=0; Path=/" },
          }),
        );
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=super-secret-raw-token" },
        body: JSON.stringify({ email: "a@example.com", password: "password123" }),
      }),
    );

    const text = await response.text();
    expect(text).not.toContain("super-secret-raw-token");
    expect(text).not.toContain("session-token-1");
  });

  it("returns the backend's error and does not set any cookie on failed login", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(backendLoginResponse({ status: 401, body: { detail: "Invalid email or password" } })),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "a@example.com", password: "wrong" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
