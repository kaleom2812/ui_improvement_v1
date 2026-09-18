import { NextRequest, NextResponse } from "next/server";
import { getAuditProviders } from "./providerSelection";
import { BackendConfigurationError, getBackendUrlConfig, requireBackendUrl } from "@/lib/backendUrl";
import { ANON_TOKEN_COOKIE, SESSION_COOKIE, forwardAnonTokenCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Anonymous auditing is intentional (a logged-out visitor can run a free
  // audit — see the anonymous-audit stages). A missing session no longer
  // short-circuits here; this proxy just forwards whatever credentials the
  // browser actually sent, and FastAPI's own optional-auth dependency decides
  // whether the request is authenticated or anonymous.
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  const anonToken = req.cookies.get(ANON_TOKEN_COOKIE)?.value;
  const { url, org, industry, description, custom_prompts } = await req.json();

  if (!url && !org) {
    return NextResponse.json({ error: "url or org is required" }, { status: 400 });
  }

  const providers = getAuditProviders();
  try {
    const backendConfig = getBackendUrlConfig();
    const apiUrl = requireBackendUrl();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    // Forwarded only so FastAPI can recognize a returning anonymous visitor
    // and reuse the same capability token — this value is never read, parsed,
    // or logged here, only passed through.
    if (anonToken) headers.Cookie = `${ANON_TOKEN_COOKIE}=${anonToken}`;

    const response = await fetch(`${apiUrl}/api/audit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        org: org ?? "",
        industry: industry ?? "auto",
        description: description ?? "",
        custom_prompts: custom_prompts ?? "",
        prompts: Number(process.env.NEXT_AUDIT_PROMPT_COUNT || 8),
        ...(providers ? { providers } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Backend error: ${errorText}`,
          diagnostic: {
            backendUrlConfigured: backendConfig.configured,
            backendHostname: backendConfig.hostname,
          },
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const nextRes = NextResponse.json(data, {
      headers: {
        "x-geo-backend-url-configured": String(backendConfig.configured),
        "x-geo-backend-hostname": backendConfig.hostname ?? "missing",
      },
    });
    // Only present when FastAPI just minted a fresh anonymous token (a
    // returning anonymous visitor's request never gets a new one) — relayed
    // as-is, never inspected.
    forwardAnonTokenCookie(response, nextRes);
    return nextRes;
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return NextResponse.json(
        {
          error: error.message,
          diagnostic: {
            backendUrlConfigured: process.env.NEXT_PUBLIC_API_URL?.trim().length ? true : false,
            backendHostname: process.env.NEXT_PUBLIC_API_URL
              ? (() => {
                  try {
                    return new URL(process.env.NEXT_PUBLIC_API_URL).hostname;
                  } catch {
                    return null;
                  }
                })()
              : null,
          },
        },
        { status: 500 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API/audit] Error:", message);
    return NextResponse.json({ error: "Could not connect to FastAPI backend" }, { status: 500 });
  }
}
