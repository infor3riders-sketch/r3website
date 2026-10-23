import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Row } from "@/lib/supabase/types";
import { getPublicSettingValue } from "@/server/queries/public";

export interface CampaignProgress extends Row<"donation_campaigns"> {
  raised: number;
  donors: number;
}

/** Public campaigns with progress. Totals come from `campaign_totals()`, which counts only verified (paid) donations. */
export async function listPublicCampaigns(): Promise<CampaignProgress[]> {
  const db = createPublicClient();
  if (!db) return [];
  const [{ data: campaigns }, { data: totals }] = await Promise.all([
    db.from("donation_campaigns").select("*").order("created_at", { ascending: false }),
    db.rpc("campaign_totals"),
  ]);
  const t = new Map((totals ?? []).map((x) => [x.campaign_id, x]));
  return (campaigns ?? []).map((c) => ({ ...c, raised: Number(t.get(c.id)?.raised ?? 0), donors: Number(t.get(c.id)?.donors ?? 0) }));
}

export async function getPublicCampaign(slug: string): Promise<CampaignProgress | null> {
  return (await listPublicCampaigns()).find((c) => c.slug === slug) ?? null;
}

export interface FundUsageItem {
  label: string;
  pct: number;
}

export async function getFundUsage(): Promise<FundUsageItem[]> {
  const v = await getPublicSettingValue("fund_usage");
  const items = v && typeof v === "object" && !Array.isArray(v) ? (v as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return [];
  return items.filter((i): i is FundUsageItem => !!i && typeof i.label === "string" && Number.isFinite(i.pct) && i.pct >= 0);
}

// ---------------------------------------------------------------------------
// Officer views (RLS: officers and admins only)
// ---------------------------------------------------------------------------
export const DONATION_FILTERS = ["pending", "paid", "rejected", "all"] as const;
export type DonationFilter = (typeof DONATION_FILTERS)[number];
export const isDonationFilter = (v: unknown): v is DonationFilter => typeof v === "string" && (DONATION_FILTERS as readonly string[]).includes(v);

export async function listDonations(status: DonationFilter = "pending", limit = 200) {
  const supabase = await createClient();
  let q = supabase.from("donations").select("*").order("created_at", { ascending: false }).limit(limit);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return data ?? [];
}

export async function countDonationsByStatus(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("donations").select("status");
  const out: Record<string, number> = {};
  for (const d of data ?? []) out[d.status] = (out[d.status] ?? 0) + 1;
  return out;
}

export async function getDonationForOfficer(id: string) {
  const supabase = await createClient();
  const { data: donation } = await supabase.from("donations").select("*").eq("id", id).maybeSingle();
  if (!donation) return null;
  let proofUrl: string | null = null;
  if (donation.payment_proof_path) {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(donation.payment_proof_path, 600);
    proofUrl = data?.signedUrl ?? null;
  }
  let campaign: string | null = null;
  if (donation.campaign_id) {
    const { data } = await supabase.from("donation_campaigns").select("title").eq("id", donation.campaign_id).maybeSingle();
    campaign = data?.title ?? null;
  }
  return { donation, proofUrl, campaign };
}

export async function listCampaignsAdmin() {
  const supabase = await createClient();
  const [{ data: campaigns }, { data: paid }] = await Promise.all([
    supabase.from("donation_campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("donations").select("campaign_id, amount").eq("status", "paid"),
  ]);
  return (campaigns ?? []).map((c) => {
    const rows = (paid ?? []).filter((d) => d.campaign_id === c.id);
    return { ...c, raised: rows.reduce((n, d) => n + Number(d.amount), 0), donors: rows.length };
  });
}

export async function getCampaignAdmin(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("donation_campaigns").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function listCampaignOptions(): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("donation_campaigns").select("id, title").order("title");
  return data ?? [];
}
