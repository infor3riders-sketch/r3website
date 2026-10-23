import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { hasRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Row, UserRole } from "@/lib/supabase/types";

export type SessionProfile = Pick<Row<"profiles">, "id" | "email" | "role" | "status" | "full_name" | "road_name" | "avatar_path">;

export interface Session {
  userId: string;
  profile: SessionProfile | null;
}

/**
 * Current user + profile for this request (deduped with React cache).
 * Validates the JWT with the Auth server via getUser(); never trusts the cookie alone.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // Always render per-request: guarded pages must never be prerendered (even with no env at build time).
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, status, full_name, road_name, avatar_path")
    .eq("id", data.user.id)
    .maybeSingle();
  return { userId: data.user.id, profile };
});

/** For pages/layouts: redirect to login when signed out. */
export async function requireUser(next?: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return session;
}

export class AuthError extends Error {
  constructor(
    public readonly code: "unauthenticated" | "forbidden" | "inactive",
    message?: string,
  ) {
    super(message ?? code);
  }
}

/**
 * For server actions and queries: returns an ACTIVE profile with at least `min` role, or throws.
 * Every action must call this itself; UI hiding and the proxy are not security.
 */
export async function requireRole(min: UserRole = "member"): Promise<SessionProfile> {
  const session = await getSession();
  if (!session) throw new AuthError("unauthenticated");
  const profile = session.profile;
  if (!profile || profile.status !== "active") throw new AuthError("inactive");
  if (!hasRole(profile.role, min)) throw new AuthError("forbidden");
  return profile;
}

/**
 * For route layouts: ensures the visitor holds `min`. Signed-out users go to login;
 * signed-in users without the role get a 404 so privileged routes do not reveal themselves.
 */
export async function guardRoute(min: UserRole): Promise<SessionProfile> {
  const session = await requireUser();
  const profile = session.profile;
  if (!profile || profile.status !== "active" || !hasRole(profile.role, min)) notFound();
  return profile;
}
