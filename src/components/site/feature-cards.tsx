import Image from "next/image";
import Link from "next/link";
import { HandHeart, HeartHandshake, Shirt, ShieldCheck, type LucideIcon } from "lucide-react";
import { brandAsset } from "@/lib/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Feature {
  slug: "membership" | "services" | "merch" | "donate";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  /** Hidden text appended to a generic link label ("Learn More") so the link makes sense out of context. */
  ctaHint?: string;
  href: string;
  tone: "gold" | "blue";
}

const FEATURES: Feature[] = [
  {
    slug: "membership",
    icon: ShieldCheck,
    title: "Membership",
    subtitle: "Become a Member",
    body: "Join our community & be part of our mission.",
    cta: "Learn More",
    ctaHint: " about membership",
    href: "/membership",
    tone: "gold",
  },
  {
    slug: "services",
    icon: HeartHandshake,
    title: "Our Services",
    subtitle: "Charity Rides & Outreach",
    body: "Making a difference, one ride at a time.",
    cta: "View Programs",
    href: "/services",
    tone: "blue",
  },
  {
    slug: "merch",
    icon: Shirt,
    title: "Merchandise",
    subtitle: "Shop Our Gear",
    body: "Support our cause with R3 Riders merch.",
    cta: "Visit Shop",
    href: "/shop",
    tone: "blue",
  },
  {
    slug: "donate",
    icon: HandHeart,
    title: "Donate",
    subtitle: "Support Our Cause",
    body: "Help us make an impact today.",
    cta: "Donate Now",
    href: "/donations",
    tone: "gold",
  },
];

/** Custom artwork slot: public/brand/icons/<slug>.svg|png replaces the lucide placeholder. */
function CardIcon({ feature }: { feature: Feature }) {
  const custom = brandAsset(`icons/${feature.slug}.svg`, `icons/${feature.slug}.png`);
  if (custom) return <Image src={custom} alt="" width={64} height={64} className="h-16 w-16" />;
  const Icon = feature.icon;
  return <Icon aria-hidden strokeWidth={1.5} className="h-14 w-14 text-gold" />;
}

export function FeatureCards() {
  return (
    <section aria-label="What we do" className="panel-textured border-y gold-hairline">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:py-14">
        {FEATURES.map((f) => (
          <article
            key={f.slug}
            className={cn(
              "flex flex-col items-center rounded-lg border bg-black/50 px-6 pb-6 pt-8 text-center shadow-card",
              "gold-hairline border-b-4",
              f.tone === "gold" ? "border-b-gold" : "border-b-royal",
            )}
          >
            <CardIcon feature={f} />
            <h2 className="mt-4 text-2xl font-semibold uppercase tracking-wide text-white">{f.title}</h2>
            <p className="mt-2 text-lg font-bold text-white">{f.subtitle}</p>
            <p className="mt-2 flex-1 text-sm text-muted">{f.body}</p>
            <Link href={f.href} className={cn(buttonVariants({ variant: f.tone, size: "md" }), "mt-6 w-full")}>
              {f.cta}
              {f.ctaHint ? <span className="sr-only">{f.ctaHint}</span> : null}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
