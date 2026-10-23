import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { donationReference } from "@/lib/donations";
import { formatDateTime, formatPHP } from "@/lib/format";
import { rejectDonation, verifyDonation } from "@/server/donation-admin-actions";
import { getDonationForOfficer } from "@/server/queries/donations";

export const metadata = { title: "Donation" };

export default async function DonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const found = await getDonationForOfficer(id);
  if (!found) notFound();
  const { donation: d, proofUrl, campaign } = found;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/manage/donations" className="text-sm text-gold hover:text-gold-hover">&larr; All donations</Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">{formatPHP(Number(d.amount))}</h1>
          <p className="font-mono text-sm text-muted">{donationReference(d.id)} · {formatDateTime(d.created_at)}</p>
        </div>
        <StatusBadge status={d.status} />
      </header>

      <section className="space-y-1 rounded-lg border border-line bg-panel p-5">
        <h2 className="mb-1 text-lg font-semibold uppercase text-gold">Donor</h2>
        <p className="text-white">{d.donor_name} {d.is_anonymous ? <span className="text-sm text-muted">(wants to stay anonymous publicly)</span> : null}</p>
        <p className="text-sm text-muted">{d.donor_email}</p>
        <p className="text-sm text-muted">Campaign: {campaign ?? "General fund"}</p>
        {d.message ? <p className="mt-2 whitespace-pre-line text-sm text-white/90">&ldquo;{d.message}&rdquo;</p> : null}
      </section>

      <section className="space-y-2 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold uppercase text-gold">Payment</h2>
        <p className="text-sm text-muted">Method: {d.payment_method}</p>
        <p className="text-sm text-white">Reference: {d.payment_reference ?? <span className="text-muted">none given</span>}</p>
        {proofUrl ? (
          <p className="text-sm"><a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">Open proof of payment</a> <span className="text-xs text-muted">(link expires in 10 minutes)</span></p>
        ) : <p className="text-sm text-muted">No proof uploaded.</p>}
        {d.verified_at ? <p className="text-xs text-muted">Reviewed {formatDateTime(d.verified_at)}</p> : null}
      </section>

      {d.status === "pending" ? (
        <section className="space-y-3 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold uppercase text-gold">Verify</h2>
          <p className="text-sm text-muted">Confirm the money arrived (check GCash / bank). Verifying counts it toward the campaign and emails the donor.</p>
          <div className="flex flex-wrap gap-3">
            <form action={verifyDonation}>
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" data-testid="verify-donation">Verify donation</Button>
            </form>
            <form action={rejectDonation}>
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" variant="danger">Reject</Button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
