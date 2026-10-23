import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { listMemberPrograms } from "@/server/queries/volunteering";

export const metadata = { title: "Manage programs" };

export default async function ManageProgramsPage() {
  const programs = await listMemberPrograms();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Manage programs</h1>
          <p className="text-sm text-muted">Programs, volunteer slots and rosters.</p>
        </div>
        <Link href="/manage/programs/new" className={buttonVariants({ variant: "gold" })}>
          New program
        </Link>
      </header>
      {programs.length === 0 ? (
        <EmptyState title="No programs yet">Create the first one.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {programs.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <Link href={`/manage/programs/${p.id}`} className="font-medium text-white hover:text-gold">
                {p.title}
              </Link>
              <span className="flex items-center gap-2">
                <StatusBadge status={p.is_public ? "approved" : "pending"} label={p.is_public ? "Public" : "Members only"} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
