import Link from "next/link";
import { StatusBadge } from "@/components/portal/status-badge";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  countApplicationsByStatus,
  getMembershipTypeNames,
  isStatusFilter,
  listApplications,
  STATUS_FILTERS,
} from "@/server/queries/applications";

export const metadata = { title: "Applications" };

const LABELS: Record<string, string> = { pending: "Pending", info_requested: "Info requested", approved: "Approved", rejected: "Rejected", all: "All" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = isStatusFilter(sp.status) ? sp.status : "pending";
  const q = (sp.q ?? "").slice(0, 80);
  const [rows, counts, typeNames] = await Promise.all([listApplications({ status, q }), countApplicationsByStatus(), getMembershipTypeNames()]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Applications</h1>
          <p className="text-sm text-muted">Review membership applications, request information, and approve to send a portal invitation.</p>
        </div>
        <form role="search" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <label className="sr-only" htmlFor="q">
            Search by name or email
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
            className="h-11 w-64 max-w-full rounded-md border border-line bg-black/40 px-3 text-sm text-white placeholder:text-muted/70 focus-visible:border-gold"
          />
          <button type="submit" className="h-11 rounded-md border border-line px-4 text-sm font-medium hover:bg-white/10">
            Search
          </button>
        </form>
      </header>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => {
          const n = s === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[s];
          return (
            <Link
              key={s}
              href={`/applications?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={s === status ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium",
                s === status ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10",
              )}
            >
              {LABELS[s]} <span className="rounded bg-white/10 px-1.5 text-xs">{n}</span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="No applications here">{q ? "Try a different search." : "New applications will appear in this queue."}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Applicant</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Submitted</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/applications/${r.id}`} className="font-medium text-white hover:text-gold">
                      {r.full_name}
                    </Link>
                    <div className="text-xs text-muted">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{(r.membership_type_id && typeNames[r.membership_type_id]) || "Not specified"}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
