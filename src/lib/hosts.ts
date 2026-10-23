/**
 * Host-based routing helpers. Pure functions so they can be unit tested.
 *
 * Route groups do not appear in URLs, so each "site" lives under a real path
 * segment inside its group: `(site)/site/*` and `(portal)/portal/*`. The proxy
 * rewrites incoming requests to those internal prefixes, and refuses any
 * request that tries to address the prefixes directly.
 */

export type SiteKind = "site" | "portal";

export const INTERNAL_PREFIX: Record<SiteKind, string> = {
  site: "/site",
  portal: "/portal",
};

export interface HostConfig {
  siteHost: string;
  portalHost: string;
}

export const DEFAULT_HOSTS: HostConfig = {
  siteHost: "localhost:3000",
  portalHost: "portal.localhost:3000",
};

const stripPort = (host: string) => host.replace(/:\d+$/, "");

/** Decide which product a request host belongs to. Unknown hosts get the public site. */
export function resolveSiteKind(hostHeader: string | null | undefined, cfg: HostConfig): SiteKind {
  const host = (hostHeader ?? "").toLowerCase().trim();
  const portal = cfg.portalHost.toLowerCase();
  if (host === portal) return "portal";
  // Tolerate a missing/mismatched port (e.g. reverse proxies, `next start` on another port).
  if (stripPort(host) === stripPort(portal)) return "portal";
  return "site";
}

/** True when a path addresses an internal prefix directly (e.g. `/portal/login` on any host). */
export function isInternalPath(pathname: string): boolean {
  return (Object.values(INTERNAL_PREFIX) as string[]).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Map an external pathname to the internal route-group path for the given product. */
export function toInternalPath(kind: SiteKind, pathname: string): string {
  const prefix = INTERNAL_PREFIX[kind];
  return pathname === "/" ? prefix : `${prefix}${pathname}`;
}

/** Portal routes that do not require a session. */
export const PORTAL_PUBLIC_PATHS = ["/login", "/forgot-password", "/accept-invite", "/auth/callback", "/reset-password"];

export function isPortalPublicPath(pathname: string): boolean {
  return PORTAL_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
