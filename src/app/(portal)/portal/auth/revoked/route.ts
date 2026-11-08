import { NextResponse } from "next/server";
import { isSupabaseConfigured, portalUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * A signed-in account whose portal access was turned off lands here: end the session (a route
 * handler can clear the auth cookies; a page cannot) and show the notice on the login page.
 */
export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(portalUrl("/login?error=revoked"));
}
