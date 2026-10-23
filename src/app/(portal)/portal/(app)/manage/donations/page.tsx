import Link from "next/link";
import { Download } from "lucide-react";
import { DonationTabs } from "@/components/portal/donation-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { donationReference } from "@/lib/donations";
import { formatDateTime, formatPHP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DONATION_FILTERS, countDonationsByStatus, isDonationFilter, listDonations } from "@/server/queries/donations";

export const metadata = { title: "Donations" };

const LABELS: Record<string, string> = { pending: "Awaiting verification", paid: "Verified", rejected: "Rejected", all: "All" };

export default async function ManageDonationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = isDonationFilter(sp.status) ? sp.status : "pending";
  const [rows, counts] = await Promise.all([listDonations(status), countDonationsByStatus()]);
  const total = rows.reduce((n, d) => n + Number(d.amount), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Donations</h1>
          <p className="text-sm text-muted">Verify manual payments. Only verified donations count toward campaigns.</p>
        </div>
        <a href={`/manage/donations/export?status=${status}`} className={buttonVariants({ variant: "outline", size: "sm" })} download>
          <Download aria-hidden className="h-4 w-4" /> Export CSV
        </a>
      </header>
      <DonationTabs active="donations" />
      <p className="text-xs text-muted">Exports contain donor personal data and every export is recorded in the audit log.</p>

      <nav aria-label="Filter donations" className="flex flex-wrap gap-2">
        {DONATION_FILTERS.map((s) => (
          <Link key={s} href={`/manage/donations?status=${s}`} aria-current={s === status ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm", s === status ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10")}>
            {LABELS[s]}
            <span className="rounded bg-white/10 px-1.5 text-xs">{s === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[s] ?? 0)}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="No donations here" />
      ) : (
        <>
          <p className="text-sm text-muted">{rows.length} shown · {formatPHP(total)}</p>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Donor</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Payment</th>
                  <th scope="col" className="px-4 py-3">Submitted</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((d) => (
                  <tr key={d.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link href={`/manage/donations/${d.id}`} className="font-medium hover:text-gold">{d.donor_name}</Link>
                      {d.is_anonymous ? <span className="ml-2 text-xs text-muted">(anonymous)</span> : null}
                      <div className="text-xs text-muted">{donationReference(d.id)} · {d.donor_email}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatPHP(Number(d.amount))}</td>
                    <td className="px-4 py-3 text-xs text-muted">{d.payment_proof_path ? "Proof uploaded" : d.payment_reference ? `Ref ${d.payment_reference}` : "Nothing yet"}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(d.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
