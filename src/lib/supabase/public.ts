import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cookie-less anonymous client for the public website. It always acts as `anon`, so Row Level
 * Security limits it to public rows, and public pages can be statically cached (ISR).
 * Returns null when Supabase is not configured (e.g. first local run) so pages can degrade gracefully.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Public URL of a file in the `public-media` bucket. */
export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/public-media/${path}` : null;
}
