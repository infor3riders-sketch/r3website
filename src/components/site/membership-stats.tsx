import { Users } from "lucide-react";
import { barPercent, cleanStats, totalMembers } from "@/lib/membership-stats";
import { getSetting } from "@/server/queries/public";

/** Member counts per area (admin-editable `membership_stats` setting). */
export async function MembershipStats({ heading = "Our Growing Brotherhood" }: { heading?: string }) {
  const stats = cleanStats(await getSetting("membership_stats"));
  if (stats.length === 0) return null;
  const total = totalMembers(stats);

  return (
    <section aria-labelledby="stats-h" className="border-y border-line bg-panel/60">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Users aria-hidden className="h-9 w-9 text-gold" strokeWidth={1.5} />
          <h2 id="stats-h" className="text-3xl font-semibold uppercase tracking-wide text-white">
            {heading}
          </h2>
          <p className="text-muted">
            <span className="font-display text-4xl font-bold text-gold">{total}</span> riders and counting across {stats.length} {stats.length === 1 ? "area" : "areas"}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <li key={s.area} className="gold-hairline rounded-lg border bg-ink p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-semibold text-white">{s.area}</span>
                <span className="font-display text-3xl font-bold text-gold">
                  {s.members}
                  <span className="ml-1 text-sm font-medium text-muted">{s.members === 1 ? "member" : "members"}</span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${s.area}: ${s.members} of ${total} members`}
                className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-hover" style={{ width: `${barPercent(s.members, stats)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
