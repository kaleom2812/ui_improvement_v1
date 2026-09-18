import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

// Mirrors app/api/auth/login/route.test.ts closely — this route is the same
// proxy shape (forward -> set geo_session -> best-effort claim), just with a
// Google ID token instead of an email/password pair as the identity input.

function backendGoogleResponse(overrides: Partial<{ status: number; body: unknown }> = {}) {
  return new Response(
    JSON.stringify(overrides.body ?? { token: "session-token-1", user: { id: "u1", email: "a@example.com" } }),
    { status: overrides.status ?? 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("POST /api/auth/google proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects a request with no credential, without calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/auth/google", { method: "POST", body: JSON.stringify({}) }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-string credential, without calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: 12345 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the credential to FastAPI unmodified", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(backendGoogleResponse());
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: "raw-google-id-token" }),
      }),
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://backend.test/auth/google");
    expect(JSON.parse(init!.body as string)).toEqual({ credential: "raw-google-id-token" });
  });

  it("sets the geo_session cookie on a successful Google sign-in", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(backendGoogleResponse()));

    const response = await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: "raw-google-id-token" }),
      }),
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("geo_session=session-token-1");
    expect(setCookie).toContain("HttpOnly");
    // The raw session token never appears in the JSON body — only in the cookie.
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("session-token-1");
  });

  it("does not call the claim endpoint when there is no anonymous cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(backendGoogleResponse());
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: "raw-google-id-token" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1); // only /auth/google, no claim round-trip
  });

  it("claims anonymous audits server-side exactly like login/signup, when the browser has a geo_anon_token cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (String(url).endsWith("/auth/google")) return Promise.resolve(backendGoogleResponse());
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
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=raw-anon-token" },
        body: JSON.stringify({ credential: "raw-google-id-token" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const claimCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/auth/claim-anonymous-audits"))!;
    const claimHeaders = claimCall[1]!.headers as Record<string, string>;
    expect(claimHeaders.Authorization).toBe("Bearer session-token-1");
    expect(claimHeaders.Cookie).toBe("geo_anon_token=raw-anon-token");

    const setCookie = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
    const joined = setCookie.join(" | ");
    expect(joined).toContain("geo_session=session-token-1");
    expect(joined).toContain("geo_anon_token=");
    expect(joined).toContain("Max-Age=0");
  });

  it("does not clear the anonymous cookie when the claim call claims nothing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    const fetchMock = vi.fn((url: string) => {
      if (String(url).endsWith("/auth/google")) return Promise.resolve(backendGoogleResponse());
      if (String(url).endsWith("/auth/claim-anonymous-audits")) {
        return Promise.resolve(new Response(JSON.stringify({ claimed: 0 }), { status: 200 }));
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=raw-anon-token" },
        body: JSON.stringify({ credential: "raw-google-id-token" }),
      }),
    );

    const setCookie = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
    const joined = setCookie.join(" | ");
    expect(joined).toContain("geo_session=session-token-1");
    expect(joined).not.toContain("geo_anon_token");
  });

  it("Google sign-in still succeeds even if the claim call throws", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).endsWith("/auth/google")) return Promise.resolve(backendGoogleResponse());
        if (String(url).endsWith("/auth/claim-anonymous-audits")) return Promise.reject(new Error("network blip"));
        throw new Error(`unexpected fetch to ${url}`);
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=raw-anon-token" },
        body: JSON.stringify({ credential: "raw-google-id-token" }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).user).toBeDefined();
  });

  it("never includes the raw credential, session token, or anon token in the JSON body", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (String(url).endsWith("/auth/google")) return Promise.resolve(backendGoogleResponse());
        return Promise.resolve(
          new Response(JSON.stringify({ claimed: 1 }), {
            status: 200,
            headers: { "set-cookie": "geo_anon_token=; Max-Age=0; Path=/" },
          }),
        );
      }),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        headers: { Cookie: "geo_anon_token=super-secret-raw-anon-token" },
        body: JSON.stringify({ credential: "super-secret-raw-google-credential" }),
      }),
    );

    const text = await response.text();
    expect(text).not.toContain("super-secret-raw-google-credential");
    expect(text).not.toContain("super-secret-raw-anon-token");
    expect(text).not.toContain("session-token-1");
  });

  it("returns the backend's error and does not set any cookie on a rejected Google credential", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://backend.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(backendGoogleResponse({ status: 401, body: { detail: "Invalid Google credential" } })),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: "tampered" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
