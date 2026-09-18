// Shared constants for the HttpOnly session cookie used by the /api/auth/*
// route handlers (src/app/api/auth/**). The cookie holds an opaque session
// token issued by the FastAPI backend (see geo_pipeline/auth.py) — the token
// itself is meaningless to the browser and is only ever forwarded server-side
// as an Authorization header when proxying to the backend.

import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "geo_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches backend SESSION_TTL_DAYS

// The anonymous-audit capability cookie (see geo_pipeline/api.py). Unlike
// SESSION_COOKIE, Next.js never sets or reads this cookie's *value* — FastAPI
// is the sole authority that mints, hashes, and clears it. Next.js only ever
// relays it: forwards whatever the browser sent as a `Cookie` header on the
// outgoing fetch to FastAPI, and relays FastAPI's `Set-Cookie` response back
// to the browser. The raw value is never parsed, logged, or exposed to
// client-side JS here.
export const ANON_TOKEN_COOKIE = "geo_anon_token";

/**
 * Relay only the geo_anon_token Set-Cookie header(s) from a FastAPI response
 * onto an outgoing NextResponse. Deliberately narrow — this never blindly
 * forwards every upstream response header, only the one cookie this proxy
 * layer is responsible for passing through untouched.
 */
export function forwardAnonTokenCookie(upstream: Response, outgoing: NextResponse): void {
  const setCookieValues =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie") as string]
        : [];
  for (const cookie of setCookieValues) {
    if (cookie.startsWith(`${ANON_TOKEN_COOKIE}=`)) {
      outgoing.headers.append("set-cookie", cookie);
    }
  }
}
