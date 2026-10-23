import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { isPastEvent } from "@/lib/events";
import { formatDateTime } from "@/lib/format";
import { listAllEvents } from "@/server/queries/events";

export const metadata = { title: "Manage events" };

export default async function ManageEventsPage() {
  const events = await listAllEvents();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Manage events</h1>
          <p className="text-sm text-muted">Create rides and activities, see RSVPs and check members in.</p>
        </div>
        <Link href="/manage/events/new" className={buttonVariants({ variant: "gold" })}>
          New event
        </Link>
      </header>
      {events.length === 0 ? (
        <EmptyState title="No events yet">Create the first one.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Event</th>
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Capacity</th>
                <th scope="col" className="px-4 py-3">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/manage/events/${e.id}`} className="font-medium text-white hover:text-gold">
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDateTime(e.starts_at)} {isPastEvent(e) ? <span className="ml-1 text-xs">(past)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{e.capacity ?? "Unlimited"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.is_public ? "approved" : "pending"} label={e.is_public ? "Public" : "Members only"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
