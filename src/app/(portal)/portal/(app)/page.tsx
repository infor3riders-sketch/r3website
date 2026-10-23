import Link from "next/link";
import { Bell, CalendarDays, HeartHandshake } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { listMemberEvents, listMyUpcomingRsvps } from "@/server/queries/events";
import { listAnnouncements } from "@/server/queries/members";
import { listOpenVolunteerOpportunities } from "@/server/queries/volunteering";

export const metadata = { title: "Dashboard" };

function Card({ id, icon: Icon, title, href, cta, badge, children }: { id: string; icon: typeof Bell; title: string; href: string; cta: string; badge?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 text-xl font-semibold uppercase text-gold">
          <Icon aria-hidden className="h-5 w-5" /> {title}
          {badge ? <span className="rounded bg-gold px-1.5 text-xs font-semibold text-black">{badge}</span> : null}
        </h2>
        <Link href={href} className="text-sm text-gold hover:text-gold-hover">
          {cta} &rarr;
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const { userId, profile } = await requireUser();
  const [announcements, upcoming, myRsvps, opportunities] = await Promise.all([
    listAnnouncements(userId, 5),
    listMemberEvents(userId, { limit: 1 }),
    listMyUpcomingRsvps(userId, 4),
    listOpenVolunteerOpportunities(4),
  ]);
  const unread = announcements.filter((a) => a.unread).length;
  const next = upcoming[0];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold uppercase">Welcome, {profile?.road_name || profile?.full_name || "rider"}</h1>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card id="next-h" icon={CalendarDays} title="Next ride" href="/events" cta="All events">
          {next ? (
            <div className="space-y-1">
              <Link href={`/events/${next.slug}`} className="text-xl font-semibold hover:text-gold">
                {next.title}
              </Link>
              <p className="text-gold">{formatDateTime(next.starts_at)}</p>
              {next.meeting_point ? <p className="text-sm text-muted">Meet at {next.meeting_point}</p> : null}
              <p className="text-sm text-muted">{next.mine ? `Your RSVP: ${next.mine.status === "no" ? "not going" : next.mine.status}` : "You have not responded yet."}</p>
            </div>
          ) : (
            <p className="text-muted">No upcoming events yet.</p>
          )}
        </Card>

        <Card id="rsvp-h" icon={CalendarDays} title="My RSVPs" href="/events" cta="Manage">
          {myRsvps.length === 0 ? (
            <p className="text-muted">You have no upcoming RSVPs.</p>
          ) : (
            <ul className="divide-y divide-line">
              {myRsvps.map(({ event, rsvp }) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/events/${event.slug}`} className="font-medium hover:text-gold">
                    {event.title}
                  </Link>
                  <span className="text-xs capitalize text-muted">
                    {rsvp.status} · {formatDateTime(event.starts_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="ann-h" icon={Bell} title="Announcements" href="/announcements" cta="View all" badge={unread > 0 ? `${unread} new` : undefined}>
          {announcements.length === 0 ? (
            <p className="text-muted">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((a) => (
                <li key={a.id} className="py-3">
                  <Link href={`/announcements/${a.id}`} className="font-medium hover:text-gold">
                    {a.unread ? <span aria-label="Unread" className="mr-2 inline-block h-2 w-2 rounded-full bg-gold" /> : null}
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted">{formatDateTime(a.published_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="vol-h" icon={HeartHandshake} title="Volunteer opportunities" href="/programs" cta="Browse">
          {opportunities.length === 0 ? (
            <p className="text-muted">No open slots right now.</p>
          ) : (
            <ul className="divide-y divide-line">
              {opportunities.map((o) => (
                <li key={o.id} className="py-2">
                  <Link href="/programs" className="font-medium hover:text-gold">
                    {o.title}
                  </Link>
                  <p className="text-xs text-muted">{o.starts_at ? formatDateTime(o.starts_at) : "Flexible timing"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-sm text-muted">Dues status and documents join this dashboard as those modules arrive.</p>
    </div>
  );
}
