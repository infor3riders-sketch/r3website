"use server";

import { redirect } from "next/navigation";
import { donationPending } from "@/emails/templates";
import { donationReference } from "@/lib/donations";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors } from "@/lib/validators/auth";
import { donationSchema } from "@/lib/validators/donations";
import { PROOF_MAX_BYTES, sniffProof } from "@/lib/validators/shop";
import { GENERIC_FAILURE, echoValues, guardPublicSubmit, honeypotTripped, type FormState } from "@/server/form-guard";
import { getPaymentInstructions } from "@/server/queries/orders";

const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION") && k !== "proof"));

/**
 * Public donation. Created server-side with the service role (anon cannot insert donations), always `pending`.
 * Only an officer verification (or a verified gateway webhook) moves it to `paid`, which is the only status
 * that counts toward campaign progress.
 */
export async function placeDonation(_prev: FormState, fd: FormData): Promise<FormState> {
  if (honeypotTripped(fd)) return { ok: true, message: "Thank you!" };
  const parsed = donationSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const blocked = await guardPublicSubmit(fd, { action: "donation", max: 5, windowSecs: 3600, successMessage: "Thank you!" });
  if (blocked) return blocked;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    console.error("donations unavailable: service role is not configured");
    return GENERIC_FAILURE;
  }
  const d = parsed.data;

  if (d.campaign_id) {
    const { data: campaign } = await admin.from("donation_campaigns").select("id, is_public, is_active, ends_at").eq("id", d.campaign_id).maybeSingle();
    const open = campaign && campaign.is_public && campaign.is_active && (!campaign.ends_at || new Date(campaign.ends_at) > new Date());
    if (!open) return { fieldErrors: { campaign_id: "That campaign is not accepting donations." }, values: echoValues(fd) };
  }

  const id = crypto.randomUUID();
  const provider = getPaymentProvider(getPaymentInstructions);

  // Optional proof of payment (non-fatal if it fails; the donor can reply to the email instead).
  let proofPath: string | null = null;
  const file = fd.get("proof");
  if (file instanceof File && file.size > 0) {
    if (file.size > PROOF_MAX_BYTES) return { error: "Proof of payment must be under 5 MB.", values: echoValues(fd) };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffProof(bytes);
    if (!kind) return { error: "Proof of payment must be a JPG, PNG, WebP or PDF file.", values: echoValues(fd) };
    const path = `guest-donations/${id}/${Date.now()}.${kind.ext}`;
    const { error: upErr } = await admin.storage.from("payment-proofs").upload(path, bytes, { contentType: kind.type });
    if (!upErr) proofPath = path;
  }

  const { error } = await admin.from("donations").insert({
    id,
    campaign_id: d.campaign_id,
    donor_name: d.donor_name,
    donor_email: d.donor_email,
    is_anonymous: d.is_anonymous,
    message: d.message,
    amount: d.amount,
    payment_method: provider.name,
    payment_reference: d.payment_reference,
    payment_proof_path: proofPath,
  });
  if (error) {
    console.error("donation insert failed", error);
    return GENERIC_FAILURE;
  }

  const reference = donationReference(id);
  let destination = `/donations/thanks?ref=${reference}`;
  try {
    const result = await provider.createPayment({
      kind: "donation",
      id,
      reference,
      amount: d.amount,
      description: `Donation to R3 Riders (${reference})`,
      customer: { name: d.donor_name, email: d.donor_email },
      returnUrl: siteUrl(`/donations/thanks?ref=${reference}`),
    });
    if (result.mode === "redirect") {
      await admin.from("payments").insert({ subject_type: "donation", subject_id: id, provider: "paymongo", provider_ref: result.providerRef, amount: d.amount, status: "pending" });
      destination = result.redirectUrl;
    }
  } catch (e) {
    console.error("payment provider failed", e);
  }

  await sendEmail(d.donor_email, donationPending({ name: d.donor_name, amount: d.amount, reference }));
  redirect(destination);
}
