import "server-only";
import { createClient } from "@/lib/supabase/server";
import { safeSearch } from "@/lib/search";
import type { Row } from "@/lib/supabase/types";

/** Short-lived signed URLs for private avatar objects, keyed by storage path. */
export async function signedAvatarUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from("member-avatars").createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}

export async function getOwnProfile(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getOwnMotorcycles(profileId: string): Promise<Row<"motorcycles">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("motorcycles").select("*").eq("profile_id", profileId).order("created_at");
  return data ?? [];
}

/** Directory rows come from the `member_directory` view, which already applies each member's privacy toggles. */
export async function searchDirectory(q: string) {
  const supabase = await createClient();
  let query = supabase.from("member_directory").select("*").order("full_name", { ascending: true }).limit(200);
  const term = safeSearch(q);
  if (term) query = query.or(`full_name.ilike.%${term}%,road_name.ilike.%${term}%`);
  const { data } = await query;
  return data ?? [];
}

export interface AnnouncementRow extends Row<"announcements"> {
  unread: boolean;
}

export async function listAnnouncements(profileId: string, limit = 50): Promise<AnnouncementRow[]> {
  const supabase = await createClient();
  const [{ data: items }, { data: reads }] = await Promise.all([
    supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(limit),
    supabase.from("announcement_reads").select("announcement_id").eq("profile_id", profileId),
  ]);
  const seen = new Set((reads ?? []).map((r) => r.announcement_id));
  return (items ?? []).map((a) => ({ ...a, unread: !seen.has(a.id) }));
}

export async function getAnnouncement(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle();
  return data;
}
