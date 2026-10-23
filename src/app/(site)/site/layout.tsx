import type { Metadata, Viewport } from "next";
import { display, sans } from "@/lib/fonts";
import { ORG } from "@/lib/org";
import { siteUrl } from "@/lib/env";
import { CartProvider } from "@/components/site/cart";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { Logo } from "@/components/ui/logo";
import { JsonLd } from "@/components/site/json-ld";
import "./site.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: { default: `${ORG.name} | ${ORG.tagline}`, template: `%s | ${ORG.shortName}` },
  description: `${ORG.mission} A motorcycle club and community charity organization.`,
  openGraph: {
    type: "website",
    siteName: ORG.name,
    title: `${ORG.name} | ${ORG.tagline}`,
    description: ORG.mission,
    locale: "en_PH",
  },
};

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="theme-site flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[60] rounded bg-gold px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "NonProfitOrganization",
            name: ORG.name,
            url: siteUrl("/"),
            slogan: ORG.tagline,
            description: ORG.mission,
            email: ORG.email,
            sameAs: ORG.socials.map((s) => s.href),
          }}
        />
        <CartProvider>
          <SiteNav logo={<Logo className="w-11" priority />} />
          <main id="main" className="flex-1">
            {children}
          </main>
        </CartProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
