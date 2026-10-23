import { NextResponse, type NextRequest } from "next/server";
import { createPaymongoProvider } from "@/lib/payments/paymongo";
import { applyPaymentEvent } from "@/server/payment-events";

export const dynamic = "force-dynamic";

/**
 * PayMongo webhook. Disabled unless PAYMENT_PROVIDER=paymongo. The raw body is verified against the
 * `Paymongo-Signature` header before anything is parsed or trusted; invalid signatures get 401 and no detail.
 */
export async function POST(request: NextRequest) {
  if (process.env.PAYMENT_PROVIDER !== "paymongo") return NextResponse.json({ error: "disabled" }, { status: 404 });

  const raw = await request.text();
  const event = createPaymongoProvider().parseWebhook?.(raw, request.headers) ?? null;
  if (!event) return NextResponse.json({ error: "invalid" }, { status: 401 });

  try {
    await applyPaymentEvent(event);
  } catch (e) {
    console.error("webhook processing failed", e);
    return NextResponse.json({ error: "retry" }, { status: 500 }); // gateway will retry
  }
  return NextResponse.json({ received: true });
}
