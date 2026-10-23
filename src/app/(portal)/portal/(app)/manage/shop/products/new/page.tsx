import Link from "next/link";
import { ProductForm } from "@/components/portal/shop-forms";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/manage/shop/products" className="text-sm text-gold hover:text-gold-hover">&larr; All products</Link>
      <h1 className="text-3xl font-semibold uppercase">New product</h1>
      <div className="rounded-lg border border-line bg-panel p-5">
        <ProductForm />
      </div>
      <p className="text-sm text-muted">After creating the product you can add variants (sizes, colors, prices, stock) and photos.</p>
    </div>
  );
}
