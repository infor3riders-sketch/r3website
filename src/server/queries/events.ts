import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/supabase/types";

export interface EventWithSeats extends Row<"events"> {
  taken: number;
  mine: Row<"event_rsvps"> | null;
}

/** Events visible to members with aggregate seats taken and the caller's own RSVP. */
export async function listMemberEvents(profileId: string, opts: { from?: string; to?: string; past?: boolean; limit?: number } = {}): Promise<EventWithSeats[]> {
  const supabase = await createClient();
  let q = supabase.from("events").select("*").limit(opts.limit ?? 100);
  const now = new Date(Date.now() - 6 * 3600_000).toISOString();
  if (opts.past) q = q.lt("starts_at", now).order("starts_at", { ascending: false });
  else q = q.gte("starts_at", opts.from ?? now).order("starts_at", { ascending: true });
  if (opts.to) q = q.lt("starts_at", opts.to);
  const { data: events } = await q;
  return attachSeats(supabase, profileId, events ?? []);
}

export async function getMemberEvent(profileId: string, slug: string): Promise<EventWithSeats | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  return (await attachSeats(supabase, profileId, [data]))[0];
}

async function attachSeats(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string, events: Row<"events">[]): Promise<EventWithSeats[]> {
  if (events.length === 0) return [];
  const ids = events.map((e) => e.id);
  const [{ data: seats }, { data: mine }] = await Promise.all([
    supabase.rpc("event_seats_taken", { p_events: ids }),
    supabase.from("event_rsvps").select("*").eq("profile_id", profileId).in("event_id", ids),
  ]);
  const taken = new Map((seats ?? []).map((s) => [s.event_id, Number(s.taken)]));
  const rsvps = new Map((mine ?? []).map((r) => [r.event_id, r]));
  return events.map((e) => ({ ...e, taken: taken.get(e.id) ?? 0, mine: rsvps.get(e.id) ?? null }));
}

export async function listMyUpcomingRsvps(profileId: string, limit = 5) {
  const supabase = await createClient();
  const { data: rsvps } = await supabase.from("event_rsvps").select("*").eq("profile_id", profileId).neq("status", "no");
  if (!rsvps?.length) return [];
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .in("id", rsvps.map((r) => r.event_id))
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  const byEvent = new Map(rsvps.map((r) => [r.event_id, r]));
  return (events ?? []).map((e) => ({ event: e, rsvp: byEvent.get(e.id)! }));
}

// ---------------------------------------------------------------------------
// Officer views (RLS limits these to officers/admins)
// ---------------------------------------------------------------------------
export async function listAllEvents(limit = 200) {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getEventById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return data;
}

export interface RosterRow {
  profile_id: string;
  name: string;
  road_name: string | null;
  phone: string | null;
  status: Row<"event_rsvps">["status"] | null;
  riders: number;
  passengers: number;
  waiver_signed_at: string | null;
  checked_in_at: string | null;
}

/** RSVPs and attendance merged per member, for the check-in screen. */
export async function getRoster(eventId: string): Promise<{ rows: RosterRow[]; others: { id: string; name: string }[] }> {
  const supabase = await createClient();
  const [{ data: rsvps }, { data: attendance }, { data: profiles }] = await Promise.all([
    supabase.from("event_rsvps").select("*").eq("event_id", eventId),
    supabase.from("event_attendance").select("*").eq("event_id", eventId),
    supabase.from("profiles").select("id, full_name, road_name, phone, status").eq("status", "active").order("full_name").limit(1000),
  ]);
  const people = new Map((profiles ?? []).map((p) => [p.id, p]));
  const att = new Map((attendance ?? []).map((a) => [a.profile_id, a]));
  const rsvpBy = new Map((rsvps ?? []).map((r) => [r.profile_id, r]));
  const ids = new Set<string>([...rsvpBy.keys(), ...att.keys()]);

  const rows: RosterRow[] = [...ids].map((id) => {
    const p = people.get(id);
    const r = rsvpBy.get(id);
    return {
      profile_id: id,
      name: p?.full_name ?? "Unknown member",
      road_name: p?.road_name ?? null,
      phone: p?.phone ?? null,
      status: r?.status ?? null,
      riders: r?.riders ?? 0,
      passengers: r?.passengers ?? 0,
      waiver_signed_at: r?.waiver_signed_at ?? null,
      checked_in_at: att.get(id)?.checked_in_at ?? null,
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  const others = (profiles ?? []).filter((p) => !ids.has(p.id)).map((p) => ({ id: p.id, name: p.full_name ?? p.road_name ?? "Member" }));
  return { rows, others };
}
