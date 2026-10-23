import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreatePaymentInput, CreatePaymentResult, PaymentEvent, PaymentProvider } from "@/lib/payments/types";

/**
 * PayMongo adapter (GCash, Maya, cards through hosted Checkout Sessions). Disabled by default:
 * set PAYMENT_PROVIDER=paymongo plus PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET.
 *
 * Webhook: configure `<site>/api/webhooks/paymongo` for the `checkout_session.payment.paid` event.
 * PayMongo signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends
 * `Paymongo-Signature: t=<ts>,te=<test signature>,li=<live signature>`.
 */

const API = "https://api.paymongo.com/v1";
const TOLERANCE_SECONDS = 5 * 60;

/** Pure and unit-tested: verifies a PayMongo signature header. */
export function verifyPaymongoSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  opts: { now?: number; live?: boolean } = {},
): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;
  const t = parts.t;
  const provided = opts.live ? parts.li : parts.te;
  if (!t || !provided) return false;

  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(Number(t)) || Math.abs(now - Number(t)) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface PaymongoWebhook {
  data?: {
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        attributes?: {
          amount?: number;
          metadata?: { kind?: string; id?: string };
          payments?: { id?: string; attributes?: { amount?: number } }[];
        };
      };
    };
  };
}

/** Maps a verified webhook body to our PaymentEvent. Amounts arrive in centavos. */
export function parsePaymongoEvent(body: unknown): PaymentEvent | null {
  const root = body as PaymongoWebhook;
  const type = root.data?.attributes?.type;
  const session = root.data?.attributes?.data;
  const meta = session?.attributes?.metadata;
  if (type !== "checkout_session.payment.paid" || !session?.id || !meta?.id) return null;
  if (meta.kind !== "order" && meta.kind !== "donation") return null;
  const centavos = session.attributes?.payments?.[0]?.attributes?.amount ?? session.attributes?.amount ?? 0;
  return { kind: meta.kind, id: meta.id, providerRef: session.id, amount: centavos / 100, status: "paid" };
}

export function createPaymongoProvider(): PaymentProvider {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  return {
    name: "paymongo",

    async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
      if (!secretKey) throw new Error("PAYMONGO_SECRET_KEY is not configured");
      const res = await fetch(`${API}/checkout_sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}` },
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [{ name: input.description, quantity: 1, amount: Math.round(input.amount * 100), currency: "PHP" }],
              payment_method_types: ["gcash", "paymaya", "card"],
              reference_number: input.reference,
              description: input.description,
              send_email_receipt: false,
              success_url: input.returnUrl,
              cancel_url: input.returnUrl,
              billing: { name: input.customer.name, email: input.customer.email },
              metadata: { kind: input.kind, id: input.id },
            },
          },
        }),
      });
      if (!res.ok) throw new Error(`PayMongo checkout failed (${res.status})`);
      const json = (await res.json()) as { data?: { id?: string; attributes?: { checkout_url?: string } } };
      const url = json.data?.attributes?.checkout_url;
      if (!url || !json.data?.id) throw new Error("PayMongo returned no checkout URL");
      return { mode: "redirect", redirectUrl: url, providerRef: json.data.id };
    },

    parseWebhook(rawBody, headers) {
      if (!webhookSecret) return null;
      const live = secretKey?.startsWith("sk_live") ?? false;
      if (!verifyPaymongoSignature(rawBody, headers.get("paymongo-signature"), webhookSecret, { live })) return null;
      try {
        return parsePaymongoEvent(JSON.parse(rawBody));
      } catch {
        return null;
      }
    },
  };
}
