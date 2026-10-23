import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatDate, formatPHP } from "@/lib/format";
import { deletePeriod, recordCashDues, rejectDues, verifyDues } from "@/server/dues-actions";
import { getPeriodRoster } from "@/server/queries/dues";

export const metadata = { title: "Dues roster" };

export default async function PeriodRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getPeriodRoster(id);
  if (!data) notFound();
  const { period, rows } = data;
  const paid = rows.filter((r) => r.payment?.status === "paid").length;

  return (
    <div className="space-y-6">
      <Link href="/manage/dues" className="text-sm text-gold hover:text-gold-hover">&larr; All periods</Link>
      <header>
        <h1 className="text-3xl font-semibold uppercase">{period.label}</h1>
        <p className="text-sm text-muted">{formatPHP(Number(period.amount))} · due {formatDate(period.due_on)} · {paid} of {rows.length} paid</p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Member</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Payment details</th>
              <th scope="col" className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ member, payment, proofUrl }) => (
              <tr key={member.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{member.full_name ?? member.email}</p>
                  {member.road_name ? <p className="text-xs text-gold">&ldquo;{member.road_name}&rdquo;</p> : null}
                </td>
                <td className="px-4 py-3">
                  {payment ? <StatusBadge status={payment.status} label={payment.status === "pending" ? "To verify" : undefined} /> : <StatusBadge status="expired" label="Not paid" />}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {payment ? (
                    <>
                      <p>Ref: {payment.reference_no ?? "none"}</p>
                      {proofUrl ? <p><a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">Open proof</a></p> : null}
                      {payment.reject_reason ? <p className="text-red-300">Rejected: {payment.reject_reason}</p> : null}
                    </>
                  ) : "No payment submitted"}
                </td>
                <td className="px-4 py-3">
                  {payment?.status === "pending" ? (
                    <div className="space-y-2">
                      <form action={verifyDues}>
                        <input type="hidden" name="id" value={payment.id} />
                        <Button type="submit" size="sm">Verify</Button>
                      </form>
                      <form action={rejectDues} className="flex gap-2">
                        <input type="hidden" name="id" value={payment.id} />
                        <label className="sr-only" htmlFor={`why-${payment.id}`}>Reason for rejecting {member.full_name}</label>
                        <Input id={`why-${payment.id}`} name="reject_reason" placeholder="Reason (optional)" className="w-40" />
                        <Button type="submit" size="sm" variant="danger">Reject</Button>
                      </form>
                    </div>
                  ) : payment?.status === "paid" ? (
                    <span className="text-xs text-muted">Verified {payment.verified_at ? formatDate(payment.verified_at) : ""}</span>
                  ) : (
                    <form action={recordCashDues}>
                      <input type="hidden" name="period_id" value={period.id} />
                      <input type="hidden" name="profile_id" value={member.id} />
                      <Button type="submit" size="sm" variant="outline">Record cash payment</Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={deletePeriod}>
        <input type="hidden" name="id" value={period.id} />
        <Button type="submit" variant="danger" size="sm">Delete period (and its payments)</Button>
      </form>
    </div>
  );
}
