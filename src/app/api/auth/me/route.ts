import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { SESSION_COOKIE } from "@/lib/session";

// Called optimistically on every page load to recover the signed-in state
// from the HttpOnly cookie, so a refresh (or a new tab) keeps the user
// logged in without ever exposing the session token to client JS.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const apiUrl = requireBackendUrl();
    const backendRes = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!backendRes.ok) {
      const res = NextResponse.json({ user: null });
      if (backendRes.status === 401) res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    const data = await backendRes.json();
    return NextResponse.json({ user: data.user ?? null });
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return NextResponse.json({ error: error.message, user: null }, { status: 500 });
    }
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
