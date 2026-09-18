import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { ANON_TOKEN_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, forwardAnonTokenCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const apiUrl = requireBackendUrl();
    const backendRes = await fetch(`${apiUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: body.name ?? "",
        email: body.email ?? "",
        password: body.password ?? "",
      }),
    });
    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json({ error: data.detail || "Sign up failed" }, { status: backendRes.status });
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
    // signing up, so they become owned by the account that was just created —
    // same audit id, no new row, no new payment. Entirely server-side: the
    // anon token is read from the incoming request's HttpOnly cookie here and
    // forwarded to FastAPI, never touched by client JS and never put in this
    // response's JSON body. A failure here must never fail the signup itself,
    // and a cookie is only cleared once FastAPI confirms something was
    // actually claimed (see forwardAnonTokenCookie).
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
        // Claiming is best-effort — the account above is already created.
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
