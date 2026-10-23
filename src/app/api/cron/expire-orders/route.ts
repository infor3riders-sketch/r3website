import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Hourly: release stock held by unpaid orders past their expiry. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("expire_stale_orders");
  if (error) {
    console.error("expire_stale_orders failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ expired: data ?? 0 });
}
