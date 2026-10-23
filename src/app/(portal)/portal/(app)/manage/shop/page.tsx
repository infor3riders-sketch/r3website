import Link from "next/link";
import { ShopTabs } from "@/components/portal/shop-tabs";
import { StatusBadge } from "@/components/portal/status-badge";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime, formatPHP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ORDER_FILTERS, countOrdersByStatus, isOrderFilter, listOrders } from "@/server/queries/shop-admin";

export const metadata = { title: "Shop orders" };

const LABELS: Record<string, string> = { pending_payment: "Awaiting payment", paid: "Paid", processing: "Processing", shipped: "Shipped", completed: "Completed", cancelled: "Cancelled", all: "All" };

export default async function ShopOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = isOrderFilter(sp.status) ? sp.status : "pending_payment";
  const [orders, counts] = await Promise.all([listOrders(status), countOrdersByStatus()]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Shop</h1>
        <p className="text-sm text-muted">Verify payments, fulfil orders and manage the catalogue.</p>
      </header>
      <ShopTabs active="orders" />

      <nav aria-label="Filter orders" className="flex flex-wrap gap-2">
        {ORDER_FILTERS.map((s) => (
          <Link key={s} href={`/manage/shop?status=${s}`} aria-current={s === status ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm", s === status ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10")}>
            {LABELS[s]}
            <span className="rounded bg-white/10 px-1.5 text-xs">{s === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[s] ?? 0)}</span>
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState title="No orders here" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Order</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">Total</th>
                <th scope="col" className="px-4 py-3">Payment</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/manage/shop/orders/${o.id}`} className="font-mono font-medium text-white hover:text-gold">{o.order_no}</Link>
                    <div className="text-xs text-muted">{formatDateTime(o.created_at)}</div>
                  </td>
                  <td className="px-4 py-3"><div>{o.customer_name}</div><div className="text-xs text-muted">{o.email}</div></td>
                  <td className="px-4 py-3">{formatPHP(Number(o.total))}</td>
                  <td className="px-4 py-3 text-xs text-muted">{o.payment_proof_path ? "Proof uploaded" : o.payment_reference ? `Ref ${o.payment_reference}` : "Nothing yet"}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
