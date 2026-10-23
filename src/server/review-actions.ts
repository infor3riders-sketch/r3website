"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { applicationApproved, applicationInfoRequested, applicationRejected } from "@/emails/templates";
import { canTransition, motorcycleRowsFromApplication, profileFromApplication } from "@/lib/applications";
import { AuthError, requireRole } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { portalUrl } from "@/lib/env";
import { ORG } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ReviewState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const idSchema = z.uuid();
const notesSchema = z.string().trim().max(4000).optional();

async function officer() {
  try {
    return await requireRole("officer");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const NOT_AUTHORIZED: ReviewState = { error: "You are not authorized to do that." };

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  return { supabase, app: data };
}

function done(id: string, message: string): ReviewState {
  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  return { ok: true, message };
}

export async function saveReviewNotes(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  if (!(await officer())) return NOT_AUTHORIZED;
  const id = idSchema.safeParse(fd.get("id"));
  const notes = notesSchema.safeParse(fd.get("notes") ?? "");
  if (!id.success || !notes.success) return { error: "Invalid request." };
  const { supabase } = await load(id.data);
  const { error } = await supabase.from("applications").update({ review_notes: notes.data ?? null }).eq("id", id.data);
  if (error) return { error: "Could not save notes." };
  return done(id.data, "Notes saved.");
}

/**
 * Approve = create the member account and send the invitation.
 * Order matters for retry-safety: invite (or find the existing user) -> fill the profile -> mark approved.
 * A failure part-way leaves the application open; running it again finds the existing user and completes.
 */
export async function approveApplication(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const reviewer = await officer();
  if (!reviewer) return NOT_AUTHORIZED;
  const id = idSchema.safeParse(fd.get("id"));
  const notes = notesSchema.safeParse(fd.get("notes") ?? "");
  if (!id.success || !notes.success) return { error: "Invalid request." };

  const { supabase, app } = await load(id.data);
  if (!app) return { error: "Application not found." };
  if (!canTransition(app.status, "approved")) return { error: `This application is already ${app.status}.` };

  const admin = createAdminClient();

  let userId: string | null = null;
  let isNewUser = false;
  const invite = await admin.auth.admin.inviteUserByEmail(app.email, {
    redirectTo: portalUrl("/auth/callback?next=/accept-invite"),
    data: { full_name: app.full_name },
  });
  if (!invite.error && invite.data.user) {
    userId = invite.data.user.id;
    isNewUser = true;
  } else {
    // Most likely the email already has an account; link it instead of failing.
    const { data: existing } = await admin.from("profiles").select("id").eq("email", app.email).maybeSingle();
    userId = existing?.id ?? null;
  }
  if (!userId) {
    console.error("invite failed", invite.error);
    return { error: "Could not create the member account. Check the email address and the Auth configuration." };
  }

  const { error: profileError } = await admin.from("profiles").update(profileFromApplication(app)).eq("id", userId);
  if (profileError) {
    console.error("profile update failed", profileError);
    return { error: "The account was created but the profile could not be filled. Try approving again." };
  }

  const { count } = await admin.from("motorcycles").select("id", { count: "exact", head: true }).eq("profile_id", userId);
  if (!count) {
    const rows = motorcycleRowsFromApplication(userId, app.motorcycles);
    if (rows.length) await admin.from("motorcycles").insert(rows);
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "approved",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes.data ?? app.review_notes,
      profile_id: userId,
    })
    .eq("id", id.data);
  if (error) return { error: "Account created, but the application could not be marked approved. Try again." };

  await sendEmail(app.email, applicationApproved({ name: app.full_name }), { replyTo: ORG.email });
  return done(id.data, isNewUser ? "Approved. An invitation email was sent." : "Approved and linked to the existing account.");
}

export async function rejectApplication(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const reviewer = await officer();
  if (!reviewer) return NOT_AUTHORIZED;
  const id = idSchema.safeParse(fd.get("id"));
  const notes = notesSchema.safeParse(fd.get("notes") ?? "");
  if (!id.success || !notes.success) return { error: "Invalid request." };

  const { supabase, app } = await load(id.data);
  if (!app) return { error: "Application not found." };
  if (!canTransition(app.status, "rejected")) return { error: `This application is already ${app.status}.` };

  const { error } = await supabase
    .from("applications")
    .update({ status: "rejected", reviewed_by: reviewer.id, reviewed_at: new Date().toISOString(), review_notes: notes.data ?? app.review_notes })
    .eq("id", id.data);
  if (error) return { error: "Could not reject the application." };

  const includeNote = fd.get("include_note") === "on" && notes.data;
  await sendEmail(app.email, applicationRejected({ name: app.full_name, note: includeNote ? notes.data : undefined }), { replyTo: ORG.email });
  return done(id.data, "Application rejected and the applicant was notified.");
}

export async function requestApplicationInfo(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const reviewer = await officer();
  if (!reviewer) return NOT_AUTHORIZED;
  const id = idSchema.safeParse(fd.get("id"));
  const message = z.string().trim().min(5, "Write the question for the applicant").max(2000).safeParse(fd.get("message"));
  if (!id.success) return { error: "Invalid request." };
  if (!message.success) return { error: message.error.issues[0]?.message ?? "Invalid message." };

  const { supabase, app } = await load(id.data);
  if (!app) return { error: "Application not found." };
  if (!canTransition(app.status, "info_requested")) return { error: `This application is already ${app.status}.` };

  const stamp = new Date().toISOString().slice(0, 10);
  const log = `${app.review_notes ? `${app.review_notes}\n\n` : ""}[${stamp}] Info requested: ${message.data}`;
  const { error } = await supabase
    .from("applications")
    .update({ status: "info_requested", reviewed_by: reviewer.id, reviewed_at: new Date().toISOString(), review_notes: log })
    .eq("id", id.data);
  if (error) return { error: "Could not update the application." };

  await sendEmail(app.email, applicationInfoRequested({ name: app.full_name, message: message.data }), { replyTo: ORG.email });
  return done(id.data, "Information request sent to the applicant.");
}
