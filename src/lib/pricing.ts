/**
 * Order pricing in integer centavos so totals never drift (0.1 + 0.2 problems). Prices come from the
 * database at checkout; client-supplied prices are never used.
 */
export const toCents = (php: number) => Math.round(php * 100);
export const fromCents = (c: number) => c / 100;

export interface PricedLine {
  unitPrice: number; // PHP
  quantity: number;
}

export const subtotalCents = (lines: PricedLine[]) => lines.reduce((n, l) => n + toCents(l.unitPrice) * l.quantity, 0);

export interface DiscountCode {
  kind: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  uses: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export type DiscountResult = { ok: true; discountCents: number } | { ok: false; reason: string };

/** Validates a code against a subtotal and returns the discount (never more than the subtotal). */
export function evaluateDiscount(code: DiscountCode, subtotal: number, now = new Date()): DiscountResult {
  if (!code.is_active) return { ok: false, reason: "This code is not active." };
  if (code.starts_at && new Date(code.starts_at) > now) return { ok: false, reason: "This code is not valid yet." };
  if (code.ends_at && new Date(code.ends_at) < now) return { ok: false, reason: "This code has expired." };
  if (code.max_uses != null && code.uses >= code.max_uses) return { ok: false, reason: "This code has been fully redeemed." };
  if (subtotal < toCents(code.min_subtotal)) return { ok: false, reason: `Minimum order of ₱${code.min_subtotal} required for this code.` };

  const raw = code.kind === "percent" ? Math.round((subtotal * code.value) / 100) : toCents(code.value);
  return { ok: true, discountCents: Math.min(raw, subtotal) };
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  total: number;
}

export function orderTotals(subtotal: number, discountCents = 0): OrderTotals {
  return { subtotal: fromCents(subtotal), discount: fromCents(discountCents), total: fromCents(Math.max(0, subtotal - discountCents)) };
}

/** Units that can still be sold: on hand minus reserved by pending orders. */
export const availableStock = (v: { stock: number; reserved: number }) => Math.max(0, v.stock - v.reserved);

export interface CartLine {
  variant_id: string;
  quantity: number;
}

/** Merges duplicate variants and drops non-positive quantities. */
export function normalizeCart(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const l of lines) if (l.quantity > 0) merged.set(l.variant_id, (merged.get(l.variant_id) ?? 0) + l.quantity);
  return [...merged].map(([variant_id, quantity]) => ({ variant_id, quantity }));
}
