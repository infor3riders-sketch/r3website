import "server-only";
import { createClient } from "@/lib/supabase/server";
import { safeSearch } from "@/lib/search";
import type { Row } from "@/lib/supabase/types";

export type ApplicationStatus = Row<"applications">["status"];
export const STATUS_FILTERS = ["pending", "info_requested", "approved", "rejected", "all"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const isStatusFilter = (v: unknown): v is StatusFilter => typeof v === "string" && (STATUS_FILTERS as readonly string[]).includes(v);


/** All reads go through the user's own client, so RLS (officer/admin only) is the enforcement point. */
export async function listApplications({ status = "pending", q = "" }: { status?: StatusFilter; q?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select("id, status, full_name, email, phone, membership_type_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") query = query.eq("status", status);
  const term = safeSearch(q);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function countApplicationsByStatus() {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("status");
  const counts: Record<string, number> = { pending: 0, info_requested: 0, approved: 0, rejected: 0 };
  for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}

export async function getApplicationForReview(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getMembershipTypeNames(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("membership_types").select("id, name");
  return Object.fromEntries((data ?? []).map((t) => [t.id, t.name]));
}
