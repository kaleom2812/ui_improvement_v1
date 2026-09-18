import { NextRequest, NextResponse } from "next/server";
import { BackendConfigurationError, requireBackendUrl } from "@/lib/backendUrl";
import { SESSION_COOKIE } from "@/lib/session";

// Proxy to the FastAPI backend, which verifies the Razorpay signature +
// payment status server-side and grants the per-audit entitlement.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const apiUrl = requireBackendUrl();
    const backendRes = await fetch(`${apiUrl}/payment/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        audit_id: typeof body.auditId === "string" ? body.auditId : "",
        razorpay_payment_id: body.razorpay_payment_id ?? "",
        razorpay_order_id: body.razorpay_order_id ?? "",
        razorpay_signature: body.razorpay_signature ?? "",
      }),
    });
    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json({ error: data.detail || "Payment verification failed" }, { status: backendRes.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not connect to the payment backend" }, { status: 500 });
  }
}
