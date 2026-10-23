import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth/session";
import { portalUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Authorised document download. Route handlers are not covered by layout guards, so the role is checked here.
 * The document row is read with the caller's own client, so RLS decides whether they may see it; only then
 * is a short-lived signed URL issued (the storage policy independently mirrors the same rule).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("member");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.redirect(portalUrl("/login"));
    throw e;
  }
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path, title").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60, { download: true });
  if (error || !data?.signedUrl) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
