import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { SESSION_COOKIE } from "@/lib/session";

// Secure transport only: forwards the HttpOnly session cookie to FastAPI as a
// Bearer token. FastAPI's `_require_admin` is the authoritative admin check —
// this route never inspects or trusts any `is_admin` value from the client.
// FastAPI's 404 for an unknown customer is passed through unchanged.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const apiUrl = requireBackendUrl();
    const backendRes = await fetch(`${apiUrl}/admin/users/${encodeURIComponent(id)}`, {
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
    console.error("[API/admin/users/[id]] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not connect to FastAPI backend" }, { status: 500 });
  }
}
