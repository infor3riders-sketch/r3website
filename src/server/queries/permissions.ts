import "server-only";
import { cache } from "react";
import { normalizePermissions, type MemberPermission, type MemberPermissions } from "@/lib/member-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/types";

/** The row is private (members can't read site_settings), so it's read server-side with the service role. */
export const getMemberPermissions = cache(async (): Promise<MemberPermissions> => {
  try {
    const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "member_permissions").maybeSingle();
    return normalizePermissions(data?.value);
  } catch (e) {
    console.error("member permissions read failed", e);
    return normalizePermissions(null);
  }
});

/** Officers and admins are never restricted. The database enforces the same rule via public.member_may. */
export async function memberCan(role: UserRole | null | undefined, perm: MemberPermission): Promise<boolean> {
  if (role === "officer" || role === "admin") return true;
  return (await getMemberPermissions())[perm];
}
