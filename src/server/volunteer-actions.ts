"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { volunteerConfirmation } from "@/emails/templates";
import { AuthError, requireRole } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validators/auth";
import { programSchema, signupUpdateSchema, slotSchema } from "@/lib/validators/events";
import { echoValues, type FormState } from "@/server/form-guard";

async function role(min: "member" | "officer") {
  try {
    return await requireRole(min);
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}
const plain = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith("$ACTION")));

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------
const signupSchema = z.object({
  program_id: z.uuid(),
  slot_id: z.union([z.literal(""), z.uuid()]).optional().transform((v) => (v ? v : null)),
  message: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
});

export async function signUpForProgram(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("member");
  if (!me) return { error: "Please sign in again." };
  const parsed = signupSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  const supabase = await createClient();
  const { data: program } = await supabase.from("programs").select("id, title, volunteer_enabled").eq("id", parsed.data.program_id).maybeSingle();
  if (!program || !program.volunteer_enabled) return { error: "This program is not accepting volunteers." };

  const { error } = await supabase.from("volunteer_signups").insert({
    program_id: program.id,
    slot_id: parsed.data.slot_id,
    profile_id: me.id,
    name: me.full_name ?? me.road_name ?? "Member",
    email: me.email ?? "",
    message: parsed.data.message,
  });
  if (error) {
    if (error.message.includes("slot_full")) return { error: "Sorry, that slot just filled up." };
    if (error.code === "23505") return { error: "You are already signed up for that slot." };
    console.error("signup failed", error);
    return { error: "Could not sign you up. Please try again." };
  }
  if (me.email) await sendEmail(me.email, volunteerConfirmation({ name: me.full_name ?? "Rider", program: program.title }));
  revalidatePath("/programs");
  revalidatePath("/");
  return { ok: true, message: "You're signed up. Thank you for volunteering!" };
}

export async function cancelSignup(fd: FormData): Promise<void> {
  const me = await role("member");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("volunteer_signups").update({ status: "cancelled" }).eq("id", id.data).eq("profile_id", me.id);
  revalidatePath("/programs");
}

// ---------------------------------------------------------------------------
// Officer
// ---------------------------------------------------------------------------
export async function saveProgram(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("officer");
  if (!me) return { error: "Only officers can manage programs." };
  const id = z.uuid().optional().safeParse(fd.get("id") || undefined);
  const parsed = programSchema.safeParse(plain(fd));
  if (!id.success) return { error: "Invalid request." };
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };

  const supabase = await createClient();
  if (id.data) {
    const { error } = await supabase.from("programs").update(parsed.data).eq("id", id.data);
    if (error) return programFailure(error);
    revalidatePath("/manage/programs");
    revalidatePath(`/manage/programs/${id.data}`);
    return { ok: true, message: "Program updated." };
  }
  const { data, error } = await supabase.from("programs").insert(parsed.data).select("id").single();
  if (error) return programFailure(error);
  revalidatePath("/manage/programs");
  redirect(`/manage/programs/${data.id}`);
}

function programFailure(error: { code?: string; message: string }): FormState {
  if (error.code === "23505") return { fieldErrors: { slug: "That URL name is already used by another program." } };
  console.error("program save failed", error);
  return { error: "Could not save the program." };
}

export async function deleteProgram(fd: FormData): Promise<void> {
  const me = await role("officer");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!me || !id.success) return;
  const supabase = await createClient();
  await supabase.from("programs").delete().eq("id", id.data);
  revalidatePath("/manage/programs");
  redirect("/manage/programs");
}

export async function saveSlot(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await role("officer");
  if (!me) return { error: "Only officers can manage slots." };
  const parsed = slotSchema.safeParse(plain(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(fd) };
  const supabase = await createClient();
  const { error } = await supabase.from("volunteer_slots").insert(parsed.data);
  if (error) {
    console.error("slot save failed", error);
    return { error: "Could not add the slot." };
  }
  revalidatePath(`/manage/programs/${parsed.data.program_id}`);
  return { ok: true, message: "Slot added." };
}

export async function deleteSlot(fd: FormData): Promise<void> {
  const me = await role("officer");
  const id = z.uuid().safeParse(fd.get("id"));
  const programId = z.uuid().safeParse(fd.get("program_id"));
  if (!me || !id.success || !programId.success) return;
  const supabase = await createClient();
  await supabase.from("volunteer_slots").delete().eq("id", id.data);
  revalidatePath(`/manage/programs/${programId.data}`);
}

export async function updateSignup(fd: FormData): Promise<void> {
  const me = await role("officer");
  const parsed = signupUpdateSchema.safeParse(plain(fd));
  const programId = z.uuid().safeParse(fd.get("program_id"));
  if (!me || !parsed.success || !programId.success) return;
  const supabase = await createClient();
  await supabase.from("volunteer_signups").update({ status: parsed.data.status, hours: parsed.data.hours }).eq("id", parsed.data.id);
  revalidatePath(`/manage/programs/${programId.data}`);
}
