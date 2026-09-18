import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      const apiUrl = requireBackendUrl();
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      // Backend being unreachable should never block a client from logging
      // out locally — the cookie is cleared below regardless.
      if (!(error instanceof BackendConfigurationError)) {
        console.error("[API/auth/logout] Error:", error instanceof Error ? error.message : error);
      }
    }
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
