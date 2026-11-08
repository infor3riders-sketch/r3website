import "server-only";
import type { ReportRange } from "@/lib/report-range";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json, Row } from "@/lib/supabase/types";
import { getRoster } from "@/server/queries/events";

/** All report reads use the officer's own client; RLS (officer policies) is the enforcement point. */

/**
 * Records that a report with personal data was opened (mirrors the donor CSV export). Returns false
 * when logging failed, in which case the caller must not show the report.
 */
export async function logReportView(actorId: string, action: string, tableName: string, details: Record<string, Json>): Promise<boolean> {
  try {
    const { error } = await createAdminClient().from("audit_log").insert({ actor_id: actorId, action, table_name: tableName, new_data: details });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("audit log failed; report blocked", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Member roster
// ---------------------------------------------------------------------------
export const ROSTER_STATUSES = ["active", "inactive", "suspended", "all"] as const;
export const ROSTER_ROLES = ["all", "member", "officer", "admin"] as const;
export type RosterStatus = (typeof ROSTER_STATUSES)[number];
export type RosterRole = (typeof ROSTER_ROLES)[number];

export interface MemberRosterRow {
  profile: Row<"profiles">;
  typeName: string | null;
  bikes: Pick<Row<"motorcycles">, "make" | "model" | "year" | "plate_number">[];
}

export async function getMemberRosterReport(opts: { status: RosterStatus; role: RosterRole; typeId: string | null; withBikes: boolean }) {
  const supabase = await createClient();
  let q = supabase.from("profiles").select("*").order("full_name", { ascending: true }).limit(2000);
  if (opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.role !== "all") q = q.eq("role", opts.role);
  if (opts.typeId) q = q.eq("membership_type_id", opts.typeId);
  const [{ data: profiles }, { data: types }] = await Promise.all([q, supabase.from("membership_types").select("id, name").order("sort_order")]);
  const ids = (profiles ?? []).map((p) => p.id);
  const bikesBy = new Map<string, MemberRosterRow["bikes"]>();
  if (opts.withBikes && ids.length > 0) {
    const { data: bikes } = await supabase.from("motorcycles").select("profile_id, make, model, year, plate_number").in("profile_id", ids);
    for (const b of bikes ?? []) bikesBy.set(b.profile_id, [...(bikesBy.get(b.profile_id) ?? []), b]);
  }
  const typeName = new Map((types ?? []).map((t) => [t.id, t.name]));
  const rows: MemberRosterRow[] = (profiles ?? []).map((p) => ({
    profile: p,
    typeName: p.membership_type_id ? (typeName.get(p.membership_type_id) ?? null) : null,
    bikes: bikesBy.get(p.id) ?? [],
  }));
  return { rows, types: types ?? [] };
}

// ---------------------------------------------------------------------------
// Event report and sign-in sheet
// ---------------------------------------------------------------------------
export async function getEventReport(eventId: string) {
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) return null;
  const [{ rows }, { data: program }, { count: interest }, { data: slots }] = await Promise.all([
    getRoster(eventId),
    event.program_id ? supabase.from("programs").select("title").eq("id", event.program_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("event_interest").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("volunteer_slots").select("id, title, starts_at").eq("event_id", eventId).order("starts_at", { ascending: true, nullsFirst: false }),
  ]);
  const slotIds = (slots ?? []).map((s) => s.id);
  const { data: signups } = slotIds.length
    ? await supabase.from("volunteer_signups").select("slot_id, name, phone, status, hours").in("slot_id", slotIds).neq("status", "cancelled").order("name")
    : { data: [] as Pick<Row<"volunteer_signups">, "slot_id" | "name" | "phone" | "status" | "hours">[] };
  const slotTitle = new Map((slots ?? []).map((s) => [s.id, s.title]));
  const volunteers = (signups ?? []).map((s) => ({ ...s, slot_title: s.slot_id ? (slotTitle.get(s.slot_id) ?? "") : "" }));
  return { event, programTitle: program?.title ?? null, rows, interest: interest ?? 0, volunteers };
}

// ---------------------------------------------------------------------------
// Dues collection (per period)
// ---------------------------------------------------------------------------
export async function getDuesReport(periodId: string) {
  const supabase = await createClient();
  const [{ data: period }, { data: payments }, { data: profiles }] = await Promise.all([
    supabase.from("dues_periods").select("*").eq("id", periodId).maybeSingle(),
    supabase.from("dues_payments").select("profile_id, amount, status, reference_no, verified_at").eq("period_id", periodId),
    supabase.from("profiles").select("id, full_name, road_name, email, phone").eq("status", "active").order("full_name").limit(2000),
  ]);
  if (!period) return null;
  const pay = new Map((payments ?? []).map((p) => [p.profile_id, p]));
  const rows = (profiles ?? []).map((m) => ({ member: m, payment: pay.get(m.id) ?? null }));
  return { period, rows };
}

// ---------------------------------------------------------------------------
// Donations and shop sales (date range)
// ---------------------------------------------------------------------------
/** Verified donations whose verification date falls in the range. */
export async function getDonationsReport(range: ReportRange) {
  const supabase = await createClient();
  const [{ data: donations }, { data: campaigns }] = await Promise.all([
    supabase
      .from("donations")
      .select("id, donor_name, is_anonymous, amount, campaign_id, payment_method, payment_reference, verified_at, created_at")
      .eq("status", "paid")
      .gte("verified_at", range.startIso)
      .lt("verified_at", range.endIso)
      .order("verified_at", { ascending: true })
      .limit(5000),
    supabase.from("donation_campaigns").select("id, title"),
  ]);
  const campaignTitle = new Map((campaigns ?? []).map((c) => [c.id, c.title]));
  const rows = (donations ?? []).map((d) => ({ ...d, campaign: d.campaign_id ? (campaignTitle.get(d.campaign_id) ?? "Campaign") : "General fund" }));
  const byCampaign = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const cur = byCampaign.get(r.campaign) ?? { count: 0, total: 0 };
    byCampaign.set(r.campaign, { count: cur.count + 1, total: cur.total + Number(r.amount) });
  }
  return {
    rows,
    total: rows.reduce((n, r) => n + Number(r.amount), 0),
    byCampaign: [...byCampaign.entries()].map(([campaign, v]) => ({ campaign, ...v })).sort((a, b) => b.total - a.total),
  };
}

/** Order statuses that count as a sale (payment received). */
export const SALE_STATUSES = ["paid", "processing", "shipped", "completed"] as const;

/** Orders paid in the range, with a per-item summary. */
export async function getSalesReport(range: ReportRange) {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_no, customer_name, status, subtotal, discount_total, total, payment_method, paid_at")
    .in("status", [...SALE_STATUSES])
    .gte("paid_at", range.startIso)
    .lt("paid_at", range.endIso)
    .order("paid_at", { ascending: true })
    .limit(5000);
  const ids = (orders ?? []).map((o) => o.id);
  const { data: items } = ids.length
    ? await supabase.from("order_items").select("order_id, name_snapshot, unit_price, quantity").in("order_id", ids)
    : { data: [] as Pick<Row<"order_items">, "order_id" | "name_snapshot" | "unit_price" | "quantity">[] };
  const byItem = new Map<string, { quantity: number; total: number }>();
  for (const i of items ?? []) {
    const cur = byItem.get(i.name_snapshot) ?? { quantity: 0, total: 0 };
    byItem.set(i.name_snapshot, { quantity: cur.quantity + i.quantity, total: cur.total + Number(i.unit_price) * i.quantity });
  }
  const rows = orders ?? [];
  return {
    rows,
    items: [...byItem.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    totals: {
      orders: rows.length,
      subtotal: rows.reduce((n, o) => n + Number(o.subtotal), 0),
      discounts: rows.reduce((n, o) => n + Number(o.discount_total), 0),
      total: rows.reduce((n, o) => n + Number(o.total), 0),
    },
  };
}
