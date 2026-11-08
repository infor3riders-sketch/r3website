import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LoginEventType } from "@/lib/supabase/types";

export interface LoginEventInput {
  event: LoginEventType;
  profileId?: string | null;
  email?: string | null;
  /** How they signed in: password, magic link, invite link, password reset link. */
  method?: string | null;
  detail?: string | null;
  /** Who made an access change (the admin), when it isn't the user themselves. */
  actorId?: string | null;
}

/**
 * Records a sign-in / sign-out / failed attempt / access change in `login_events` (Admin > Login activity).
 * Best effort: a logging failure never blocks signing in or out.
 */
export async function logLoginEvent(e: LoginEventInput): Promise<void> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const { error } = await createAdminClient()
      .from("login_events")
      .insert({
        event: e.event,
        profile_id: e.profileId ?? null,
        email: e.email ? e.email.toLowerCase().slice(0, 320) : null,
        method: e.method ?? null,
        detail: e.detail ?? null,
        actor_id: e.actorId ?? null,
        ip,
        user_agent: h.get("user-agent")?.slice(0, 400) ?? null,
      });
    if (error) throw error;
  } catch (err) {
    console.error("login event log failed", err);
  }
}
