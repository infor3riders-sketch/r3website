import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Guest order lookup tokens.
 *
 * The token is an HMAC of the order id with ORDER_TOKEN_SECRET, so the server can always rebuild the
 * link for emails (confirmation, status updates) without storing the token itself. The database keeps
 * only SHA-256(token): a database leak alone reveals no working links, and the secret alone reveals
 * nothing without order ids. Orders are never readable by anon through RLS; lookups run in server code
 * with the service role after this check.
 */
const DEV_SECRET = "dev-only-order-token-secret-change-me";

function secret(): string {
  const s = process.env.ORDER_TOKEN_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("ORDER_TOKEN_SECRET (32+ characters) is required in production");
  return DEV_SECRET;
}

export const deriveOrderToken = (orderId: string) => createHmac("sha256", secret()).update(`order:${orderId}`).digest("base64url");

export const hashOrderToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Random token (kept for tests and non-order uses). */
export const generateOrderToken = () => randomBytes(24).toString("base64url");

export function verifyOrderToken(token: string | null | undefined, storedHash: string): boolean {
  if (!token || token.length < 20 || token.length > 100) return false;
  const a = Buffer.from(hashOrderToken(token));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}
