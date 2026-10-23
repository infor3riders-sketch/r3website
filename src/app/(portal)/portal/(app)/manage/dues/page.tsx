import Link from "next/link";
import { PeriodForm } from "@/components/portal/dues-forms";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatPHP } from "@/lib/format";
import { listPeriodsAdmin } from "@/server/queries/dues";

export const metadata = { title: "Manage dues" };

export default async function ManageDuesPage() {
  const periods = await listPeriodsAdmin();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Dues</h1>
        <p className="text-sm text-muted">Create dues periods, verify payments and record cash payments.</p>
      </header>

      <section aria-labelledby="new-h" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="new-h" className="text-xl font-semibold uppercase text-gold">New period</h2>
        <PeriodForm />
      </section>

      {periods.length === 0 ? (
        <EmptyState title="No dues periods yet" />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {periods.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/manage/dues/${p.id}`} className="text-lg font-medium hover:text-gold">{p.label}</Link>
                <p className="text-xs text-muted">{formatPHP(Number(p.amount))} · {formatDate(p.starts_on)} to {formatDate(p.due_on)}</p>
              </div>
              <p className="text-sm text-muted">
                <span className="font-semibold text-emerald-300">{p.paid}</span> paid · <span className="font-semibold text-gold">{p.pending}</span> to verify · {p.members} active members
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
