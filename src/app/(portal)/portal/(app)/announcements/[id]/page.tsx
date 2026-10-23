import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MarkRead } from "@/components/portal/announcement-forms";
import { formatDateTime } from "@/lib/format";
import { getAnnouncement } from "@/server/queries/members";

export const metadata = { title: "Announcement" };

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const a = await getAnnouncement(id);
  if (!a) notFound();
  return (
    <article className="max-w-3xl space-y-4">
      <MarkRead id={a.id} />
      <Link href="/announcements" className="text-sm text-gold hover:text-gold-hover">
        &larr; All announcements
      </Link>
      <header>
        <h1 className="text-3xl font-semibold uppercase">{a.title}</h1>
        <p className="text-sm text-muted">{formatDateTime(a.published_at)}</p>
      </header>
      <div className="whitespace-pre-line text-lg leading-relaxed text-white/90">{a.body}</div>
    </article>
  );
}
