"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { fieldErrors } from "@/lib/validators/auth";
import { contactSchema, eventInterestSchema, volunteerSchema } from "@/lib/validators/public";
import { GENERIC_FAILURE, echoValues, guardPublicSubmit, honeypotTripped, type FormState } from "@/server/form-guard";

// Public inserts go through the anon client so Row Level Security stays the enforcement point.
// Note: no `.select()` after insert; anon has INSERT but not SELECT on these tables.

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

/** Consent is validated but not stored as a column; the insert gets the remaining fields. */
function withoutConsent<T extends { consent: true }>(data: T): Omit<T, "consent"> {
  const { consent, ...rest } = data;
  void consent;
  return rest;
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const message = "Thanks for reaching out. We will get back to you soon.";
  if (honeypotTripped(formData)) return { ok: true, message };

  const parsed = contactSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    subject: text(formData, "subject"),
    message: text(formData, "message"),
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(formData) };

  // Validation is cheap and side-effect free, so it runs before the rate limiter / Turnstile.
  const blocked = await guardPublicSubmit(formData, { action: "contact", max: 5, windowSecs: 900, successMessage: message });
  if (blocked) return blocked;

  const db = createPublicClient();
  if (!db) return GENERIC_FAILURE;
  const row = withoutConsent(parsed.data);
  const { error } = await db.from("contact_messages").insert(row);
  if (error) {
    console.error("contact insert failed", error);
    return GENERIC_FAILURE;
  }
  return { ok: true, message };
}

export async function submitVolunteer(_prev: FormState, formData: FormData): Promise<FormState> {
  const message = "Thank you for volunteering! An officer will contact you with the details.";
  if (honeypotTripped(formData)) return { ok: true, message };

  const parsed = volunteerSchema.safeParse({
    program_id: text(formData, "program_id"),
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    message: text(formData, "message"),
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(formData) };

  // Validation is cheap and side-effect free, so it runs before the rate limiter / Turnstile.
  const blocked = await guardPublicSubmit(formData, { action: "volunteer", max: 5, windowSecs: 900, successMessage: message });
  if (blocked) return blocked;

  const db = createPublicClient();
  if (!db) return GENERIC_FAILURE;
  const row = withoutConsent(parsed.data);
  const { error } = await db.from("volunteer_signups").insert(row);
  if (error) {
    console.error("volunteer insert failed", error);
    return { error: "We could not record your sign-up. This program may not be accepting volunteers right now." };
  }
  return { ok: true, message };
}

export async function submitEventInterest(_prev: FormState, formData: FormData): Promise<FormState> {
  const message = "Got it! We have noted your interest and will share updates.";
  if (honeypotTripped(formData)) return { ok: true, message };

  const parsed = eventInterestSchema.safeParse({
    event_id: text(formData, "event_id"),
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: echoValues(formData) };

  // Validation is cheap and side-effect free, so it runs before the rate limiter / Turnstile.
  const blocked = await guardPublicSubmit(formData, { action: "event-interest", max: 8, windowSecs: 900, successMessage: message });
  if (blocked) return blocked;

  const db = createPublicClient();
  if (!db) return GENERIC_FAILURE;
  const row = withoutConsent(parsed.data);
  const { error } = await db.from("event_interest").insert(row);
  if (error) {
    console.error("event interest insert failed", error);
    return { error: "This event is not accepting interest signals right now." };
  }
  return { ok: true, message };
}
