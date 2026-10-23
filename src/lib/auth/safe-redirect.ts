/**
 * Sanitise a user-supplied `next` target so auth redirects can never leave the portal
 * (no open redirect) and never expose the internal /portal prefix.
 */
export function sanitizeNext(value: FormDataEntryValue | string | null | undefined, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  let v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(v)) return fallback;
  v = v.replace(/^\/portal(?=\/|$)/, "") || "/";
  // never bounce back into the auth screens
  if (v === "/login" || v.startsWith("/login?")) return fallback;
  return v;
}
