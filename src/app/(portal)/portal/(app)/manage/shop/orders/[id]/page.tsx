import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { OrderStatusForm } from "@/components/portal/shop-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatPHP } from "@/lib/format";
import { cancelOrderAction, markOrderPaid } from "@/server/shop-admin-actions";
import { getOrderForOfficer } from "@/server/queries/shop-admin";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const found = await getOrderForOfficer(id);
  if (!found) notFound();
  const { order, items, proofUrl } = found;
  const awaiting = order.status === "pending_payment";

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/manage/shop" className="text-sm text-gold hover:text-gold-hover">&larr; All orders</Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-3xl font-semibold">{order.order_no}</h1>
          <p className="text-sm text-muted">Placed {formatDateTime(order.created_at)}{order.paid_at ? ` · paid ${formatDateTime(order.paid_at)}` : ""}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="mb-2 text-lg font-semibold uppercase text-gold">Customer</h2>
          <p className="text-white">{order.customer_name}</p>
          <p className="text-sm text-muted">{order.email} · {order.phone}</p>
          <p className="mt-2 text-sm text-white/90">{order.address_line}, {order.city}, {order.province} {order.postal_code ?? ""}</p>
          {order.notes ? <p className="mt-2 text-sm text-muted">Notes: {order.notes}</p> : null}
        </section>

        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="mb-2 text-lg font-semibold uppercase text-gold">Payment</h2>
          <p className="text-sm text-muted">Method: {order.payment_method}</p>
          <p className="text-sm text-white">Reference: {order.payment_reference ?? <span className="text-muted">none given</span>}</p>
          {proofUrl ? (
            <p className="mt-2 text-sm">
              <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">Open proof of payment</a> <span className="text-xs text-muted">(link expires in 10 minutes)</span>
            </p>
          ) : <p className="mt-2 text-sm text-muted">No proof uploaded.</p>}
          {awaiting ? <p className="mt-2 text-xs text-muted">Unpaid orders are released on {formatDateTime(order.expires_at)}.</p> : null}
        </section>
      </div>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="mb-2 text-lg font-semibold uppercase text-gold">Items</h2>
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2"><span>{i.quantity} x {i.name_snapshot}</span><span>{formatPHP(Number(i.unit_price) * i.quantity)}</span></li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPHP(Number(order.subtotal))}</dd></div>
          {Number(order.discount_total) > 0 ? <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{formatPHP(Number(order.discount_total))}</dd></div> : null}
          <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd className="text-gold">{formatPHP(Number(order.total))}</dd></div>
        </dl>
      </section>

      {awaiting ? (
        <section className="space-y-3 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold uppercase text-gold">Verify payment</h2>
          <p className="text-sm text-muted">Confirm the money arrived (check GCash / bank), then mark paid. This decrements stock and emails the customer.</p>
          <div className="flex flex-wrap gap-3">
            <form action={markOrderPaid}>
              <input type="hidden" name="id" value={order.id} />
              <Button type="submit" data-testid="mark-paid">Mark as paid</Button>
            </form>
            <form action={cancelOrderAction}>
              <input type="hidden" name="id" value={order.id} />
              <Button type="submit" variant="danger">Reject / cancel order</Button>
            </form>
          </div>
        </section>
      ) : (
        <section className="space-y-3 rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold uppercase text-gold">Fulfilment</h2>
          {order.tracking_note ? <p className="text-sm text-muted">Last note: {order.tracking_note}</p> : null}
          <OrderStatusForm id={order.id} current={order.status} />
          {["completed", "cancelled", "expired"].includes(order.status) ? <p className="text-sm text-muted">This order is closed.</p> : null}
        </section>
      )}
    </div>
  );
}
