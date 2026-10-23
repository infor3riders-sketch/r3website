"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { orderConfirmation } from "@/emails/templates";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { deriveOrderToken, hashOrderToken, verifyOrderToken } from "@/lib/order-token";
import { getPaymentProvider } from "@/lib/payments";
import { availableStock, evaluateDiscount, normalizeCart, orderTotals, subtotalCents } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors } from "@/lib/validators/auth";
import { PROOF_MAX_BYTES, cartSchema, checkoutSchema, sniffProof } from "@/lib/validators/shop";
import { GENERIC_FAILURE, echoValues, guardPublicSubmit, honeypotTripped, type FormState } from "@/server/form-guard";
import { getPaymentInstructions } from "@/server/queries/orders";

const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION") && k !== "proof"));

async function storeProof(admin: ReturnType<typeof createAdminClient>, orderId: string, file: FormDataEntryValue | null): Promise<{ path?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > PROOF_MAX_BYTES) return { error: "Proof of payment must be under 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffProof(bytes);
  if (!kind) return { error: "Proof of payment must be a JPG, PNG, WebP or PDF file." };
  const path = `guest/${orderId}/${Date.now()}.${kind.ext}`;
  const { error } = await admin.storage.from("payment-proofs").upload(path, bytes, { contentType: kind.type });
  if (error) {
    console.error("proof upload failed", error);
    return { error: "We could not upload your proof. You can add it later from your order page." };
  }
  return { path };
}

/**
 * Guest checkout. Everything that matters is decided here on the server: prices and stock come from the
 * database, never the browser; stock is reserved atomically per line and rolled back on any failure; the
 * order is created `pending_payment` and only an officer (or a verified gateway webhook) can mark it paid.
 */
export async function placeOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  if (honeypotTripped(fd)) return { ok: true, message: "Order received." };

  let cartJson: unknown;
  try {
    cartJson = JSON.parse(String(fd.get("cart") ?? "[]"));
  } catch {
    return { error: "Your cart could not be read. Please reload and try again." };
  }
  const cart = cartSchema.safeParse(cartJson);
  if (!cart.success) return { error: "Your cart is empty or invalid." };
  const parsed = checkoutSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  const blocked = await guardPublicSubmit(fd, { action: "checkout", max: 5, windowSecs: 3600, successMessage: "Order received." });
  if (blocked) return blocked;

  const input = parsed.data;
  const lines = normalizeCart(cart.data);
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    console.error("checkout unavailable: service role is not configured");
    return GENERIC_FAILURE;
  }

  // 1) Re-price from the database.
  const { data: variants } = await admin
    .from("product_variants")
    .select("id, product_id, label, price_php, stock, reserved, is_active")
    .in("id", lines.map((l) => l.variant_id));
  const { data: products } = await admin.from("products").select("id, name, is_active").in("id", [...new Set((variants ?? []).map((v) => v.product_id))]);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

  const priced = [];
  for (const l of lines) {
    const v = variantById.get(l.variant_id);
    const p = v ? productById.get(v.product_id) : undefined;
    if (!v || !p || !v.is_active || !p.is_active) return { error: "An item in your cart is no longer available. Please review your cart.", values: echoValues(fd) };
    if (l.quantity > availableStock(v)) {
      return { error: `Only ${availableStock(v)} of "${p.name} (${v.label})" left. Please adjust your cart.`, values: echoValues(fd) };
    }
    priced.push({ variantId: v.id, name: `${p.name} (${v.label})`, unitPrice: Number(v.price_php), quantity: l.quantity });
  }
  const subtotal = subtotalCents(priced);

  // 2) Discount code (validated against the server-side subtotal).
  let discountCents = 0;
  let discountCodeId: string | null = null;
  if (input.discount_code) {
    const { data: code } = await admin.from("discount_codes").select("*").eq("code", input.discount_code).maybeSingle();
    const result = code ? evaluateDiscount({ ...code, value: Number(code.value), min_subtotal: Number(code.min_subtotal) }, subtotal) : null;
    if (!code || !result) return { fieldErrors: { discount_code: "That code is not valid." }, values: echoValues(fd) };
    if (!result.ok) return { fieldErrors: { discount_code: result.reason }, values: echoValues(fd) };
    discountCents = result.discountCents;
    discountCodeId = code.id;
  }
  const totals = orderTotals(subtotal, discountCents);

  // 3) Reserve stock line by line; undo everything if any line fails.
  const reserved: { variantId: string; quantity: number }[] = [];
  const rollback = async () => {
    for (const r of reserved) await admin.rpc("release_stock", { p_variant: r.variantId, p_qty: r.quantity });
  };
  for (const line of priced) {
    const { data: ok } = await admin.rpc("reserve_stock", { p_variant: line.variantId, p_qty: line.quantity });
    if (!ok) {
      await rollback();
      return { error: `Sorry, "${line.name}" just sold out. Please review your cart.`, values: echoValues(fd) };
    }
    reserved.push({ variantId: line.variantId, quantity: line.quantity });
  }

  // 4) Create the order and its items.
  const orderId = crypto.randomUUID(); // chosen here so the lookup token can be derived before insert
  const token = deriveOrderToken(orderId);
  const provider = getPaymentProvider(getPaymentInstructions);
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      id: orderId,
      customer_name: input.customer_name,
      email: input.email,
      phone: input.phone,
      address_line: input.address_line,
      city: input.city,
      province: input.province,
      postal_code: input.postal_code,
      notes: input.notes,
      subtotal: totals.subtotal,
      discount_total: totals.discount,
      total: totals.total,
      discount_code_id: discountCodeId,
      payment_method: provider.name,
      payment_reference: input.payment_reference,
      lookup_token_hash: hashOrderToken(token),
    })
    .select("id, order_no, total")
    .single();
  if (error || !order) {
    console.error("order insert failed", error);
    await rollback();
    return GENERIC_FAILURE;
  }
  const { error: itemsError } = await admin.from("order_items").insert(
    priced.map((l) => ({ order_id: order.id, variant_id: l.variantId, name_snapshot: l.name, unit_price: l.unitPrice, quantity: l.quantity })),
  );
  if (itemsError) {
    console.error("order items insert failed", itemsError);
    await rollback();
    await admin.from("orders").delete().eq("id", order.id);
    return GENERIC_FAILURE;
  }

  // 5) Optional proof of payment (non-fatal: it can be added later from the order page).
  const proof = await storeProof(admin, order.id, fd.get("proof"));
  if (proof.path) await admin.from("orders").update({ payment_proof_path: proof.path }).eq("id", order.id);

  // 6) Provider hand-off. Manual shows instructions on the order page; a gateway redirects to checkout.
  const lookupUrl = siteUrl(`/orders/${order.order_no}?t=${token}`);
  let destination = `/orders/${order.order_no}?t=${token}&new=1`;
  try {
    const result = await provider.createPayment({
      kind: "order",
      id: order.id,
      reference: order.order_no,
      amount: Number(order.total),
      description: `R3 Riders order ${order.order_no}`,
      customer: { name: input.customer_name, email: input.email },
      returnUrl: lookupUrl,
    });
    if (result.mode === "redirect") {
      await admin.from("payments").insert({ subject_type: "order", subject_id: order.id, provider: "paymongo", provider_ref: result.providerRef, amount: Number(order.total), status: "pending" });
      destination = result.redirectUrl;
    }
  } catch (e) {
    console.error("payment provider failed", e);
  }

  await sendEmail(
    input.email,
    orderConfirmation({
      name: input.customer_name,
      orderNo: order.order_no,
      total: Number(order.total),
      items: priced.map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      lookupUrl,
    }),
  );
  revalidatePath("/shop");
  redirect(destination);
}

/** Lets a guest attach/replace a payment reference and proof from their order page (token required). */
export async function submitPaymentProof(_prev: FormState, fd: FormData): Promise<FormState> {
  if (honeypotTripped(fd)) return { ok: true, message: "Thanks!" };
  const blocked = await guardPublicSubmit(fd, { action: "order-proof", max: 10, windowSecs: 3600, successMessage: "Thanks!" });
  if (blocked) return blocked;

  const orderNo = String(fd.get("order_no") ?? "");
  const token = String(fd.get("token") ?? "");
  const reference = String(fd.get("payment_reference") ?? "").trim().slice(0, 60);
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return GENERIC_FAILURE;
  }
  const { data: order } = await admin.from("orders").select("id, status, lookup_token_hash").eq("order_no", orderNo).maybeSingle();
  if (!order || !verifyOrderToken(token, order.lookup_token_hash)) return { error: "We could not find that order." };
  if (order.status !== "pending_payment") return { error: "This order is no longer awaiting payment." };

  const proof = await storeProof(admin, order.id, fd.get("proof"));
  if (proof.error) return { error: proof.error };
  if (!proof.path && !reference) return { error: "Add a reference number or a proof image." };

  const { error } = await admin
    .from("orders")
    .update({ ...(reference ? { payment_reference: reference } : {}), ...(proof.path ? { payment_proof_path: proof.path } : {}) })
    .eq("id", order.id);
  if (error) return GENERIC_FAILURE;
  revalidatePath(`/orders/${orderNo}`);
  return { ok: true, message: "Thanks! An officer will verify your payment shortly." };
}
