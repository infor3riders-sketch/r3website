import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, ClipboardList, MapPin, Route } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { JsonLd } from "@/components/site/json-ld";
import { EventInterestForm } from "@/components/site/public-forms";
import { formatDateTime } from "@/lib/format";
import { siteUrl } from "@/lib/env";
import { ORG } from "@/lib/org";
import { getEvent } from "@/server/queries/public";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  if (!event) return {};
  return { title: event.title, description: event.description?.slice(0, 160) ?? undefined };
}

function Detail({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold uppercase text-gold">
        <Icon aria-hidden className="h-5 w-5" /> {label}
      </h3>
      <div className="mt-2 whitespace-pre-line text-white/90">{children}</div>
    </div>
  );
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.starts_at,
    ...(event.ends_at ? { endDate: event.ends_at } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(event.meeting_point ? { location: { "@type": "Place", name: event.meeting_point } } : {}),
    ...(event.description ? { description: event.description } : {}),
    organizer: { "@type": "Organization", name: ORG.name, url: siteUrl("/") },
    url: siteUrl(`/services/events/${event.slug}`),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero eyebrow="Event" title={event.title} subtitle={formatDateTime(event.starts_at)} />
      <Section id="event-details">
        {event.description ? <p className="mb-6 whitespace-pre-line text-lg leading-relaxed text-white/90">{event.description}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Detail icon={CalendarDays} label="When">
            <time dateTime={event.starts_at}>{formatDateTime(event.starts_at)}</time>
            {event.ends_at ? <> to {formatDateTime(event.ends_at)}</> : null}
          </Detail>
          {event.meeting_point ? <Detail icon={MapPin} label="Meeting point">{event.meeting_point}</Detail> : null}
          {event.route ? <Detail icon={Route} label="Route">{event.route}</Detail> : null}
          {event.requirements ? <Detail icon={ClipboardList} label="Requirements">{event.requirements}</Detail> : null}
        </div>
      </Section>

      {event.public_interest_enabled ? (
        <Section id="interest" title="Interested in joining?">
          <div className="gold-hairline max-w-xl rounded-lg border bg-panel p-6 shadow-card">
            <p className="mb-4 text-muted">Let us know and we will share details as the date approaches. Club members RSVP in the member portal.</p>
            <EventInterestForm eventId={event.id} />
          </div>
        </Section>
      ) : null}
    </>
  );
}
