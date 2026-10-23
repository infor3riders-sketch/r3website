import Image from "next/image";
import Link from "next/link";
import { brandAsset } from "@/lib/brand";
import { ORG } from "@/lib/org";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/** Illustrated sunset road, used until public/brand/hero.jpg (the real photograph) is provided. */
function PlaceholderBackdrop() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2347" />
          <stop offset="0.45" stopColor="#8a3d2b" />
          <stop offset="0.7" stopColor="#f08a24" />
          <stop offset="1" stopColor="#ffd27a" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.62" r="0.35">
          <stop offset="0" stopColor="#fff2c2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      <rect width="1600" height="900" fill="url(#sun)" />
      <path d="M0 560 L180 430 L330 520 L520 380 L700 500 L820 450 L1000 520 L1180 400 L1380 510 L1600 440 V900 H0Z" fill="#2b1a1f" opacity="0.85" />
      <path d="M0 640 L220 520 L400 600 L640 480 L860 590 L1100 500 L1320 600 L1600 520 V900 H0Z" fill="#150d10" />
      {/* winding road */}
      <path d="M720 900 C760 800 700 740 780 680 C840 640 790 610 820 585 L850 585 C870 620 940 650 900 700 C860 760 940 820 1000 900Z" fill="#0b0809" />
      <path d="M800 900 C800 820 760 760 810 690" stroke="#f2a81d" strokeWidth="4" strokeDasharray="22 26" fill="none" opacity="0.7" />
      {/* rider silhouettes from behind */}
      <g fill="#050505">
        <g transform="translate(700 760)">
          <circle cx="0" cy="-34" r="10" />
          <path d="M-10 -26 H10 L14 4 H-14Z" />
          <rect x="-16" y="4" width="32" height="8" rx="3" />
          <circle cx="0" cy="22" r="14" />
        </g>
        <g transform="translate(900 780) scale(1.1)">
          <circle cx="0" cy="-34" r="10" />
          <path d="M-10 -26 H10 L14 4 H-14Z" />
          <rect x="-16" y="4" width="32" height="8" rx="3" />
          <circle cx="0" cy="22" r="14" />
        </g>
      </g>
    </svg>
  );
}

export function Hero() {
  const photo = brandAsset("hero.jpg", "hero.webp");
  return (
    <section className="relative isolate flex min-h-[640px] items-center justify-center overflow-hidden lg:min-h-[720px]">
      {photo ? (
        <Image src={photo} alt="" fill priority sizes="100vw" className="object-cover" />
      ) : (
        <PlaceholderBackdrop />
      )}
      {/* dark gradient overlay for legibility */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/85" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <Logo className="w-44 drop-shadow-[0_6px_20px_rgba(0,0,0,0.7)] sm:w-56" priority />
        <h1 className="mt-6 text-5xl font-bold uppercase leading-none tracking-wide text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] sm:text-6xl lg:text-7xl">
          {ORG.tagline}
        </h1>
        <p className="mt-5 text-base font-medium text-white/95 drop-shadow sm:text-xl">{ORG.mission}</p>

        <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Link href="/membership" className={buttonVariants({ variant: "gold", size: "lg" })}>
            Join Us
          </Link>
          <Link href="/donations" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Donate Now
          </Link>
          <Link href="/shop" className={buttonVariants({ variant: "blue", size: "lg" })}>
            Shop Merchandise
          </Link>
        </div>
      </div>
    </section>
  );
}
