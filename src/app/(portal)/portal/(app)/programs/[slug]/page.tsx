import Link from "next/link";
import { notFound } from "next/navigation";
import { SignupForm } from "@/components/portal/volunteer-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { seatsRemaining } from "@/lib/events";
import { formatDateTime } from "@/lib/format";
import { getProgramBySlug, getSlots } from "@/server/queries/volunteering";

export const metadata = { title: "Program" };

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await requireUser(`/programs/${slug}`);
  const program = await getProgramBySlug(slug);
  if (!program) notFound();
  const slots = await getSlots(program.id, userId);

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/programs" className="text-sm text-gold hover:text-gold-hover">
        &larr; All programs
      </Link>
      <header>
        <h1 className="text-3xl font-semibold uppercase">{program.title}</h1>
        {program.summary ? <p className="text-muted">{program.summary}</p> : null}
      </header>
      {program.description ? <p className="whitespace-pre-line text-lg leading-relaxed text-white/90">{program.description}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {program.schedule ? (
          <div className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">Schedule</h2>
            <p className="mt-1 text-white/90">{program.schedule}</p>
          </div>
        ) : null}
        {program.how_to_join ? (
          <div className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">How to join</h2>
            <p className="mt-1 text-white/90">{program.how_to_join}</p>
          </div>
        ) : null}
      </div>

      {program.volunteer_enabled ? (
        <section aria-labelledby="slots-h" className="space-y-3">
          <h2 id="slots-h" className="text-2xl font-semibold uppercase text-gold">Volunteer slots</h2>
          {slots.length === 0 ? (
            <EmptyState title="No scheduled slots right now">You can still tell officers you are available.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {slots.map((s) => {
                const left = seatsRemaining(s.capacity, s.taken);
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel p-4">
                    <div>
                      <p className="text-lg font-semibold">{s.title}</p>
                      <p className="text-sm text-muted">
                        {s.starts_at ? formatDateTime(s.starts_at) : "Flexible timing"}
                        {left !== null ? ` · ${left} spot${left === 1 ? "" : "s"} left` : ""}
                      </p>
                    </div>
                    {s.mine ? <StatusBadge status={s.mine.status} /> : left === 0 ? <span className="text-sm text-muted">Full</span> : <SignupForm programId={program.id} slotId={s.id} label="Sign up for this slot" />}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="mb-2 text-sm text-muted">Not seeing a good time? Let officers know you are generally available.</p>
            <SignupForm programId={program.id} label="I'm generally available" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
