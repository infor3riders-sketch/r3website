import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client: BYPASSES RLS. Use only where genuinely required and only after the
 * caller's identity/role has been checked in server code:
 *   - inviting users / converting approved applications
 *   - payment webhooks
 *   - guest order and donation creation, stock functions, rate limiting
 * Never import from client components (server-only enforces this at build time).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
