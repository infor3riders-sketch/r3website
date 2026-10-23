import Link from "next/link";
import { EventForm } from "@/components/portal/event-forms";
import { listMemberPrograms } from "@/server/queries/volunteering";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  const programs = await listMemberPrograms();
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/manage/events" className="text-sm text-gold hover:text-gold-hover">
        &larr; All events
      </Link>
      <h1 className="text-3xl font-semibold uppercase">New event</h1>
      <div className="rounded-lg border border-line bg-panel p-5">
        <EventForm programs={programs.map((p) => ({ id: p.id, title: p.title }))} />
      </div>
    </div>
  );
}
