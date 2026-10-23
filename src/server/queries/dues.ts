import "server-only";
import { createClient } from "@/lib/supabase/server";
import { manilaDateKey } from "@/lib/events";
import { duesState, type DuesState } from "@/lib/validators/dues";
import type { Row } from "@/lib/supabase/types";

export interface MyDuesRow {
  period: Row<"dues_periods">;
  payment: Row<"dues_payments"> | null;
  state: DuesState;
}

/** Member view: every period with the member's own payment (RLS limits dues_payments to their own rows). */
export async function listMyDues(profileId: string): Promise<MyDuesRow[]> {
  const supabase = await createClient();
  const [{ data: periods }, { data: payments }] = await Promise.all([
    supabase.from("dues_periods").select("*").order("due_on", { ascending: false }),
    supabase.from("dues_payments").select("*").eq("profile_id", profileId),
  ]);
  const byPeriod = new Map((payments ?? []).map((p) => [p.period_id, p]));
  const today = manilaDateKey(new Date());
  return (periods ?? []).map((period) => {
    const payment = byPeriod.get(period.id) ?? null;
    return { period, payment, state: duesState(period, payment, today) };
  });
}

export async function getMyReceipt(paymentId: string, profileId: string) {
  const supabase = await createClient();
  const { data: payment } = await supabase.from("dues_payments").select("*").eq("id", paymentId).eq("profile_id", profileId).eq("status", "paid").maybeSingle();
  if (!payment) return null;
  const [{ data: period }, { data: profile }] = await Promise.all([
    supabase.from("dues_periods").select("*").eq("id", payment.period_id).maybeSingle(),
    supabase.from("profiles").select("full_name, road_name, email").eq("id", profileId).maybeSingle(),
  ]);
  return period && profile ? { payment, period, profile } : null;
}

// ---------------------------------------------------------------------------
// Officer views
// ---------------------------------------------------------------------------
export async function listPeriodsAdmin() {
  const supabase = await createClient();
  const [{ data: periods }, { data: payments }, { count: members }] = await Promise.all([
    supabase.from("dues_periods").select("*").order("due_on", { ascending: false }),
    supabase.from("dues_payments").select("period_id, status"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return (periods ?? []).map((p) => {
    const rows = (payments ?? []).filter((x) => x.period_id === p.id);
    return { ...p, paid: rows.filter((r) => r.status === "paid").length, pending: rows.filter((r) => r.status === "pending").length, members: members ?? 0 };
  });
}

export async function getPeriodRoster(periodId: string) {
  const supabase = await createClient();
  const [{ data: period }, { data: payments }, { data: profiles }] = await Promise.all([
    supabase.from("dues_periods").select("*").eq("id", periodId).maybeSingle(),
    supabase.from("dues_payments").select("*").eq("period_id", periodId),
    supabase.from("profiles").select("id, full_name, road_name, email").eq("status", "active").order("full_name").limit(1000),
  ]);
  if (!period) return null;
  const pay = new Map((payments ?? []).map((p) => [p.profile_id, p]));
  const rows = await Promise.all(
    (profiles ?? []).map(async (m) => {
      const payment = pay.get(m.id) ?? null;
      let proofUrl: string | null = null;
      if (payment?.proof_path) {
        const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(payment.proof_path, 600);
        proofUrl = data?.signedUrl ?? null;
      }
      return { member: m, payment, proofUrl };
    }),
  );
  return { period, rows };
}

/** Everything awaiting an officer's verification, across shop, donations and dues. */
export async function getPendingPayments() {
  const supabase = await createClient();
  const [{ data: orders }, { data: donations }, { data: dues }] = await Promise.all([
    supabase.from("orders").select("id, order_no, customer_name, total, payment_reference, payment_proof_path, created_at").eq("status", "pending_payment").order("created_at").limit(50),
    supabase.from("donations").select("id, donor_name, amount, payment_reference, payment_proof_path, created_at").eq("status", "pending").order("created_at").limit(50),
    supabase.from("dues_payments").select("id, period_id, profile_id, amount, reference_no, proof_path, created_at").eq("status", "pending").order("created_at").limit(50),
  ]);
  const names = new Map<string, string>();
  const periods = new Map<string, { label: string }>();
  if (dues?.length) {
    const [{ data: ps }, { data: prs }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", [...new Set(dues.map((d) => d.profile_id))]),
      supabase.from("dues_periods").select("id, label").in("id", [...new Set(dues.map((d) => d.period_id))]),
    ]);
    for (const p of ps ?? []) names.set(p.id, p.full_name ?? "Member");
    for (const p of prs ?? []) periods.set(p.id, p);
  }
  return {
    orders: orders ?? [],
    donations: donations ?? [],
    dues: (dues ?? []).map((d) => ({ ...d, member: names.get(d.profile_id) ?? "Member", period: periods.get(d.period_id)?.label ?? "" })),
  };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
/** RLS returns only documents the caller's role may see. */
export async function listDocuments(): Promise<Row<"documents">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("*").order("category").order("created_at", { ascending: false });
  return data ?? [];
}
