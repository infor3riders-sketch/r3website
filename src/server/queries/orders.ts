import "server-only";
import { verifyOrderToken } from "@/lib/order-token";
import type { ManualInstructions } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSettingValue } from "@/server/queries/public";
import type { Row } from "@/lib/supabase/types";

export async function getPaymentInstructions(): Promise<ManualInstructions> {
  const v = await getPublicSettingValue("payment_instructions");
  return v && typeof v === "object" && !Array.isArray(v) ? (v as ManualInstructions) : {};
}

export interface LookedUpOrder {
  order: Row<"orders">;
  items: Row<"order_items">[];
}

/**
 * Guest order lookup. Orders are never readable by anon through RLS, so this runs with the service role
 * and only returns a row when the emailed token matches the stored hash. A wrong order number and a
 * wrong token are indistinguishable to the caller.
 */
export async function lookupOrder(orderNo: string, token: string | null | undefined): Promise<LookedUpOrder | null> {
  if (!/^R3-\d{4}-\d{5,}$/.test(orderNo)) return null;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return null; // service role not configured: behave as "not found"
  }
  const { data: order } = await admin.from("orders").select("*").eq("order_no", orderNo).maybeSingle();
  if (!order || !verifyOrderToken(token, order.lookup_token_hash)) return null;
  const { data: items } = await admin.from("order_items").select("*").eq("order_id", order.id).order("name_snapshot");
  return { order, items: items ?? [] };
}
