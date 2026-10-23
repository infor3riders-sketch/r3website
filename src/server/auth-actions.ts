"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured, portalUrl } from "@/lib/env";
import { sanitizeNext } from "@/lib/auth/safe-redirect";
import { allow } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { emailOnlySchema, fieldErrors, loginSchema, setPasswordSchema } from "@/lib/validators/auth";

export interface AuthState {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const NOT_CONFIGURED: AuthState = { error: "Sign-in is not configured yet. Set the Supabase environment variables." };
const TOO_MANY: AuthState = { error: "Too many attempts. Please wait a few minutes and try again." };

export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await allow("login", 10, 600))) return TOO_MANY;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Generic message: do not reveal whether the account exists.
  if (error) return { error: "Invalid email or password." };
  redirect(sanitizeNext(formData.get("next")));
}

/** Magic link for existing members only (no sign-up), with a generic response. */
export async function sendMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await allow("magic", 5, 900))) return TOO_MANY;

  const next = sanitizeNext(formData.get("next"));
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: portalUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
    },
  });
  return { message: "If that email belongs to a member, a sign-in link is on its way." };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await allow("reset", 5, 900))) return TOO_MANY;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: portalUrl("/auth/callback?next=/reset-password"),
  });
  return { message: "If that email belongs to a member, a reset link is on its way." };
}

/** Used by both accept-invite (first password) and reset-password. Requires the session from the emailed link. */
export async function setPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = setPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "This link has expired. Request a new one from the sign-in page." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Could not update your password. Choose a different one and try again." };
  redirect("/");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
