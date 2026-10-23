import { DEFAULT_HOSTS, type HostConfig } from "@/lib/hosts";

/** Hostnames come from env vars so the same build serves local dev and production. */
export function getHostConfig(): HostConfig {
  return {
    siteHost: process.env.NEXT_PUBLIC_SITE_HOST || DEFAULT_HOSTS.siteHost,
    portalHost: process.env.NEXT_PUBLIC_PORTAL_HOST || DEFAULT_HOSTS.portalHost,
  };
}

const protocol = () => process.env.NEXT_PUBLIC_SITE_PROTOCOL || "http";

/** Absolute URL on the public site. */
export function siteUrl(path = "/"): string {
  return `${protocol()}://${getHostConfig().siteHost}${path}`;
}

/** Absolute URL on the member portal. */
export function portalUrl(path = "/"): string {
  return `${protocol()}://${getHostConfig().portalHost}${path}`;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
