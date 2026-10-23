"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { duesRejected, duesVerified } from "@/emails/templates";
import { AuthError, requireRole } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { portalUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { cashDuesSchema, duesDecisionSchema, duesProofSchema, periodSchema } from "@/lib/validators/dues";
import { PROOF_MAX_BYTES, sniffProof } from "@/lib/validators/shop";
import { echoValues, type FormState } from "@/server/form-guard";

async function role(min: "member" | "officer") {
  try {
    return await requireRole(min);
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}
const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION") && k !== "proof"));

// ---------------------------------------------------------------------------
// Member: submit a payment for a period (reference and/or proof)
// ---------------------------------------------------------------------------
export async function submitDuesPayment(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("member");
  if (!me) return { error: "Please sign in again." };
  const parsed = duesProofSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: period } = await supabase.from("dues_periods").select("*").eq("id", parsed.data.period_id).maybeSingle();
  if (!period) return { error: "That dues period was not found." };
  const { data: existing } = await supabase.from("dues_payments").select("id, status").eq("period_id", period.id).eq("profile_id", me.id).maybeSingle();
  if (existing?.status === "paid") return { error: "This period is already paid." };

  let proofPath: string | null = null;
  const file = fd.get("proof");
  if (file instanceof File && file.size > 0) {
    if (file.size > PROOF_MAX_BYTES) return { error: "Proof of payment must be under 5 MB." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffProof(bytes);
    if (!kind) return { error: "Proof must be a JPG, PNG, WebP or PDF file." };
    proofPath = `${me.id}/dues/${period.id}-${Date.now()}.${kind.ext}`; // own folder, allowed by the storage policy
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(proofPath, bytes, { contentType: kind.type });
    if (upErr) {
      console.error("dues proof upload failed", upErr);
      return { error: "Upload failed. Please try again." };
    }
  }
  if (!proofPath && !parsed.data.reference_no) return { error: "Add a reference number or a proof of payment." };

  const row = {
    period_id: period.id,
    profile_id: me.id,
    amount: period.amount,
    status: "pending" as const,
    reference_no: parsed.data.reference_no,
    ...(proofPath ? { proof_path: proofPath } : {}),
    reject_reason: null,
  };
  const { error } = existing
    ? await supabase.from("dues_payments").update(row).eq("id", existing.id)
    : await supabase.from("dues_payments").insert(row);
  if (error) {
    console.error("dues payment save failed", error);
    return { error: "Could not save your payment. Please try again." };
  }
  revalidatePath("/dues");
  return { ok: true, message: "Thanks! An officer will verify your payment." };
}

// ---------------------------------------------------------------------------
// Officer: periods, verification, cash payments
// ---------------------------------------------------------------------------
export async function savePeriod(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("officer");
  if (!me) return { error: "Only officers can manage dues." };
  const parsed = periodSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  const { error } = await supabase.from("dues_periods").insert(parsed.data);
  if (error) {
    console.error("period save failed", error);
    return { error: "Could not save the period." };
  }
  revalidatePath("/manage/dues");
  return { ok: true, message: "Dues period created." };
}

async function notifyMember(paymentId: string, outcome: "paid" | "rejected", reason?: string | null) {
  const admin = createAdminClient();
  const { data: pay } = await admin.from("dues_payments").select("id, profile_id, period_id, amount").eq("id", paymentId).maybeSingle();
  if (!pay) return;
  const [{ data: member }, { data: period }] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("id", pay.profile_id).maybeSingle(),
    admin.from("dues_periods").select("label").eq("id", pay.period_id).maybeSingle(),
  ]);
  if (!member?.email || !period) return;
  const name = member.full_name ?? "Rider";
  await sendEmail(
    member.email,
    outcome === "paid"
      ? duesVerified({ name, period: period.label, amount: Number(pay.amount), receiptUrl: portalUrl(`/dues/${pay.id}/receipt`) })
      : duesRejected({ name, period: period.label, reason: reason ?? undefined, portalUrl: portalUrl("/dues") }),
  );
}

export async function verifyDues(fd: FormData): Promise<void> {
  const me = await role("officer");
  const parsed = duesDecisionSchema.safeParse(plain(fd));
  if (!me || !parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("dues_payments")
    .update({ status: "paid", verified_by: me.id, verified_at: new Date().toISOString(), reject_reason: null })
    .eq("id", parsed.data.id)
    .neq("status", "paid");
  if (!error) await notifyMember(parsed.data.id, "paid");
  revalidatePath("/manage/dues", "layout");
  revalidatePath("/manage/payments");
}

export async function rejectDues(fd: FormData): Promise<void> {
  const me = await role("officer");
  const parsed = duesDecisionSchema.safeParse(plain(fd));
  if (!me || !parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("dues_payments")
    .update({ status: "rejected", verified_by: me.id, verified_at: new Date().toISOString(), reject_reason: parsed.data.reject_reason })
    .eq("id", parsed.data.id)
    .eq("status", "pending");
  if (!error) await notifyMember(parsed.data.id, "rejected", parsed.data.reject_reason);
  revalidatePath("/manage/dues", "layout");
  revalidatePath("/manage/payments");
}

/** Cash or in-person payment recorded by an officer: created already verified. */
export async function recordCashDues(fd: FormData): Promise<void> {
  const me = await role("officer");
  const parsed = cashDuesSchema.safeParse(plain(fd));
  if (!me || !parsed.success) return;
  const supabase = await createClient();
  const { data: period } = await supabase.from("dues_periods").select("amount").eq("id", parsed.data.period_id).maybeSingle();
  if (!period) return;
  const base = { amount: period.amount, status: "paid" as const, reference_no: "Cash / in person", verified_by: me.id, verified_at: new Date().toISOString() };
  const { data: existing } = await supabase.from("dues_payments").select("id").eq("period_id", parsed.data.period_id).eq("profile_id", parsed.data.profile_id).maybeSingle();
  if (existing) await supabase.from("dues_payments").update(base).eq("id", existing.id);
  else await supabase.from("dues_payments").insert({ ...base, period_id: parsed.data.period_id, profile_id: parsed.data.profile_id });
  revalidatePath(`/manage/dues/${parsed.data.period_id}`);
}

export async function deletePeriod(fd: FormData): Promise<void> {
  const me = await role("officer");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("dues_periods").delete().eq("id", id.data);
  revalidatePath("/manage/dues");
}
