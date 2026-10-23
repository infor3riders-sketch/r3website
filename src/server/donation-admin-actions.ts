"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { donationAcknowledgement } from "@/emails/templates";
import { AuthError, requireRole } from "@/lib/auth/session";
import { donationReference } from "@/lib/donations";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { campaignSchema } from "@/lib/validators/donations";
import { echoValues, type FormState } from "@/server/form-guard";

async function officer() {
  try {
    return await requireRole("officer");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}
const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")));

/** Official receipts only when an admin enables them in site settings; otherwise the email is an acknowledgement. */
async function officialReceiptsEnabled(admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { data } = await admin.from("site_settings").select("value").eq("key", "official_receipts_enabled").maybeSingle();
  return data?.value === true;
}

export async function verifyDonation(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const admin = createAdminClient();
  const { data: ok } = await admin.rpc("mark_donation_paid", { p_donation: id.data, p_verifier: me.id });
  if (ok) {
    const { data: d } = await admin.from("donations").select("*").eq("id", id.data).maybeSingle();
    if (d) {
      let campaign: string | undefined;
      if (d.campaign_id) {
        const { data: c } = await admin.from("donation_campaigns").select("title").eq("id", d.campaign_id).maybeSingle();
        campaign = c?.title;
      }
      await sendEmail(
        d.donor_email,
        donationAcknowledgement({ name: d.donor_name, amount: Number(d.amount), campaign, reference: donationReference(d.id), official: await officialReceiptsEnabled(admin) }),
      );
      await admin.from("donations").update({ acknowledged_at: new Date().toISOString() }).eq("id", d.id);
    }
  }
  revalidatePath("/manage/donations");
  revalidatePath(`/manage/donations/${id.data}`);
  revalidatePath("/donations");
}

export async function rejectDonation(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  await createAdminClient().rpc("reject_donation", { p_donation: id.data, p_verifier: me.id });
  revalidatePath("/manage/donations");
  revalidatePath(`/manage/donations/${id.data}`);
}

export async function saveCampaign(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await officer();
  if (!me) return { error: "You are not authorized to do that." };
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = campaignSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  if (id.data) {
    const { error } = await supabase.from("donation_campaigns").update(parsed.data).eq("id", id.data);
    if (error) return failure(error);
    revalidatePath("/manage/donations/campaigns");
    revalidatePath("/donations");
    return { ok: true, message: "Campaign saved." };
  }
  const { data, error } = await supabase.from("donation_campaigns").insert(parsed.data).select("id").single();
  if (error) return failure(error);
  revalidatePath("/manage/donations/campaigns");
  redirect(`/manage/donations/campaigns/${data.id}`);
}

function failure(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") return { fieldErrors: { slug: "That URL name is already used by another campaign." } };
  console.error("campaign save failed", error);
  return { error: "Could not save the campaign." };
}

export async function deleteCampaign(fd: FormData): Promise<void> {
  const me = await officer();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("donation_campaigns").delete().eq("id", id.data);
  revalidatePath("/manage/donations/campaigns");
  revalidatePath("/donations");
  redirect("/manage/donations/campaigns");
}
