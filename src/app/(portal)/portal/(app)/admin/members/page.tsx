import Link from "next/link";
import { InviteForm } from "@/components/portal/admin-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listMembers } from "@/server/queries/admin";

export const metadata = { title: "Members" };

const ROLES = ["all", "member", "officer", "admin"] as const;

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const role = ROLES.includes(sp.role as (typeof ROLES)[number]) ? (sp.role as string) : "all";
  const members = await listMembers({ q, role });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Members &amp; roles</h1>
          <p className="text-sm text-muted">Accounts are created by invitation or when an application is approved. There is no open sign-up.</p>
        </div>
        <form role="search" className="flex gap-2">
          <input type="hidden" name="role" value={role} />
          <label htmlFor="q" className="sr-only">
            Search members
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search name, email, road name"
            className="h-11 w-64 max-w-full rounded-md border border-line bg-black/40 px-3 text-sm text-white placeholder:text-muted/70 focus-visible:border-gold"
          />
          <button type="submit" className="h-11 rounded-md border border-line px-4 text-sm font-medium hover:bg-white/10">
            Search
          </button>
        </form>
      </header>

      <section aria-labelledby="invite-h" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="invite-h" className="text-xl font-semibold uppercase text-gold">Invite someone</h2>
        <InviteForm />
      </section>

      <nav aria-label="Filter by role" className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <Link
            key={r}
            href={`/admin/members?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={r === role ? "page" : undefined}
            className={cn("flex min-h-11 items-center rounded-md border px-4 text-sm font-medium capitalize", r === role ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10")}
          >
            {r}
          </Link>
        ))}
      </nav>

      {members.length === 0 ? (
        <EmptyState title="No members found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Member</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.id}`} className="font-medium hover:text-gold">
                      {m.full_name ?? m.email}
                    </Link>
                    <div className="text-xs text-muted">
                      {m.email}
                      {m.road_name ? ` · "${m.road_name}"` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status === "active" ? "approved" : m.status === "suspended" ? "rejected" : "expired"} label={m.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{m.member_since ? formatDate(m.member_since) : "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
