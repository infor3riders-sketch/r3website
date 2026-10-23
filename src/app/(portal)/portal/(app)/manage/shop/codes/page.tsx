import { DiscountForm } from "@/components/portal/shop-forms";
import { ShopTabs } from "@/components/portal/shop-tabs";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatPHP } from "@/lib/format";
import { deleteDiscountCode, toggleDiscountCode } from "@/server/shop-admin-actions";
import { listDiscountCodes } from "@/server/queries/shop-admin";

export const metadata = { title: "Discount codes" };

export default async function DiscountCodesPage() {
  const codes = await listDiscountCodes();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Shop</h1>
        <p className="text-sm text-muted">Discount codes customers can enter at checkout. Uses are counted when an order is marked paid.</p>
      </header>
      <ShopTabs active="codes" />

      <section aria-labelledby="new-h" className="space-y-3 rounded-lg border border-line bg-panel p-5">
        <h2 id="new-h" className="text-xl font-semibold uppercase text-gold">New code</h2>
        <DiscountForm />
      </section>

      {codes.length === 0 ? (
        <EmptyState title="No discount codes yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Code</th>
                <th scope="col" className="px-4 py-3">Discount</th>
                <th scope="col" className="px-4 py-3">Used</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3">{c.kind === "percent" ? `${Number(c.value)}%` : formatPHP(Number(c.value))}{Number(c.min_subtotal) > 0 ? <span className="ml-2 text-xs text-muted">min {formatPHP(Number(c.min_subtotal))}</span> : null}</td>
                  <td className="px-4 py-3 text-muted">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.is_active ? "approved" : "cancelled"} className="capitalize" /> <span className="ml-1 text-xs text-muted">{c.is_active ? "Active" : "Off"}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <form action={toggleDiscountCode}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(c.is_active)} />
                        <Button type="submit" variant="ghost" size="sm">{c.is_active ? "Turn off" : "Turn on"}</Button>
                      </form>
                      <form action={deleteDiscountCode}>
                        <input type="hidden" name="id" value={c.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-red-300">Delete</Button>
                      </form>
                    </div>
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
