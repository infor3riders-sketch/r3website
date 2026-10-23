import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { listAnnouncements } from "@/server/queries/members";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { userId, profile } = await requireUser();
  const announcements = await listAnnouncements(userId, 5);
  const unread = announcements.filter((a) => a.unread).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold uppercase">Welcome, {profile?.road_name || profile?.full_name || "rider"}</h1>

      <section aria-labelledby="ann-h" className="max-w-3xl rounded-lg border border-line bg-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="ann-h" className="flex items-center gap-2 text-xl font-semibold uppercase text-gold">
            <Bell aria-hidden className="h-5 w-5" /> Announcements
            {unread > 0 ? <span className="rounded bg-gold px-1.5 text-xs font-semibold text-black">{unread} new</span> : null}
          </h2>
          <Link href="/announcements" className="text-sm text-gold hover:text-gold-hover">
            View all &rarr;
          </Link>
        </div>
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
      </section>

      <p className="text-sm text-muted">Your next ride, RSVPs, dues status and volunteer opportunities will join this dashboard as those modules arrive.</p>
    </div>
  );
}
