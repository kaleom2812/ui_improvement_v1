import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { promptCitation } from "@/lib/citationVisibility";
import { ANON_TOKEN_COOKIE, SESSION_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Anonymous auditing is intentional — a logged-out visitor with the
  // matching geo_anon_token cookie can poll/read their own free audit. A
  // missing session no longer short-circuits here; FastAPI's optional-auth
  // dependency + get_anonymous_audit() decide authorization, requiring both
  // the audit id and a matching token (never the id alone).
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  const anonToken = req.cookies.get(ANON_TOKEN_COOKIE)?.value;

  try {
    const apiUrl = requireBackendUrl();
    const headers: Record<string, string> = {};
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    if (anonToken) headers.Cookie = `${ANON_TOKEN_COOKIE}=${anonToken}`;
    const response = await fetch(`${apiUrl}/api/audit/${id}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Backend error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();

    // --- Transform backend data to match frontend expectations ---
    if (["complete", "incomplete"].includes(data?.status) && data?.data) {
      const report = data.data;
      
      if (report.geo_score) {
        const gs = report.geo_score;

        // Map ai_share_of_voice to share_of_voice
        if (gs.ai_share_of_voice !== undefined && gs.share_of_voice === undefined) {
          gs.share_of_voice = gs.ai_share_of_voice;
        }

        // Map AI execution responses -> report.queries for legacy fallback views.
        //    Frontend reads data.queries[].prompt / .engine / .is_mentioned / .snippet
        const responses = report.execution_batch?.responses ?? [];
        if (responses.length > 0 && !report.queries) {
          report.queries = responses.map((r: any) => {
            const brandMention = (r.mentions ?? []).find((mention: any) => mention.brand === report.organization_name);
            const citationRows = promptCitation(report.report_summary || {}, r.prompt_id, r.provider);
            const measuredCitations = citationRows.filter(row => row.status === "measured");
            return ({
            prompt: r.prompt_text ?? "",
            engine: r.provider ?? "",
            is_mentioned: brandMention?.mentioned ?? false,
            is_cited: measuredCitations.length ? measuredCitations.some(row => row.target_cited === true) : null,
            citation_measurement_status: measuredCitations.length ? "measured" : "not_available",
            snippet: r.raw_response ? r.raw_response.slice(0, 200) + "..." : "",
            full_response: r.raw_response ?? "",
            sources: (r.citations ?? []).map((c: any) => ({
              title: c.source_title || c.url,
              url: c.url,
            })),
            position: brandMention?.position_in_response ?? null,
            sentiment: brandMention?.sentiment ?? "",
            error: r.error ?? "",
          });
          });
        }
      }

      // 3. llms_txt is now provided directly in the JSON payload by the FastAPI backend
      // No local filesystem reading required.
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[API/audit/${id}] Error:`, message);
    return NextResponse.json({ error: "Could not connect to FastAPI backend" }, { status: 500 });
  }
}
