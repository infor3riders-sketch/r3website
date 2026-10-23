import Link from "next/link";
import { ShopTabs } from "@/components/portal/shop-tabs";
import { StatusBadge } from "@/components/portal/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { listProductsAdmin } from "@/server/queries/shop-admin";

export const metadata = { title: "Shop products" };

export default async function ProductsAdminPage() {
  const products = await listProductsAdmin();
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold uppercase">Shop</h1>
          <p className="text-sm text-muted">Products, variants and inventory.</p>
        </div>
        <Link href="/manage/shop/products/new" className={buttonVariants({ variant: "gold" })}>New product</Link>
      </header>
      <ShopTabs active="products" />
      {products.length === 0 ? (
        <EmptyState title="No products yet">Create your first product.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3">Variants</th>
                <th scope="col" className="px-4 py-3">Stock (reserved)</th>
                <th scope="col" className="px-4 py-3">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-3"><Link href={`/manage/shop/products/${p.id}`} className="font-medium hover:text-gold">{p.name}</Link></td>
                  <td className="px-4 py-3 text-muted">{p.variantCount}</td>
                  <td className="px-4 py-3 text-muted">{p.stock} ({p.reserved})</td>
                  <td className="px-4 py-3"><StatusBadge status={p.is_active ? "approved" : "pending"} className="capitalize" /> <span className="ml-1 text-xs text-muted">{p.is_active ? "Live" : "Hidden"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
