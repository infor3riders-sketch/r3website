import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client IP behind Vercel / proxies. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window rate limit backed by the `check_rate_limit` SQL function (works across serverless
 * instances). Returns true when the request is allowed. If the limiter itself is unavailable it
 * fails open in development and closed in production.
 */
export async function allow(action: string, max: number, windowSecs: number, extraKey = ""): Promise<boolean> {
  const key = `${action}:${await clientIp()}${extraKey ? `:${extraKey}` : ""}`;
  try {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_secs: windowSecs,
    });
    if (error) throw error;
    return data === true;
  } catch (e) {
    if (process.env.NODE_ENV === "production") {
      console.error("rate limiter unavailable, denying", e);
      return false;
    }
    return true;
  }
}
