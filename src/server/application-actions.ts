"use server";

import { applicationReceived } from "@/emails/templates";
import { applicationReference } from "@/lib/applications";
import { sendEmail } from "@/lib/email";
import { createPublicClient } from "@/lib/supabase/public";
import { applicationSchema } from "@/lib/validators/application";
import { fieldErrors } from "@/lib/validators/auth";
import { GENERIC_FAILURE, guardPublicSubmit, honeypotTripped, type FormState } from "@/server/form-guard";

export interface ApplicationResult extends FormState {
  reference?: string;
}

/**
 * Public membership application. Validated again on the server (the client form is a convenience),
 * spam-protected, and inserted as `pending` through the anon client so RLS enforces what an applicant may write.
 * `payload` is JSON from the client form plus the honeypot and Turnstile token.
 */
export async function submitApplication(payload: unknown): Promise<ApplicationResult> {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const fd = new FormData();
  if (typeof raw.website === "string") fd.set("website", raw.website);
  if (typeof raw.turnstileToken === "string") fd.set("cf-turnstile-response", raw.turnstileToken);

  const successMessage = "Thank you! Your application has been submitted.";
  if (honeypotTripped(fd)) return { ok: true, message: successMessage, reference: "APP-00000000" };

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "Please review the highlighted fields." };

  const blocked = await guardPublicSubmit(fd, { action: "application", max: 3, windowSecs: 3600, successMessage });
  if (blocked) return blocked;

  const db = createPublicClient();
  if (!db) return GENERIC_FAILURE;

  const d = parsed.data;
  const id = crypto.randomUUID(); // generated here: anon can INSERT but not SELECT, so no RETURNING
  const { error } = await db.from("applications").insert({
    id,
    full_name: d.full_name,
    email: d.email,
    phone: d.phone,
    birthdate: d.birthdate,
    address: d.address,
    road_name: d.road_name ?? null,
    riding_years: d.riding_years,
    riding_experience: d.riding_experience,
    license_number: d.license_number,
    motorcycles: d.motorcycles,
    references: d.references,
    volunteer_interests: d.volunteer_interests,
    membership_type_id: d.membership_type_id ?? null,
    agreed_rules: true,
    consent_privacy: true,
  });
  if (error) {
    console.error("application insert failed", error);
    return GENERIC_FAILURE;
  }

  const reference = applicationReference(id);
  await sendEmail(d.email, applicationReceived({ name: d.full_name, reference }));
  return { ok: true, message: successMessage, reference };
}
