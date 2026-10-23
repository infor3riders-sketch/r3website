import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, Circle } from "lucide-react";
import { EventForm } from "@/components/portal/event-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { seatsUsed } from "@/lib/events";
import { formatDateTime } from "@/lib/format";
import { deleteEvent, toggleCheckIn } from "@/server/event-actions";
import { getEventById, getRoster } from "@/server/queries/events";
import { listMemberPrograms } from "@/server/queries/volunteering";

export const metadata = { title: "Event roster" };

export default async function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const event = await getEventById(id);
  if (!event) notFound();
  const [programs, { rows, others }] = await Promise.all([listMemberPrograms(), getRoster(id)]);
  const checkedIn = rows.filter((r) => r.checked_in_at).length;
  const going = rows.filter((r) => r.status === "going");
  const seats = seatsUsed(rows.filter((r) => r.status).map((r) => ({ status: r.status!, riders: r.riders, passengers: r.passengers })));

  return (
    <div className="space-y-8">
      <Link href="/manage/events" className="text-sm text-gold hover:text-gold-hover">
        &larr; All events
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">{event.title}</h1>
          <p className="text-sm text-muted">{formatDateTime(event.starts_at)}</p>
        </div>
        <dl className="flex gap-6 text-center">
          <div><dt className="text-xs uppercase text-muted">Going</dt><dd className="font-display text-2xl text-gold">{going.length}</dd></div>
          <div><dt className="text-xs uppercase text-muted">Seats</dt><dd className="font-display text-2xl text-gold">{seats}{event.capacity ? `/${event.capacity}` : ""}</dd></div>
          <div><dt className="text-xs uppercase text-muted">Checked in</dt><dd className="font-display text-2xl text-gold">{checkedIn}</dd></div>
        </dl>
      </header>

      <section aria-labelledby="roster-h" className="space-y-3">
        <h2 id="roster-h" className="text-2xl font-semibold uppercase text-gold">Roster &amp; check-in</h2>
        {rows.length === 0 ? (
          <p className="text-muted">No RSVPs or check-ins yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
            {rows.map((r) => (
              <li key={r.profile_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {r.name} {r.road_name ? <span className="text-sm text-gold">&ldquo;{r.road_name}&rdquo;</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {r.status ? `${r.riders} rider${r.riders === 1 ? "" : "s"} + ${r.passengers} passenger${r.passengers === 1 ? "" : "s"}` : "Walk-in"}
                    {event.requires_waiver && r.status === "going" ? ` · waiver ${r.waiver_signed_at ? "signed" : "NOT signed"}` : ""}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.status ? <StatusBadge status={r.status === "going" ? "approved" : r.status === "maybe" ? "pending" : "cancelled"} className="capitalize" /> : null}
                  <form action={toggleCheckIn}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="profile_id" value={r.profile_id} />
                    <Button type="submit" size="sm" variant={r.checked_in_at ? "gold" : "outline"} aria-pressed={Boolean(r.checked_in_at)} className="min-w-36">
                      {r.checked_in_at ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : <Circle aria-hidden className="h-4 w-4" />}
                      {r.checked_in_at ? "Checked in" : "Check in"}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {others.length > 0 ? (
          <form action={toggleCheckIn} className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-panel p-3">
            <input type="hidden" name="event_id" value={event.id} />
            <div className="min-w-0 flex-1">
              <label htmlFor="walkin" className="mb-1 block text-sm font-medium">Check in a member without an RSVP</label>
              <Select id="walkin" name="profile_id" required defaultValue="">
                <option value="" disabled>Choose member…</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">Check in</Button>
          </form>
        ) : null}
      </section>

      <section aria-labelledby="edit-h" className="max-w-3xl space-y-3">
        <h2 id="edit-h" className="text-2xl font-semibold uppercase text-gold">Edit event</h2>
        <div className="rounded-lg border border-line bg-panel p-5">
          <EventForm event={event} programs={programs.map((p) => ({ id: p.id, title: p.title }))} />
        </div>
        <form action={deleteEvent}>
          <input type="hidden" name="id" value={event.id} />
          <Button type="submit" variant="danger" size="sm">Delete event</Button>
        </form>
      </section>
    </div>
  );
}
