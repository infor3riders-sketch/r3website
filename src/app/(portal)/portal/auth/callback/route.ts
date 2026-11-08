import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured, portalUrl } from "@/lib/env";
import { sanitizeNext } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { logLoginEvent } from "@/server/login-log";

const METHOD: Record<string, string> = { invite: "invite link", recovery: "password reset link", magiclink: "magic link", email: "email link", signup: "email link" };

/**
 * Landing point for emailed links (invite, recovery, magic link). Supports both the PKCE `code`
 * flow and the `token_hash` OTP flow used by our email templates.
 * Invites and recoveries are always sent on to set a password, whatever `next` says.
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.redirect(portalUrl("/login?error=config"));
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") as EmailOtpType | null;
  const code = sp.get("code");
  const tokenHash = sp.get("token_hash");

  let next = sanitizeNext(sp.get("next"));
  if (type === "invite") next = "/accept-invite";
  if (type === "recovery") next = "/reset-password";

  const supabase = await createClient();
  let ok = false;
  let user: { id: string; email?: string } | null = null;
  let failure: string | undefined;
  if (code) {
    const r = await supabase.auth.exchangeCodeForSession(code);
    ok = !r.error;
    user = r.data.user;
    failure = r.error?.code;
  } else if (tokenHash && type) {
    const r = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !r.error;
    user = r.data.user;
    failure = r.error?.code;
  }
  const method = METHOD[type ?? ""] ?? "email link";
  if (ok && user) await logLoginEvent({ event: "login", profileId: user.id, email: user.email, method });
  else if (code || tokenHash) await logLoginEvent({ event: "login_failed", method, detail: failure === "user_banned" ? "Access revoked" : "Invalid or expired link" });
  if (failure === "user_banned") return NextResponse.redirect(portalUrl("/login?error=revoked"));

  return NextResponse.redirect(portalUrl(ok ? next : "/login?error=link"));
}
