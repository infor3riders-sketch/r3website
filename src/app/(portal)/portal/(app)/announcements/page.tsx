import Link from "next/link";
import { Pin } from "lucide-react";
import { AnnouncementComposer } from "@/components/portal/announcement-forms";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import { deleteAnnouncement, markRead, togglePin } from "@/server/announcement-actions";
import { listAnnouncements } from "@/server/queries/members";

export const metadata = { title: "Announcements" };

async function markAllRead() {
  "use server";
  await markRead();
}

export default async function AnnouncementsPage() {
  const { userId, profile } = await requireUser("/announcements");
  const items = await listAnnouncements(userId);
  const unread = items.filter((a) => a.unread).length;
  const officer = hasRole(profile?.role, "officer");

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Announcements</h1>
          <p className="text-sm text-muted">{unread > 0 ? `${unread} unread` : "You are all caught up."}</p>
        </div>
        {unread > 0 ? (
          <form action={markAllRead}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </header>

      {officer ? (
        <details className="rounded-lg border border-line bg-panel p-5">
          <summary className="min-h-11 cursor-pointer text-lg font-semibold uppercase text-gold">Post an announcement</summary>
          <div className="mt-4">
            <AnnouncementComposer />
          </div>
        </details>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="No announcements yet">Club news will show up here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className={`rounded-lg border bg-panel p-4 ${a.unread ? "border-gold/60" : "border-line"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    {a.pinned ? (
                      <span className="inline-flex items-center gap-1 text-gold">
                        <Pin aria-hidden className="h-3.5 w-3.5" /> Pinned
                      </span>
                    ) : null}
                    {a.unread ? <span className="rounded bg-gold px-1.5 py-0.5 font-semibold text-black">New</span> : null}
                    <time dateTime={a.published_at}>{formatDateTime(a.published_at)}</time>
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    <Link href={`/announcements/${a.id}`} className="hover:text-gold">
                      {a.title}
                    </Link>
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                </div>
                {officer ? (
                  <div className="flex shrink-0 gap-1">
                    <form action={togglePin}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="pinned" value={String(a.pinned)} />
                      <Button type="submit" variant="ghost" size="sm">
                        {a.pinned ? "Unpin" : "Pin"}
                      </Button>
                    </form>
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={a.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-red-300 hover:text-red-200">
                        Delete
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
