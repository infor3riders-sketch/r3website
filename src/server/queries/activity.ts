import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LoginEventType, Row } from "@/lib/supabase/types";
import { describeUserAgent } from "@/lib/user-agent";

export const LOGIN_EVENT_TYPES = ["login", "logout", "login_failed", "access_revoked", "access_restored"] as const satisfies readonly LoginEventType[];

export const LOGIN_EVENT_LABEL: Record<LoginEventType, string> = {
  login: "Signed in",
  logout: "Signed out",
  login_failed: "Failed sign-in",
  access_revoked: "Access turned off",
  access_restored: "Access turned on",
};

export interface LoginEventRow extends Row<"login_events"> {
  person: string;
  actor: string | null;
  label: string;
  device: string;
}

/** Admin-only (RLS). `from`/`to` are ISO instants; `to` is exclusive. */
export async function listLoginEvents(opts: { profileId?: string | null; event?: LoginEventType | null; from?: string | null; to?: string | null; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const size = opts.pageSize ?? 50;
  let q = supabase.from("login_events").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).range(opts.page * size, opts.page * size + size - 1);
  if (opts.profileId) q = q.eq("profile_id", opts.profileId);
  if (opts.event) q = q.eq("event", opts.event);
  if (opts.from) q = q.gte("created_at", opts.from);
  if (opts.to) q = q.lt("created_at", opts.to);
  const { data } = await q;
  const rows = data ?? [];

  const ids = [...new Set(rows.flatMap((r) => [r.profile_id, r.actor_id]).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
    for (const p of ps ?? []) names.set(p.id, p.full_name ?? p.email ?? "Member");
  }

  const out: LoginEventRow[] = rows.map((r) => {
    const how = r.method ? ` (${r.method})` : "";
    const why = r.detail ? `: ${r.detail}` : "";
    const actor = r.actor_id ? (names.get(r.actor_id) ?? "Unknown admin") : null;
    const label =
      r.event === "access_revoked" || r.event === "access_restored"
        ? `${LOGIN_EVENT_LABEL[r.event]}${actor ? ` by ${actor}` : ""}${why}`
        : `${LOGIN_EVENT_LABEL[r.event]}${how}${why}`;
    return {
      ...r,
      person: r.profile_id ? (names.get(r.profile_id) ?? r.email ?? "Deleted user") : (r.email ?? "Unknown"),
      actor,
      label,
      device: describeUserAgent(r.user_agent),
    };
  });
  return { rows: out, pageSize: size };
}

export async function getProfileName(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, email").eq("id", id).maybeSingle();
  return data ? (data.full_name ?? data.email ?? "Member") : null;
}
