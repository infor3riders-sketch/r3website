import { notFound } from "next/navigation";

/**
 * Catch-all so unknown public URLs render the branded not-found page inside the site layout
 * (without it, an unmatched route in a multi-root-layout app falls back to Next's default 404).
 * Real pages take precedence because static segments win over catch-alls.
 */
export default function CatchAll() {
  notFound();
}
