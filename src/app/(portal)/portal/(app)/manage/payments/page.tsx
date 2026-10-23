import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { donationReference } from "@/lib/donations";
import { formatDateTime, formatPHP } from "@/lib/format";
import { getPendingPayments } from "@/server/queries/dues";

export const metadata = { title: "Payments to verify" };

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-xl font-semibold uppercase text-gold">
        {title} <span className="rounded bg-white/10 px-2 text-sm text-white">{count}</span>
      </h2>
      {count === 0 ? <p className="text-sm text-muted">Nothing waiting.</p> : <ul className="divide-y divide-line rounded-lg border border-line bg-panel">{children}</ul>}
    </section>
  );
}

const hasDetails = (ref: string | null, proof: string | null) => (proof ? "proof uploaded" : ref ? `ref ${ref}` : "no details yet");

export default async function PaymentsQueuePage() {
  const { orders, donations, dues } = await getPendingPayments();
  const total = orders.length + donations.length + dues.length;
  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Payments to verify</h1>
        <p className="text-sm text-muted">One queue for shop orders, donations and member dues. Check the money arrived before verifying.</p>
      </header>
      {total === 0 ? <EmptyState title="All caught up" >No payments are waiting for verification.</EmptyState> : null}

      <Group title="Shop orders" count={orders.length}>
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div><Link href={`/manage/shop/orders/${o.id}`} className="font-mono font-medium hover:text-gold">{o.order_no}</Link><p className="text-xs text-muted">{o.customer_name} · {formatDateTime(o.created_at)}</p></div>
            <p className="text-sm">{formatPHP(Number(o.total))} <span className="ml-2 text-xs text-muted">{hasDetails(o.payment_reference, o.payment_proof_path)}</span></p>
          </li>
        ))}
      </Group>

      <Group title="Donations" count={donations.length}>
        {donations.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div><Link href={`/manage/donations/${d.id}`} className="font-medium hover:text-gold">{d.donor_name}</Link><p className="text-xs text-muted">{donationReference(d.id)} · {formatDateTime(d.created_at)}</p></div>
            <p className="text-sm">{formatPHP(Number(d.amount))} <span className="ml-2 text-xs text-muted">{hasDetails(d.payment_reference, d.payment_proof_path)}</span></p>
          </li>
        ))}
      </Group>

      <Group title="Member dues" count={dues.length}>
        {dues.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div><Link href={`/manage/dues/${d.period_id}`} className="font-medium hover:text-gold">{d.member}</Link><p className="text-xs text-muted">{d.period} · {formatDateTime(d.created_at)}</p></div>
            <p className="text-sm">{formatPHP(Number(d.amount))} <span className="ml-2 text-xs text-muted">{hasDetails(d.reference_no, d.proof_path)}</span></p>
          </li>
        ))}
      </Group>
    </div>
  );
}
