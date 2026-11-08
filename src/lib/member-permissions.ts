/**
 * Admin-controlled switches for what regular members may change themselves (Admin > Member permissions).
 * Stored in the private `site_settings` row `member_permissions`. Missing keys fall back to `defaultOn`.
 * Officers and admins are never restricted. The database enforces the change permissions (public.member_may);
 * print_roster only gates a print view of the directory, which members can already see.
 */
export const MEMBER_PERMISSIONS = [
  { key: "edit_profile", label: "Edit their own profile and photo", hint: "Name, contact details, emergency contact, directory visibility and profile photo.", defaultOn: true },
  { key: "manage_motorcycles", label: "Add, edit and remove their motorcycles", hint: "The bikes and plate numbers on their profile.", defaultOn: true },
  { key: "rsvp", label: "RSVP to events and rides", hint: "Going / maybe / not going, riders and passengers.", defaultOn: true },
  { key: "volunteer", label: "Sign up for volunteer programs", hint: "Join or cancel volunteer slots.", defaultOn: true },
  { key: "submit_dues", label: "Submit dues payments", hint: "Upload proof of payment and reference numbers for officers to verify.", defaultOn: true },
  { key: "print_roster", label: "Print the member roster", hint: "A printable list from the Directory. Shows only members who chose to be listed, and only the details each one shares. Never includes emergency contacts or blood types.", defaultOn: false },
] as const;

export type MemberPermission = (typeof MEMBER_PERMISSIONS)[number]["key"];
export type MemberPermissions = Record<MemberPermission, boolean>;

/** Stored JSON -> full permission map. Only a real boolean counts; anything else uses the default. */
export function normalizePermissions(value: unknown): MemberPermissions {
  const o = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(MEMBER_PERMISSIONS.map((p) => [p.key, typeof o[p.key] === "boolean" ? o[p.key] : p.defaultOn])) as MemberPermissions;
}

/** Checkbox form -> permission map (unchecked boxes are absent from the form). */
export function permissionsFromForm(get: (name: string) => unknown): MemberPermissions {
  return Object.fromEntries(MEMBER_PERMISSIONS.map((p) => [p.key, get(p.key) === "on"])) as MemberPermissions;
}

export const VIEW_ONLY_MESSAGE = "This is view only. The club admins have turned off member changes here. Please contact an officer if something needs updating.";
