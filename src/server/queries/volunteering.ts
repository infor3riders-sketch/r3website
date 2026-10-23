import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/supabase/types";

export interface SlotWithSeats extends Row<"volunteer_slots"> {
  taken: number;
  mine: Row<"volunteer_signups"> | null;
}

export async function listMemberPrograms() {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getProgramBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function getProgramById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Slots of a program with seats taken (aggregate) and the caller's own sign-up per slot. */
export async function getSlots(programId: string, profileId: string, opts: { includePast?: boolean } = {}): Promise<SlotWithSeats[]> {
  const supabase = await createClient();
  let q = supabase.from("volunteer_slots").select("*").eq("program_id", programId).order("starts_at", { ascending: true, nullsFirst: false });
  if (!opts.includePast) q = q.or(`starts_at.is.null,starts_at.gte.${new Date().toISOString()}`);
  const { data: slots } = await q;
  if (!slots?.length) return [];
  const ids = slots.map((s) => s.id);
  const [{ data: seats }, { data: mine }] = await Promise.all([
    supabase.rpc("slot_seats_taken", { p_slots: ids }),
    supabase.from("volunteer_signups").select("*").eq("profile_id", profileId).in("slot_id", ids).neq("status", "cancelled"),
  ]);
  const taken = new Map((seats ?? []).map((s) => [s.slot_id, Number(s.taken)]));
  const own = new Map((mine ?? []).map((m) => [m.slot_id as string, m]));
  return slots.map((s) => ({ ...s, taken: taken.get(s.id) ?? 0, mine: own.get(s.id) ?? null }));
}

export async function listMySignups(profileId: string) {
  const supabase = await createClient();
  const { data: signups } = await supabase.from("volunteer_signups").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(100);
  if (!signups?.length) return [];
  const [{ data: programs }, { data: slots }] = await Promise.all([
    supabase.from("programs").select("id, title, slug").in("id", [...new Set(signups.map((s) => s.program_id))]),
    supabase.from("volunteer_slots").select("id, title, starts_at").in("id", signups.map((s) => s.slot_id).filter((v): v is string => Boolean(v))),
  ]);
  const p = new Map((programs ?? []).map((x) => [x.id, x]));
  const sl = new Map((slots ?? []).map((x) => [x.id, x]));
  return signups.map((s) => ({ signup: s, program: p.get(s.program_id) ?? null, slot: s.slot_id ? (sl.get(s.slot_id) ?? null) : null }));
}

export async function listOpenVolunteerOpportunities(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("volunteer_slots")
    .select("id, title, starts_at, program_id")
    .or(`starts_at.is.null,starts_at.gte.${new Date().toISOString()}`)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  return data ?? [];
}

/** Officer roster: sign-ups for a program with slot titles and volunteer hour totals. */
export async function getProgramRoster(programId: string) {
  const supabase = await createClient();
  const [{ data: signups }, { data: slots }] = await Promise.all([
    supabase.from("volunteer_signups").select("*").eq("program_id", programId).order("created_at", { ascending: false }),
    supabase.from("volunteer_slots").select("*").eq("program_id", programId).order("starts_at", { ascending: true, nullsFirst: false }),
  ]);
  const slotTitle = new Map((slots ?? []).map((s) => [s.id, s.title]));
  const rows = (signups ?? []).map((s) => ({ ...s, slot_title: s.slot_id ? (slotTitle.get(s.slot_id) ?? "") : "General" }));
  const totalHours = rows.reduce((n, r) => n + Number(r.hours ?? 0), 0);
  const seats = new Map<string, number>();
  for (const r of rows) if (r.slot_id && r.status !== "cancelled") seats.set(r.slot_id, (seats.get(r.slot_id) ?? 0) + 1);
  return { rows, slots: (slots ?? []).map((s) => ({ ...s, taken: seats.get(s.id) ?? 0 })), totalHours };
}
