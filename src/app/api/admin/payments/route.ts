import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { SESSION_COOKIE } from "@/lib/session";

// Only the parameters GET /admin/payments documents are forwarded — anything
// else in the query string is dropped.
const FORWARDED_PARAMS = [
  "page",
  "limit",
  "status",
  "user_id",
  "audit_id",
  "search",
  "start_date",
  "end_date",
  "sort",
  "order",
] as const;

// Secure transport only: forwards the HttpOnly session cookie to FastAPI as a
// Bearer token. FastAPI's `_require_admin` is the authoritative admin check —
// this route never inspects or trusts any `is_admin` value from the client.
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
    const backendRes = await fetch(`${apiUrl}/admin/payments${query ? `?${query}` : ""}`, {
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
    console.error("[API/admin/payments] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not connect to FastAPI backend" }, { status: 500 });
  }
}
