import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Circle, XCircle } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { ClearCart, ProofForm } from "@/components/site/order-bits";
import { PaymentInstructions } from "@/components/site/payment-instructions";
import { Notice } from "@/components/ui/states";
import { formatDateTime, formatPHP } from "@/lib/format";
import { configuredProviderName } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { getPaymentInstructions, lookupOrder } from "@/server/queries/orders";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const STEPS = [
  ["pending_payment", "Awaiting payment"],
  ["paid", "Payment verified"],
  ["processing", "Preparing"],
  ["shipped", "Shipped"],
  ["completed", "Completed"],
] as const;

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ t?: string; new?: string }> }) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const found = await lookupOrder(orderNo, sp.t);
  if (!found) notFound();
  const { order, items } = found;

  const dead = order.status === "cancelled" || order.status === "expired";
  const stepIndex = STEPS.findIndex(([s]) => s === order.status);
  const awaiting = order.status === "pending_payment";
  const instructions = awaiting && configuredProviderName() === "manual" ? await getPaymentInstructions() : null;

  return (
    <>
      {sp.new ? <ClearCart /> : null}
      <PageHero eyebrow="Order" title={order.order_no} subtitle={`Placed ${formatDateTime(order.created_at)}`} />
      <Section id="order" className="max-w-4xl space-y-8">
        {sp.new ? <Notice tone="success">Thank you! Your order is placed. Save this page: it is your order link (we also emailed it to {order.email}).</Notice> : null}

        <ol aria-label="Order progress" className="grid gap-2 sm:grid-cols-5">
          {dead ? (
            <li className="flex items-center gap-2 rounded-lg border border-red-400/50 bg-red-500/10 p-3 text-red-100 sm:col-span-5">
              <XCircle aria-hidden className="h-5 w-5" /> This order was {order.status}. Reserved items have been released.
            </li>
          ) : (
            STEPS.map(([s, label], i) => {
              const done = i <= stepIndex;
              return (
                <li key={s} aria-current={i === stepIndex ? "step" : undefined} className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", done ? "border-gold/60 bg-gold/10 text-white" : "border-line text-muted")}>
                  {done ? <Check aria-hidden className="h-4 w-4 text-gold" /> : <Circle aria-hidden className="h-4 w-4" />} {label}
                </li>
              );
            })
          )}
        </ol>
        {order.tracking_note ? <Notice tone="info">{order.tracking_note}</Notice> : null}

        <section aria-labelledby="items-h" className="rounded-lg border border-line bg-panel p-5">
          <h2 id="items-h" className="mb-3 text-xl font-semibold uppercase text-gold">Items</h2>
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span>{i.quantity} x {i.name_snapshot}</span>
                <span>{formatPHP(Number(i.unit_price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPHP(Number(order.subtotal))}</dd></div>
            {Number(order.discount_total) > 0 ? <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{formatPHP(Number(order.discount_total))}</dd></div> : null}
            <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd className="text-gold">{formatPHP(Number(order.total))}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-muted">
            Deliver to {order.customer_name}, {order.address_line}, {order.city}, {order.province}
            {order.postal_code ? ` ${order.postal_code}` : ""}
          </p>
        </section>

        {awaiting ? (
          <div className="space-y-6">
            {instructions ? <PaymentInstructions instructions={instructions} reference={order.order_no} /> : null}
            <section aria-labelledby="proof-h" className="rounded-lg border border-line bg-panel p-5">
              <h2 id="proof-h" className="mb-1 text-xl font-semibold uppercase text-gold">Already paid?</h2>
              <p className="mb-4 text-sm text-muted">
                {order.payment_proof_path || order.payment_reference ? "We have your payment details and will verify them shortly. You can update them below." : "Send your reference number or a screenshot so an officer can verify your payment."}
                {" "}Unpaid orders are released on {formatDateTime(order.expires_at)}.
              </p>
              <ProofForm orderNo={order.order_no} token={sp.t ?? ""} current={order.payment_reference} />
            </section>
          </div>
        ) : null}
      </Section>
    </>
  );
}
