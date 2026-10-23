import { NextResponse, type NextRequest } from "next/server";
import { AuthError, requireRole } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { donationReference } from "@/lib/donations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isDonationFilter } from "@/server/queries/donations";

export const dynamic = "force-dynamic";

/**
 * Donor CSV export (contains personal data). Officer/admin only: route handlers are not covered by
 * layout guards, so the role is checked here. Every export is written to the audit log.
 */
export async function GET(request: NextRequest) {
  let me;
  try {
    me = await requireRole("officer");
  } catch (e) {
    if (e instanceof AuthError) return new NextResponse("Not found", { status: 404 });
    throw e;
  }

  const raw = request.nextUrl.searchParams.get("status");
  const status = isDonationFilter(raw) ? raw : "all";
  const supabase = await createClient();
  let q = supabase.from("donations").select("*").order("created_at", { ascending: false }).limit(5000);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return new NextResponse("Export failed", { status: 500 });
  const rows = data ?? [];

  // Audit first: if logging fails, nothing is exported.
  const { error: auditError } = await createAdminClient()
    .from("audit_log")
    .insert({ actor_id: me.id, action: "export_donations", table_name: "donations", new_data: { status, count: rows.length } });
  if (auditError) {
    console.error("audit log failed; export blocked", auditError);
    return new NextResponse("Export unavailable", { status: 503 });
  }

  const csv = toCsv(
    ["reference", "date", "status", "amount_php", "campaign_id", "donor_name", "donor_email", "anonymous", "method", "payment_reference", "verified_at", "message"],
    rows.map((d) => [donationReference(d.id), d.created_at, d.status, d.amount, d.campaign_id, d.donor_name, d.donor_email, d.is_anonymous ? "yes" : "no", d.payment_method, d.payment_reference, d.verified_at, d.message]),
  );
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="r3-donations-${status}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
