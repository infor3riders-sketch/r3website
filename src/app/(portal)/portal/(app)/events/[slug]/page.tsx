import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ClipboardList, MapPin, Route, Users } from "lucide-react";
import { RsvpForm } from "@/components/portal/event-forms";
import { Notice } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { isPastEvent, seatsRemaining } from "@/lib/events";
import { formatDateTime } from "@/lib/format";
import { getMemberEvent } from "@/server/queries/events";

export const metadata = { title: "Event" };

function Detail({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold">
        <Icon aria-hidden className="h-4 w-4" /> {label}
      </h3>
      <div className="mt-1 whitespace-pre-line text-white/90">{children}</div>
    </div>
  );
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await requireUser(`/events/${slug}`);
  const event = await getMemberEvent(userId, slug);
  if (!event) notFound();
  const past = isPastEvent(event);
  const left = seatsRemaining(event.capacity, event.taken);

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Link href="/events" className="text-sm text-gold hover:text-gold-hover">
          &larr; All events
        </Link>
        <header>
          <h1 className="text-3xl font-semibold uppercase">{event.title}</h1>
          <p className="text-gold">
            <time dateTime={event.starts_at}>{formatDateTime(event.starts_at)}</time>
          </p>
        </header>
        {event.description ? <p className="whitespace-pre-line text-lg leading-relaxed text-white/90">{event.description}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail icon={CalendarDays} label="When">
            {formatDateTime(event.starts_at)}
            {event.ends_at ? ` to ${formatDateTime(event.ends_at)}` : ""}
          </Detail>
          {event.meeting_point ? <Detail icon={MapPin} label="Meeting point">{event.meeting_point}</Detail> : null}
          {event.route ? <Detail icon={Route} label="Route">{event.route}</Detail> : null}
          {event.requirements ? <Detail icon={ClipboardList} label="Requirements">{event.requirements}</Detail> : null}
          <Detail icon={Users} label="Riders going">
            {event.taken}
            {event.capacity ? ` of ${event.capacity} seats` : ""}
          </Detail>
        </div>
      </div>

      <aside aria-label="RSVP" className="h-fit rounded-lg border border-line bg-panel p-5 lg:sticky lg:top-6">
        <h2 className="mb-4 text-xl font-semibold uppercase text-gold">Your RSVP</h2>
        {past ? <Notice tone="info">This event has already taken place.</Notice> : <RsvpForm event={event} mine={event.mine} seatsLeft={left} />}
      </aside>
    </div>
  );
}
