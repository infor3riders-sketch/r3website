import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/supabase/types";

export const ORDER_FILTERS = ["pending_payment", "paid", "processing", "shipped", "completed", "cancelled", "all"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];
export const isOrderFilter = (v: unknown): v is OrderFilter => typeof v === "string" && (ORDER_FILTERS as readonly string[]).includes(v);

/** Officer reads go through the caller's client, so RLS (officer/admin) is the enforcement point. */
export async function listOrders(status: OrderFilter = "pending_payment", limit = 100) {
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select("id, order_no, status, customer_name, email, total, payment_reference, payment_proof_path, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status === "cancelled") q = q.in("status", ["cancelled", "expired"]);
  else if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return data ?? [];
}

export async function countOrdersByStatus(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("status");
  const out: Record<string, number> = {};
  for (const o of data ?? []) {
    const k = o.status === "expired" ? "cancelled" : o.status;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export async function getOrderForOfficer(id: string) {
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id).order("name_snapshot");
  let proofUrl: string | null = null;
  if (order.payment_proof_path) {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(order.payment_proof_path, 600);
    proofUrl = data?.signedUrl ?? null;
  }
  return { order, items: items ?? [], proofUrl };
}

export async function listProductsAdmin() {
  const supabase = await createClient();
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("product_variants").select("product_id, stock, reserved, price_php"),
  ]);
  return (products ?? []).map((p) => {
    const vs = (variants ?? []).filter((v) => v.product_id === p.id);
    return { ...p, variantCount: vs.length, stock: vs.reduce((n, v) => n + v.stock, 0), reserved: vs.reduce((n, v) => n + v.reserved, 0) };
  });
}

export async function getProductAdmin(id: string) {
  const supabase = await createClient();
  const { data: product } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!product) return null;
  const [{ data: variants }, { data: images }] = await Promise.all([
    supabase.from("product_variants").select("*").eq("product_id", id).order("created_at"),
    supabase.from("product_images").select("*").eq("product_id", id).order("sort_order"),
  ]);
  return { product, variants: variants ?? [], images: images ?? [] };
}

export async function listDiscountCodes(): Promise<Row<"discount_codes">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
  return data ?? [];
}
