"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { orderStatusUpdate } from "@/emails/templates";
import { AuthError, requireRole } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { deriveOrderToken } from "@/lib/order-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { discountCodeSchema, orderStatusUpdateSchema, productSchema, variantSchema } from "@/lib/validators/shop";
import { sniffImage, EXT_FOR } from "@/lib/validators/profile";
import { echoValues, type FormState } from "@/server/form-guard";

async function officer() {
  try {
    return await requireRole("officer");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}
const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION") && k !== "image"));
const NOT_AUTH: FormState = { error: "You are not authorized to do that." };

// ---------------------------------------------------------------------------
// Orders. Status changes happen only here (or in a verified webhook), never from the client.
// The stock functions need the service role, so the officer check comes first.
// ---------------------------------------------------------------------------
async function notify(orderId: string, status: string, note?: string | null) {
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders").select("id, order_no, customer_name, email").eq("id", orderId).maybeSingle();
  if (!o) return;
  await sendEmail(
    o.email,
    orderStatusUpdate({ name: o.customer_name, orderNo: o.order_no, status, note: note ?? undefined, lookupUrl: siteUrl(`/orders/${o.order_no}?t=${deriveOrderToken(o.id)}`) }),
  );
}

export async function markOrderPaid(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const { data: ok } = await createAdminClient().rpc("mark_order_paid", { p_order: id.data, p_verifier: me.id });
  if (ok) await notify(id.data, "Payment verified");
  revalidatePath("/manage/shop");
  revalidatePath(`/manage/shop/orders/${id.data}`);
}

export async function cancelOrderAction(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const { data: ok } = await createAdminClient().rpc("cancel_order", { p_order: id.data, p_new_status: "cancelled" });
  if (ok) await notify(id.data, "Cancelled", "Your order was cancelled. If you already paid, please contact us.");
  revalidatePath("/manage/shop");
  revalidatePath(`/manage/shop/orders/${id.data}`);
}

const FORWARD: Record<string, string[]> = { paid: ["processing", "shipped", "completed"], processing: ["shipped", "completed"], shipped: ["completed"] };

export async function updateOrderStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await officer();
  if (!me) return NOT_AUTH;
  const parsed = orderStatusUpdateSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("status").eq("id", parsed.data.id).maybeSingle();
  if (!order) return { error: "Order not found." };
  if (!(FORWARD[order.status] ?? []).includes(parsed.data.status)) return { error: `An order that is ${order.status.replace("_", " ")} cannot move to ${parsed.data.status}.` };

  const { error } = await supabase.from("orders").update({ status: parsed.data.status, tracking_note: parsed.data.tracking_note }).eq("id", parsed.data.id);
  if (error) return { error: "Could not update the order." };
  await notify(parsed.data.id, parsed.data.status[0].toUpperCase() + parsed.data.status.slice(1), parsed.data.tracking_note);
  revalidatePath("/manage/shop");
  revalidatePath(`/manage/shop/orders/${parsed.data.id}`);
  return { ok: true, message: "Order updated and the customer was notified." };
}

// ---------------------------------------------------------------------------
// Products, variants, images
// ---------------------------------------------------------------------------
export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await officer();
  if (!me) return NOT_AUTH;
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = productSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  if (id.data) {
    const { error } = await supabase.from("products").update(parsed.data).eq("id", id.data);
    if (error) return productFailure(error);
    revalidatePath("/manage/shop/products");
    revalidatePath(`/manage/shop/products/${id.data}`);
    revalidatePath("/shop");
    return { ok: true, message: "Product saved." };
  }
  const { data, error } = await supabase.from("products").insert(parsed.data).select("id").single();
  if (error) return productFailure(error);
  revalidatePath("/manage/shop/products");
  redirect(`/manage/shop/products/${data.id}`);
}

function productFailure(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") return { fieldErrors: { slug: "That URL name is already used by another product." } };
  console.error("product save failed", error);
  return { error: "Could not save the product." };
}

export async function deleteProduct(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id.data);
  revalidatePath("/manage/shop/products");
  revalidatePath("/shop");
  redirect("/manage/shop/products");
}

export async function saveVariant(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await officer();
  if (!me) return NOT_AUTH;
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = variantSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  const { product_id, ...rest } = parsed.data;
  if (id.data) {
    // reserved is managed by order functions; stock cannot drop below what pending orders hold (DB check: reserved <= stock)
    const { error } = await supabase.from("product_variants").update(rest).eq("id", id.data);
    if (error) return variantFailure(error);
  } else {
    const { error } = await supabase.from("product_variants").insert({ ...rest, product_id });
    if (error) return variantFailure(error);
  }
  revalidatePath(`/manage/shop/products/${product_id}`);
  revalidatePath("/shop");
  return { ok: true, message: id.data ? "Variant saved." : "Variant added." };
}

function variantFailure(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") return { fieldErrors: { sku: "That SKU is already in use." } };
  if (error.code === "23514") return { fieldErrors: { stock: "Stock cannot be lower than units reserved by pending orders." } };
  console.error("variant save failed", error);
  return { error: "Could not save the variant." };
}

export async function deleteVariant(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  const productId = z.uuid().safeParse(fd.get("product_id"));
  if (!me || !id.success || !productId.success) return;
  const supabase = await createClient();
  await supabase.from("product_variants").delete().eq("id", id.data);
  revalidatePath(`/manage/shop/products/${productId.data}`);
  revalidatePath("/shop");
}

export async function uploadProductImage(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await officer();
  if (!me) return NOT_AUTH;
  const productId = z.uuid().safeParse(fd.get("product_id"));
  const file = fd.get("image");
  if (!productId.success) return { error: "Invalid request." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > 5 * 1024 * 1024) return { error: "Images must be under 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { error: "Upload a JPG, PNG or WebP image." };

  const supabase = await createClient();
  const path = `products/${productId.data}/${Date.now()}.${EXT_FOR[type]}`;
  const { error: upErr } = await supabase.storage.from("public-media").upload(path, bytes, { contentType: type });
  if (upErr) {
    console.error("product image upload failed", upErr);
    return { error: "Upload failed." };
  }
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId.data);
  const alt = String(fd.get("alt") ?? "").trim().slice(0, 150) || null;
  const { error } = await supabase.from("product_images").insert({ product_id: productId.data, path, alt, sort_order: count ?? 0 });
  if (error) return { error: "Uploaded, but could not attach the image." };
  revalidatePath(`/manage/shop/products/${productId.data}`);
  revalidatePath("/shop");
  return { ok: true, message: "Image added." };
}

export async function deleteProductImage(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  const productId = z.uuid().safeParse(fd.get("product_id"));
  if (!me || !id.success || !productId.success) return;
  const supabase = await createClient();
  const { data: img } = await supabase.from("product_images").select("path").eq("id", id.data).maybeSingle();
  await supabase.from("product_images").delete().eq("id", id.data);
  if (img?.path) await supabase.storage.from("public-media").remove([img.path]);
  revalidatePath(`/manage/shop/products/${productId.data}`);
  revalidatePath("/shop");
}

// ---------------------------------------------------------------------------
// Discount codes
// ---------------------------------------------------------------------------
export async function saveDiscountCode(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await officer();
  if (!me) return NOT_AUTH;
  const parsed = discountCodeSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  const { error } = await supabase.from("discount_codes").insert(parsed.data);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { code: "That code already exists." }, values: echoValues(fd) };
    console.error("discount save failed", error);
    return { error: "Could not save the code." };
  }
  revalidatePath("/manage/shop/codes");
  return { ok: true, message: "Code created." };
}

export async function toggleDiscountCode(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const active = fd.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("discount_codes").update({ is_active: !active }).eq("id", id.data);
  revalidatePath("/manage/shop/codes");
}

export async function deleteDiscountCode(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("discount_codes").delete().eq("id", id.data);
  revalidatePath("/manage/shop/codes");
}
