import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured, portalUrl } from "@/lib/env";
import { sanitizeNext } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

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
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  return NextResponse.redirect(portalUrl(ok ? next : "/login?error=link"));
}
