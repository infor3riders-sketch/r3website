import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintButton } from "@/components/portal/print-button";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatPHP } from "@/lib/format";
import { ORG } from "@/lib/org";
import { DEFAULT_SETTINGS } from "@/lib/site-defaults";
import { getMyReceipt } from "@/server/queries/dues";

export const metadata = { title: "Dues receipt" };

/** Member dues receipt (an internal acknowledgement of membership dues, not a tax receipt). */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { userId } = await requireUser(`/dues/${id}/receipt`);
  const r = await getMyReceipt(id, userId);
  if (!r) notFound();
  const no = `DUES-${r.payment.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/dues" className="text-sm text-gold hover:text-gold-hover">&larr; Dues</Link>
        <PrintButton />
      </div>
      <article className="space-y-6 rounded-lg border border-line bg-panel p-8 print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="space-y-1 border-b border-line pb-4 text-center print:border-black">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-gold print:text-black">Membership dues receipt</p>
          <h1 className="text-2xl font-bold uppercase">{ORG.name}</h1>
          <p className="text-xs text-muted print:text-black">SEC Reg. No. {DEFAULT_SETTINGS.registration.sec_registration_no}</p>
        </header>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted print:text-black">Receipt no.</dt><dd className="font-mono font-semibold">{no}</dd></div>
          <div><dt className="text-muted print:text-black">Date verified</dt><dd>{r.payment.verified_at ? formatDate(r.payment.verified_at) : ""}</dd></div>
          <div><dt className="text-muted print:text-black">Received from</dt><dd>{r.profile.full_name ?? r.profile.email}{r.profile.road_name ? ` ("${r.profile.road_name}")` : ""}</dd></div>
          <div><dt className="text-muted print:text-black">Period</dt><dd>{r.period.label}</dd></div>
          <div><dt className="text-muted print:text-black">Reference</dt><dd>{r.payment.reference_no ?? "n/a"}</dd></div>
          <div><dt className="text-muted print:text-black">Amount</dt><dd className="text-xl font-bold text-gold print:text-black">{formatPHP(Number(r.payment.amount))}</dd></div>
        </dl>
        <p className="border-t border-line pt-4 text-xs text-muted print:border-black print:text-black">
          This is an acknowledgement of membership dues received. It is not an official receipt for tax purposes.
        </p>
      </article>
    </div>
  );
}
