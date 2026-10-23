import "server-only";

/**
 * Cloudflare Turnstile verification. Optional: when TURNSTILE_SECRET_KEY is unset every request
 * passes (honeypot + rate limiting still apply). When set, a missing/invalid token fails.
 */
export const turnstileEnabled = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

export async function verifyTurnstile(token: FormDataEntryValue | null, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
