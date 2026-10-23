import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, HeartHandshake } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { getPrograms } from "@/server/queries/public";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Services & Programs",
  description: "Charity rides, community outreach, volunteer programs and cooperative initiatives of R3 Riders.",
};

export default async function ServicesPage() {
  const programs = await getPrograms();
  return (
    <>
      <PageHero eyebrow="Services" title="Making a difference, one ride at a time" subtitle="Charity rides, community outreach, volunteering and partnerships." />
      <Section id="programs" title="Our Programs">
        {programs.length === 0 ? (
          <EmptyState title="Programs are being updated">Check back soon, or contact us to learn how to help.</EmptyState>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {programs.map((p) => (
              <li key={p.id} className="gold-hairline flex flex-col rounded-lg border border-b-4 border-b-royal bg-panel p-6 shadow-card">
                <HeartHandshake aria-hidden className="h-9 w-9 text-gold" strokeWidth={1.5} />
                <h3 className="mt-3 text-2xl font-semibold uppercase tracking-wide">{p.title}</h3>
                <p className="mt-2 flex-1 text-muted">{p.summary}</p>
                <Link href={`/services/${p.slug}`} className={buttonVariants({ variant: "blue", size: "md", className: "mt-5 self-start" })}>
                  View Program
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section className="pt-0">
        <div className="panel-textured gold-hairline flex flex-col items-center gap-4 rounded-lg border p-8 text-center">
          <CalendarDays aria-hidden className="h-10 w-10 text-gold" strokeWidth={1.5} />
          <h2 className="text-2xl font-semibold uppercase">Upcoming rides & events</h2>
          <Link href="/services/events" className={buttonVariants({ variant: "gold", size: "lg" })}>
            See the calendar
          </Link>
        </div>
      </Section>
    </>
  );
}
