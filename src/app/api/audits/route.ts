import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { SESSION_COOKIE } from "@/lib/session";

// Only the parameter GET /api/audits documents is forwarded — anything else
// in the query string is dropped.
const FORWARDED_PARAMS = ["limit"] as const;

// Secure transport only: forwards the HttpOnly session cookie to FastAPI as a
// Bearer token. FastAPI's `_require_user` is the authoritative auth check and
// already scopes results to the authenticated user — this route never trusts
// any user id from the client. The backend response contains metadata only
// (no report_data), so it is passed through unmodified.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const forwarded = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = req.nextUrl.searchParams.get(key);
    if (value !== null) forwarded.set(key, value);
  }
  const query = forwarded.toString();

  try {
    const apiUrl = requireBackendUrl();
    const backendRes = await fetch(`${apiUrl}/api/audits${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("[API/audits] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not connect to FastAPI backend" }, { status: 500 });
  }
}
