import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { EventCalendar } from "@/components/portal/event-calendar";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { parseMonthParam, seatsRemaining } from "@/lib/events";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listMemberEvents } from "@/server/queries/events";

export const metadata = { title: "Events & Rides" };

type SP = { view?: string; month?: string; past?: string };

export default async function EventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { userId, profile } = await requireUser("/events");
  const view = sp.view === "calendar" ? "calendar" : "list";
  const past = sp.past === "1";

  let events;
  let cal: { year: number; month0: number } | null = null;
  if (view === "calendar") {
    cal = parseMonthParam(sp.month);
    const from = new Date(Date.UTC(cal.year, cal.month0, 1) - 8 * 3600_000).toISOString();
    const to = new Date(Date.UTC(cal.year, cal.month0 + 1, 1) - 8 * 3600_000).toISOString();
    events = await listMemberEvents(userId, { from, to });
  } else {
    events = await listMemberEvents(userId, { past });
  }

  const tab = (active: boolean) => cn("flex min-h-11 items-center rounded-md border px-4 text-sm font-medium", active ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Events &amp; Rides</h1>
          <p className="text-sm text-muted">RSVP so officers can plan seats, meals and safety.</p>
        </div>
        {hasRole(profile?.role, "officer") ? (
          <Link href="/manage/events" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Manage events
          </Link>
        ) : null}
      </header>

      <nav aria-label="Event views" className="flex flex-wrap gap-2">
        <Link href="/events" className={tab(view === "list" && !past)}>Upcoming</Link>
        <Link href="/events?past=1" className={tab(view === "list" && past)}>Past</Link>
        <Link href="/events?view=calendar" className={tab(view === "calendar")}>Calendar</Link>
      </nav>

      {cal ? <EventCalendar year={cal.year} month0={cal.month0} events={events} /> : null}

      {!cal && events.length === 0 ? (
        <EmptyState title={past ? "No past events" : "No upcoming events"}>{past ? "Past rides will be listed here." : "New rides will be announced here and by email."}</EmptyState>
      ) : null}

      {!cal || events.length > 0 ? (
        <ul className="space-y-3">
          {events.map((e) => {
            const left = seatsRemaining(e.capacity, e.taken);
            return (
              <li key={e.id} className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-1">
                  <h2 className="text-xl font-semibold">
                    <Link href={`/events/${e.slug}`} className="hover:text-gold">
                      {e.title}
                    </Link>
                  </h2>
                  <p className="flex items-center gap-2 text-sm text-gold">
                    <CalendarDays aria-hidden className="h-4 w-4" /> <time dateTime={e.starts_at}>{formatDateTime(e.starts_at)}</time>
                  </p>
                  {e.meeting_point ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <MapPin aria-hidden className="h-4 w-4" /> {e.meeting_point}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Users aria-hidden className="h-4 w-4" /> {e.taken} going{left !== null ? ` · ${left} seat${left === 1 ? "" : "s"} left` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {e.mine ? <StatusBadge status={e.mine.status === "no" ? "cancelled" : e.mine.status === "going" ? "approved" : "pending"} label={e.mine.status === "no" ? "Not going" : e.mine.status === "going" ? "Going" : "Maybe"} /> : null}
                  <Link href={`/events/${e.slug}`} className={buttonVariants({ variant: e.mine ? "outline" : "gold", size: "md" })}>
                    {e.mine ? "View RSVP" : "RSVP"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
