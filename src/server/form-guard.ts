import "server-only";
import { allow, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted text values, echoed back so the form can repopulate after a validation error. */
  values?: Record<string, string>;
}

export const HONEYPOT_FIELD = "website";
export const TURNSTILE_FIELD = "cf-turnstile-response";

/**
 * Spam protection shared by every public submission (applications, contact, volunteer, interest,
 * checkout, donations): honeypot, per-IP rate limit, optional Turnstile.
 * Returns null to continue, or a FormState to return to the client immediately.
 * A tripped honeypot returns a success-looking state so bots learn nothing.
 */
export function honeypotTripped(formData: FormData): boolean {
  const trap = formData.get(HONEYPOT_FIELD);
  return typeof trap === "string" && trap.trim() !== "";
}

export async function guardPublicSubmit(
  formData: FormData,
  opts: { action: string; max: number; windowSecs: number; successMessage: string },
): Promise<FormState | null> {
  if (honeypotTripped(formData)) return { ok: true, message: opts.successMessage };
  if (!(await allow(opts.action, opts.max, opts.windowSecs))) {
    return { error: "Too many submissions from your connection. Please try again later." };
  }
  if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), await clientIp()))) {
    return { error: "We could not verify that you are human. Please reload the page and try again." };
  }
  return null;
}

export const GENERIC_FAILURE: FormState = { error: "Something went wrong on our side. Please try again in a moment." };

const NEVER_ECHO = new Set([HONEYPOT_FIELD, TURNSTILE_FIELD, "password", "confirm", "consent"]);

/** Text fields of a submission, safe to echo back to the same visitor. */
export function echoValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !NEVER_ECHO.has(k) && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}
