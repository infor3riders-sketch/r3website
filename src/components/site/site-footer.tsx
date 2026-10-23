import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { NAV_LINKS, ORG } from "@/lib/org";
import { portalUrl } from "@/lib/env";
import { Logo } from "@/components/ui/logo";

const LEGAL = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/shop-policies", label: "Shipping & Returns" },
  { href: "/legal/donation-policy", label: "Donation Policy" },
];

export function SiteFooter() {
  return (
    <footer className="panel-textured border-t gold-hairline">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-4 md:col-span-1">
          <Logo className="w-32" />
          <p className="text-sm text-muted">{ORG.mission}</p>
        </div>

        <nav aria-label="Footer" className="space-y-3">
          <h2 className="font-display text-lg uppercase tracking-wider text-gold">Explore</h2>
          <ul className="space-y-2 text-sm text-muted">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <h2 className="font-display text-lg uppercase tracking-wider text-gold">Contact</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-start gap-2">
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {ORG.address}
            </li>
            <li className="flex items-center gap-2">
              <Mail aria-hidden className="h-4 w-4 shrink-0 text-gold" />
              <a className="hover:text-white" href={`mailto:${ORG.email}`}>
                {ORG.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone aria-hidden className="h-4 w-4 shrink-0 text-gold" />
              {ORG.phone}
            </li>
          </ul>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted">
            {ORG.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} rel="noopener noreferrer" target="_blank" className="hover:text-white">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg uppercase tracking-wider text-gold">Legal</h2>
          <ul className="space-y-2 text-sm text-muted">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={portalUrl("/login")} className="hover:text-white">
                Member Login
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} {ORG.name}. All rights reserved.
      </div>
    </footer>
  );
}
