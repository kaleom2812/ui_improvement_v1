import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { ANON_TOKEN_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, forwardAnonTokenCookie } from "@/lib/session";

// Mirrors /api/auth/login and /api/auth/signup exactly (same cookie, same
// options, same anonymous-audit claim step) — see those route handlers. The
// only difference is what identifies the user: a Google ID token instead of
// an email/password pair. The token is treated as opaque end to end: never
// decoded, never modified, never logged here — only forwarded to FastAPI's
// POST /auth/google, which is the sole place it is ever verified
// (geo_pipeline/google_auth.py).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const credential = typeof body?.credential === "string" ? body.credential : "";
  if (!credential) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const apiUrl = requireBackendUrl();
    const backendRes = await fetch(`${apiUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json({ error: data.detail || "Google sign-in failed" }, { status: backendRes.status });
    }

    const res = NextResponse.json({ user: data.user });
    res.cookies.set(SESSION_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // Best-effort: claim any anonymous audit(s) this browser created before
    // signing in with Google, so they become owned by the account that just
    // authenticated — identical to the login/signup routes' own claim step
    // (same cookie, same endpoint, same forwarding helper). Entirely
    // server-side: the anon token is read from the incoming request's
    // HttpOnly cookie here and forwarded to FastAPI, never touched by client
    // JS and never put in this response's JSON body. A failure here must
    // never fail the sign-in itself.
    const anonToken = req.cookies.get(ANON_TOKEN_COOKIE)?.value;
    if (anonToken) {
      try {
        const claimRes = await fetch(`${apiUrl}/auth/claim-anonymous-audits`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.token}`,
            Cookie: `${ANON_TOKEN_COOKIE}=${anonToken}`,
          },
        });
        if (claimRes.ok) forwardAnonTokenCookie(claimRes, res);
      } catch {
        // Claiming is best-effort — the session above is already established.
      }
    }

    return res;
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not connect to FastAPI backend" }, { status: 500 });
  }
}
