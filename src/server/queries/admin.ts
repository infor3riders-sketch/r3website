import "server-only";
import { createClient } from "@/lib/supabase/server";
import { safeSearch } from "@/lib/search";
import type { Json, Row } from "@/lib/supabase/types";

/** All reads use the admin's own client; RLS (admin policies) remains the enforcement point. */
export async function getSettingValues(): Promise<Record<string, Json>> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

export async function listMembers({ q = "", role }: { q?: string; role?: string } = {}) {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("full_name", { ascending: true }).limit(300);
  if (role === "member" || role === "officer" || role === "admin") query = query.eq("role", role);
  const term = safeSearch(q);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,road_name.ilike.%${term}%`);
  const { data } = await query;
  return data ?? [];
}

export async function getMember(id: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  const [{ data: bikes }, { data: types }] = await Promise.all([
    supabase.from("motorcycles").select("*").eq("profile_id", id),
    supabase.from("membership_types").select("id, name").order("sort_order"),
  ]);
  return { profile, bikes: bikes ?? [], types: types ?? [] };
}

export async function listNewsAdmin(): Promise<Row<"news_posts">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("news_posts").select("*").order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function getNewsAdmin(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("news_posts").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function listAlbumsAdmin() {
  const supabase = await createClient();
  const [{ data: albums }, { data: photos }] = await Promise.all([
    supabase.from("gallery_albums").select("*").order("created_at", { ascending: false }),
    supabase.from("gallery_photos").select("album_id"),
  ]);
  return (albums ?? []).map((a) => ({ ...a, photoCount: (photos ?? []).filter((p) => p.album_id === a.id).length }));
}

export async function getAlbumAdmin(id: string) {
  const supabase = await createClient();
  const { data: album } = await supabase.from("gallery_albums").select("*").eq("id", id).maybeSingle();
  if (!album) return null;
  const { data: photos } = await supabase.from("gallery_photos").select("*").eq("album_id", id).order("sort_order");
  return { album, photos: photos ?? [] };
}

export async function listAudit({ table, action, page = 0 }: { table?: string; action?: string; page?: number }) {
  const supabase = await createClient();
  const size = 50;
  let q = supabase.from("audit_log").select("*").order("id", { ascending: false }).range(page * size, page * size + size - 1);
  if (table) q = q.eq("table_name", table);
  if (action) q = q.eq("action", action);
  const { data } = await q;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data: ps } = await supabase.from("profiles").select("id, full_name, email").in("id", actorIds);
    for (const p of ps ?? []) names.set(p.id, p.full_name ?? p.email ?? "Member");
  }
  return { rows: rows.map((r) => ({ ...r, actor: r.actor_id ? (names.get(r.actor_id) ?? "Unknown user") : "System / service" })), pageSize: size };
}

export async function listAuditTables(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_log").select("table_name").limit(2000);
  return [...new Set((data ?? []).map((r) => r.table_name).filter((v): v is string => Boolean(v)))].sort();
}
