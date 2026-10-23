import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { ContactForm } from "@/components/site/public-forms";
import { getSetting } from "@/server/queries/public";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with R3 Riders about membership, programs, donations or partnerships.",
};

export default async function ContactPage() {
  const contact = await getSetting("contact");
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's talk" subtitle="Questions about membership, programs, donations or partnerships? Send us a message." />
      <Section id="contact" className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="gold-hairline rounded-lg border bg-panel p-6 shadow-card">
          <ContactForm />
        </div>

        <aside aria-label="Contact details" className="space-y-6">
          <ul className="space-y-3 text-white/90">
            <li className="flex items-start gap-3">
              <MapPin aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold" /> {contact.address}
            </li>
            <li className="flex items-center gap-3">
              <Mail aria-hidden className="h-5 w-5 shrink-0 text-gold" />
              <a href={`mailto:${contact.email}`} className="hover:text-gold">
                {contact.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone aria-hidden className="h-5 w-5 shrink-0 text-gold" /> {contact.phone}
            </li>
          </ul>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {contact.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-hover">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          {contact.map_embed_url ? (
            <iframe
              title="Map"
              src={contact.map_embed_url}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-64 w-full rounded-lg border border-line"
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
              Map embed placeholder
            </div>
          )}
        </aside>
      </Section>
    </>
  );
}
