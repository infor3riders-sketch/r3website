import Image from "next/image";
import { brandAsset } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Winged R3 emblem placeholder, shown until public/brand/logo.(svg|png) is added. */
function PlaceholderEmblem({ className, decorative }: { className?: string; decorative?: boolean }) {
  return (
    <svg viewBox="0 0 240 120" {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "R3 Riders Organization Incorporated emblem" })} className={className}>
      <defs>
        <linearGradient id="wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd37a" />
          <stop offset="1" stopColor="#b9790a" />
        </linearGradient>
      </defs>
      {/* wings */}
      <g fill="url(#wing)">
        <path d="M100 52 C70 34 36 34 6 46 C30 46 44 52 52 60 C36 58 22 60 10 68 C34 66 50 72 60 80 C48 80 38 84 30 92 C60 88 84 80 100 70 Z" />
        <path d="M140 52 C170 34 204 34 234 46 C210 46 196 52 188 60 C204 58 218 60 230 68 C206 66 190 72 180 80 C192 80 202 84 210 92 C180 88 156 80 140 70 Z" />
      </g>
      <circle cx="120" cy="60" r="38" fill="#0b0b0c" stroke="#f2a81d" strokeWidth="4" />
      <text x="120" y="72" textAnchor="middle" fontFamily="Oswald, Impact, sans-serif" fontWeight="700" fontSize="38" fill="#f2a81d">
        R3
      </text>
    </svg>
  );
}

/** `decorative` hides the emblem from assistive tech when adjacent text already names it (e.g. the nav link). */
export function Logo({ className, priority = false, decorative = false }: { className?: string; priority?: boolean; decorative?: boolean }) {
  const src = brandAsset("logo.svg", "logo.png", "logo.webp");
  if (!src) return <PlaceholderEmblem className={cn("h-auto w-40", className)} decorative={decorative} />;
  return (
    <Image src={src} alt={decorative ? "" : "R3 Riders Organization Incorporated"} width={320} height={160} priority={priority} className={cn("h-auto w-40", className)} />
  );
}
