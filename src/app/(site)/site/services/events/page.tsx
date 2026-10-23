import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";
import { getUpcomingEvents } from "@/server/queries/public";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Events & Rides",
  description: "Upcoming charity rides, outreach activities and meetups from R3 Riders.",
};

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <>
      <PageHero eyebrow="Calendar" title="Events & Rides" subtitle="Join us on the road and in the community." />
      <Section id="events">
        {events.length === 0 ? (
          <EmptyState title="No upcoming events right now">New rides and activities are announced here and in the member portal.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-4 rounded-lg border border-line bg-panel p-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold uppercase tracking-wide">{e.title}</h2>
                  <p className="flex items-center gap-2 text-gold">
                    <CalendarDays aria-hidden className="h-4 w-4" />
                    <time dateTime={e.starts_at}>{formatDateTime(e.starts_at)}</time>
                  </p>
                  {e.meeting_point ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <MapPin aria-hidden className="h-4 w-4" /> {e.meeting_point}
                    </p>
                  ) : null}
                </div>
                <Link href={`/services/events/${e.slug}`} className={buttonVariants({ variant: "outline", size: "md" })}>
                  Details
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
