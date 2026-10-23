import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { Json, Row } from "@/lib/supabase/types";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/site-defaults";

/** Runs a query with the anon client; any failure (or missing config) yields the fallback. */
async function safe<T>(fallback: T, run: (db: NonNullable<ReturnType<typeof createPublicClient>>) => PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const db = createPublicClient();
  if (!db) return fallback;
  try {
    const { data, error } = await run(db);
    if (error) {
      console.error("public query failed", error);
      return fallback;
    }
    return data ?? fallback;
  } catch (e) {
    console.error("public query threw", e);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Site settings (admin-editable, public rows only)
// ---------------------------------------------------------------------------
export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof DEFAULT_SETTINGS)[K]> {
  const rows = await safe<Pick<Row<"site_settings">, "value">[]>([], (db) =>
    db.from("site_settings").select("value").eq("key", key).eq("is_public", true).limit(1),
  );
  const value = rows[0]?.value as Json | undefined;
  return (value === undefined ? DEFAULT_SETTINGS[key] : (value as unknown)) as (typeof DEFAULT_SETTINGS)[K];
}

export async function getPublicSettingValue(key: string): Promise<Json | null> {
  const rows = await safe<Pick<Row<"site_settings">, "value">[]>([], (db) =>
    db.from("site_settings").select("value").eq("key", key).eq("is_public", true).limit(1),
  );
  return rows[0]?.value ?? null;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------
export const getMembershipTypes = () =>
  safe<Row<"membership_types">[]>([], (db) =>
    db.from("membership_types").select("*").order("sort_order", { ascending: true }),
  );

// ---------------------------------------------------------------------------
// Programs and events
// ---------------------------------------------------------------------------
export const getPrograms = () =>
  safe<Row<"programs">[]>([], (db) => db.from("programs").select("*").order("sort_order", { ascending: true }));

export async function getProgram(slug: string) {
  const rows = await safe<Row<"programs">[]>([], (db) => db.from("programs").select("*").eq("slug", slug).limit(1));
  return rows[0] ?? null;
}

export const getUpcomingEvents = (limit = 50) =>
  safe<Row<"events">[]>([], (db) =>
    db
      .from("events")
      .select("*")
      .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit),
  );

export async function getEvent(slug: string) {
  const rows = await safe<Row<"events">[]>([], (db) => db.from("events").select("*").eq("slug", slug).limit(1));
  return rows[0] ?? null;
}

export async function getEventsForProgram(programId: string) {
  return safe<Row<"events">[]>([], (db) =>
    db
      .from("events")
      .select("*")
      .eq("program_id", programId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(10),
  );
}

// ---------------------------------------------------------------------------
// News and gallery
// ---------------------------------------------------------------------------
export const getNews = (limit = 20) =>
  safe<Row<"news_posts">[]>([], (db) =>
    db
      .from("news_posts")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(limit),
  );

export async function getNewsPost(slug: string) {
  const rows = await safe<Row<"news_posts">[]>([], (db) => db.from("news_posts").select("*").eq("slug", slug).limit(1));
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
export interface AlbumSummary extends Row<"gallery_albums"> {
  cover: string | null;
  photoCount: number;
}

export async function getAlbums(): Promise<AlbumSummary[]> {
  const albums = await safe<Row<"gallery_albums">[]>([], (db) => db.from("gallery_albums").select("*").order("created_at", { ascending: false }));
  if (albums.length === 0) return [];
  const photos = await safe<Row<"gallery_photos">[]>([], (db) =>
    db.from("gallery_photos").select("*").in("album_id", albums.map((a) => a.id)).order("sort_order", { ascending: true }),
  );
  return albums.map((a) => {
    const mine = photos.filter((p) => p.album_id === a.id);
    return { ...a, cover: mine[0]?.path ?? null, photoCount: mine.length };
  });
}

export async function getAlbum(slug: string) {
  const albums = await safe<Row<"gallery_albums">[]>([], (db) => db.from("gallery_albums").select("*").eq("slug", slug).limit(1));
  const album = albums[0];
  if (!album) return null;
  const photos = await safe<Row<"gallery_photos">[]>([], (db) => db.from("gallery_photos").select("*").eq("album_id", album.id).order("sort_order", { ascending: true }));
  return { album, photos };
}
