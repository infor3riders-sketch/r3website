import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { deriveOrderToken, generateOrderToken, hashOrderToken, verifyOrderToken } from "@/lib/order-token";
import { configuredProviderName } from "@/lib/payments";
import { parsePaymongoEvent, verifyPaymongoSignature } from "@/lib/payments/paymongo";
import { availableStock, evaluateDiscount, normalizeCart, orderTotals, subtotalCents, toCents, type DiscountCode } from "@/lib/pricing";
import { cartSchema, checkoutSchema, discountCodeSchema, sniffProof } from "@/lib/validators/shop";

const sign = (body: string, secret: string, t: number) => createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");

describe("paymongo webhook signature", () => {
  const body = JSON.stringify({ hello: "world" });
  const secret = "whsk_test";
  const t = 1_800_000_000;
  const header = `t=${t},te=${sign(body, secret, t)},li=`;
  it("accepts a valid test signature within tolerance", () => {
    expect(verifyPaymongoSignature(body, header, secret, { now: t + 10 })).toBe(true);
  });
  it("rejects tampered bodies, wrong secrets, replays and live/test mixups", () => {
    expect(verifyPaymongoSignature(body + " ", header, secret, { now: t })).toBe(false);
    expect(verifyPaymongoSignature(body, header, "other", { now: t })).toBe(false);
    expect(verifyPaymongoSignature(body, header, secret, { now: t + 3600 })).toBe(false);
    expect(verifyPaymongoSignature(body, header, secret, { now: t, live: true })).toBe(false);
    expect(verifyPaymongoSignature(body, null, secret)).toBe(false);
    expect(verifyPaymongoSignature(body, "garbage", secret)).toBe(false);
  });
  it("maps a paid checkout session to a payment event (centavos to pesos)", () => {
    const ev = parsePaymongoEvent({
      data: { attributes: { type: "checkout_session.payment.paid", data: { id: "cs_1", attributes: { metadata: { kind: "order", id: "o-1" }, payments: [{ attributes: { amount: 90000 } }] } } } },
    });
    expect(ev).toEqual({ kind: "order", id: "o-1", providerRef: "cs_1", amount: 900, status: "paid" });
  });
  it("ignores other events and unknown metadata", () => {
    expect(parsePaymongoEvent({ data: { attributes: { type: "payment.failed", data: { id: "x", attributes: { metadata: { kind: "order", id: "1" } } } } } })).toBeNull();
    expect(parsePaymongoEvent({ data: { attributes: { type: "checkout_session.payment.paid", data: { id: "x", attributes: { metadata: { kind: "evil", id: "1" } } } } } })).toBeNull();
    expect(parsePaymongoEvent({})).toBeNull();
  });
});

describe("provider selection", () => {
  it("defaults to manual and only enables paymongo explicitly", () => {
    expect(configuredProviderName(undefined)).toBe("manual");
    expect(configuredProviderName("stripe")).toBe("manual");
    expect(configuredProviderName("paymongo")).toBe("paymongo");
  });
});

describe("pricing", () => {
  it("sums in centavos without float drift", () => {
    expect(subtotalCents([{ unitPrice: 0.1, quantity: 3 }, { unitPrice: 0.2, quantity: 1 }])).toBe(50);
    expect(toCents(449.99)).toBe(44999);
  });
  const code = (over: Partial<DiscountCode> = {}): DiscountCode => ({ kind: "percent", value: 10, min_subtotal: 0, max_uses: null, uses: 0, starts_at: null, ends_at: null, is_active: true, ...over });
  it("applies percent and fixed discounts, capped at the subtotal", () => {
    expect(evaluateDiscount(code(), 90000)).toEqual({ ok: true, discountCents: 9000 });
    expect(evaluateDiscount(code({ kind: "fixed", value: 50 }), 90000)).toEqual({ ok: true, discountCents: 5000 });
    expect(evaluateDiscount(code({ kind: "fixed", value: 5000 }), 90000)).toEqual({ ok: true, discountCents: 90000 });
  });
  it("rejects inactive, expired, early, exhausted and under-minimum codes", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    expect(evaluateDiscount(code({ is_active: false }), 1000, now).ok).toBe(false);
    expect(evaluateDiscount(code({ ends_at: "2026-11-30T00:00:00Z" }), 1000, now).ok).toBe(false);
    expect(evaluateDiscount(code({ starts_at: "2026-12-02T00:00:00Z" }), 1000, now).ok).toBe(false);
    expect(evaluateDiscount(code({ max_uses: 5, uses: 5 }), 1000, now).ok).toBe(false);
    expect(evaluateDiscount(code({ min_subtotal: 500 }), 40000, now).ok).toBe(false);
    expect(evaluateDiscount(code({ min_subtotal: 500 }), 50000, now).ok).toBe(true);
  });
  it("computes totals and never goes negative", () => {
    expect(orderTotals(90000, 9000)).toEqual({ subtotal: 900, discount: 90, total: 810 });
    expect(orderTotals(1000, 5000).total).toBe(0);
  });
  it("derives available stock and merges carts", () => {
    expect(availableStock({ stock: 10, reserved: 3 })).toBe(7);
    expect(availableStock({ stock: 2, reserved: 5 })).toBe(0);
    expect(normalizeCart([{ variant_id: "a", quantity: 1 }, { variant_id: "a", quantity: 2 }, { variant_id: "b", quantity: 0 }])).toEqual([{ variant_id: "a", quantity: 3 }]);
  });
});

describe("order tokens", () => {
  it("round-trips and stores only a hash", () => {
    const token = generateOrderToken();
    const hash = hashOrderToken(token);
    expect(hash).not.toContain(token);
    expect(verifyOrderToken(token, hash)).toBe(true);
  });
  it("derives the same token for the same order and different ones for different orders", () => {
    const a = deriveOrderToken("11111111-1111-4111-8111-111111111111");
    expect(a).toBe(deriveOrderToken("11111111-1111-4111-8111-111111111111"));
    expect(a).not.toBe(deriveOrderToken("22222222-2222-4222-8222-222222222222"));
    expect(verifyOrderToken(a, hashOrderToken(a))).toBe(true);
    expect(a.length).toBeGreaterThanOrEqual(20);
  });
  it("rejects wrong, empty and oversized tokens", () => {
    const hash = hashOrderToken(generateOrderToken());
    expect(verifyOrderToken(generateOrderToken(), hash)).toBe(false);
    expect(verifyOrderToken("", hash)).toBe(false);
    expect(verifyOrderToken(null, hash)).toBe(false);
    expect(verifyOrderToken("x".repeat(500), hash)).toBe(false);
  });
});

describe("shop validators", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  it("validates carts", () => {
    expect(cartSchema.safeParse([]).success).toBe(false);
    expect(cartSchema.safeParse([{ variant_id: id, quantity: 2 }]).success).toBe(true);
    expect(cartSchema.safeParse([{ variant_id: id, quantity: 99 }]).success).toBe(false);
    expect(cartSchema.safeParse([{ variant_id: "nope", quantity: 1 }]).success).toBe(false);
  });
  it("requires consent and a valid email at checkout", () => {
    const base = { customer_name: "A", email: "a@example.test", phone: "0917 123 4567", address_line: "x", city: "Iloilo", province: "Iloilo" };
    expect(checkoutSchema.safeParse({ ...base }).success).toBe(false);
    const ok = checkoutSchema.parse({ ...base, consent: "on", discount_code: " devten " });
    expect(ok.discount_code).toBe("DEVTEN");
  });
  it("uppercases discount codes and caps percent", () => {
    expect(discountCodeSchema.parse({ code: "ride-10", kind: "percent", value: "10" }).code).toBe("RIDE-10");
    expect(discountCodeSchema.safeParse({ code: "BAD", kind: "percent", value: "150" }).success).toBe(false);
  });
  it("sniffs proof files by signature", () => {
    expect(sniffProof(new TextEncoder().encode("%PDF-1.7"))?.ext).toBe("pdf");
    expect(sniffProof(new Uint8Array([0xff, 0xd8, 0xff]))?.ext).toBe("jpg");
    expect(sniffProof(new TextEncoder().encode("<html>"))).toBeNull();
  });
});
