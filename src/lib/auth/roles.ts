import type { UserRole } from "@/lib/supabase/types";

const RANK: Record<UserRole, number> = { member: 0, officer: 1, admin: 2 };

export const isRole = (v: unknown): v is UserRole => typeof v === "string" && v in RANK;

/** True when `role` meets or exceeds `min`. Unknown/missing roles never pass. */
export function hasRole(role: UserRole | null | undefined, min: UserRole): boolean {
  if (!role || !isRole(role)) return false;
  return RANK[role] >= RANK[min];
}

export const isOfficer = (role: UserRole | null | undefined) => hasRole(role, "officer");
export const isAdmin = (role: UserRole | null | undefined) => hasRole(role, "admin");
