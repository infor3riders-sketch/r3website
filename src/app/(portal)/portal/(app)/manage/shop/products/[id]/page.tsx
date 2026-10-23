import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ImageUploadForm, ProductForm, VariantForm } from "@/components/portal/shop-forms";
import { Button } from "@/components/ui/button";
import { publicMediaUrl } from "@/lib/supabase/public";
import { deleteProduct, deleteProductImage, deleteVariant } from "@/server/shop-admin-actions";
import { getProductAdmin } from "@/server/queries/shop-admin";

export const metadata = { title: "Edit product" };

export default async function ProductAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const found = await getProductAdmin(id);
  if (!found) notFound();
  const { product, variants, images } = found;

  return (
    <div className="max-w-4xl space-y-8">
      <Link href="/manage/shop/products" className="text-sm text-gold hover:text-gold-hover">&larr; All products</Link>
      <h1 className="text-3xl font-semibold uppercase">{product.name}</h1>

      <section aria-labelledby="details-h" className="space-y-3">
        <h2 id="details-h" className="text-2xl font-semibold uppercase text-gold">Details</h2>
        <div className="rounded-lg border border-line bg-panel p-5"><ProductForm product={product} /></div>
      </section>

      <section aria-labelledby="variants-h" className="space-y-3">
        <h2 id="variants-h" className="text-2xl font-semibold uppercase text-gold">Variants &amp; stock</h2>
        {variants.map((v) => (
          <div key={v.id} className="space-y-2 rounded-lg border border-line bg-panel p-4">
            <VariantForm productId={product.id} variant={v} />
            <form action={deleteVariant}>
              <input type="hidden" name="id" value={v.id} />
              <input type="hidden" name="product_id" value={product.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-red-300">Delete variant</Button>
            </form>
          </div>
        ))}
        <div className="rounded-lg border border-dashed border-line p-4">
          <h3 className="mb-3 font-semibold">Add a variant</h3>
          <VariantForm productId={product.id} />
        </div>
      </section>

      <section aria-labelledby="images-h" className="space-y-3">
        <h2 id="images-h" className="text-2xl font-semibold uppercase text-gold">Photos</h2>
        {images.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {images.map((img) => {
              const url = publicMediaUrl(img.path);
              return (
                <li key={img.id} className="space-y-2 rounded-lg border border-line bg-panel p-2">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-ink">{url ? <Image src={url} alt={img.alt ?? ""} fill sizes="200px" className="object-cover" /> : null}</div>
                  <form action={deleteProductImage}>
                    <input type="hidden" name="id" value={img.id} />
                    <input type="hidden" name="product_id" value={product.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-red-300">Remove</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="rounded-lg border border-line bg-panel p-4"><ImageUploadForm productId={product.id} /></div>
      </section>

      <form action={deleteProduct}>
        <input type="hidden" name="id" value={product.id} />
        <Button type="submit" variant="danger" size="sm">Delete product</Button>
      </form>
    </div>
  );
}
