import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { cancelSignup } from "@/server/volunteer-actions";
import { listMemberPrograms, listMySignups } from "@/server/queries/volunteering";

export const metadata = { title: "Volunteer & Programs" };

export default async function ProgramsPage() {
  const { userId } = await requireUser("/programs");
  const [programs, mine] = await Promise.all([listMemberPrograms(), listMySignups(userId)]);
  const active = mine.filter((m) => m.signup.status !== "cancelled");
  const hours = mine.reduce((n, m) => n + Number(m.signup.hours ?? 0), 0);

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Volunteer &amp; Programs</h1>
        <p className="text-sm text-muted">Give your time to the mission. Your recorded volunteer hours: <span className="font-semibold text-gold">{hours}</span></p>
      </header>

      {programs.length === 0 ? (
        <EmptyState title="No programs yet">Programs will appear here once officers publish them.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {programs.map((p) => (
            <li key={p.id} className="flex flex-col rounded-lg border border-line bg-panel p-5">
              <HeartHandshake aria-hidden className="h-8 w-8 text-gold" strokeWidth={1.5} />
              <h2 className="mt-2 text-xl font-semibold uppercase">{p.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{p.summary}</p>
              <Link href={`/programs/${p.slug}`} className={buttonVariants({ variant: "blue", size: "sm", className: "mt-4 self-start" })}>
                {p.volunteer_enabled ? "View & volunteer" : "View program"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="mine-h" className="space-y-3">
        <h2 id="mine-h" className="text-2xl font-semibold uppercase text-gold">My sign-ups</h2>
        {active.length === 0 ? (
          <p className="text-muted">You have not signed up for anything yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
            {active.map(({ signup, program, slot }) => (
              <li key={signup.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-white">{program?.title ?? "Program"}{slot ? `: ${slot.title}` : ""}</p>
                  <p className="text-xs text-muted">{slot?.starts_at ? formatDateTime(slot.starts_at) : "General sign-up"}{signup.hours ? ` · ${signup.hours} h recorded` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={signup.status} />
                  {signup.status === "pending" || signup.status === "confirmed" ? (
                    <form action={cancelSignup}>
                      <input type="hidden" name="id" value={signup.id} />
                      <button type="submit" className="min-h-11 rounded-md px-3 text-sm text-red-300 hover:bg-white/10">Cancel</button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
