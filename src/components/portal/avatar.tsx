import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "R3";

/** Member photo (signed URL from a private bucket) or initials fallback. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) {
    // Signed Supabase URLs are not in next/image remotePatterns on purpose (they expire); plain <img> is correct here.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("h-16 w-16 rounded-full border border-gold/50 object-cover", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn("flex h-16 w-16 items-center justify-center rounded-full border border-gold/50 bg-panel-raised font-display text-xl text-gold", className)}
    >
      {initials(name)}
    </span>
  );
}
