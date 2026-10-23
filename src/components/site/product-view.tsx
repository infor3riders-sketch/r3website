"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/site/cart";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { formatPHP } from "@/lib/format";
import type { ShopProduct } from "@/server/queries/shop";
import { cn } from "@/lib/utils";

export function ProductView({ product }: { product: ShopProduct }) {
  const cart = useCart();
  const firstAvailable = product.variants.find((v) => v.available > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? "");
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const image = product.images[imgIdx];
  const soldOut = !variant || variant.available <= 0;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-panel">
          {image ? (
            <Image src={image.url} alt={image.alt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>
          )}
        </div>
        {product.images.length > 1 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Product photos">
            {product.images.map((img, i) => (
              <li key={img.url}>
                <button type="button" onClick={() => setImgIdx(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === imgIdx} className={cn("relative h-16 w-16 overflow-hidden rounded-md border", i === imgIdx ? "border-gold" : "border-line")}>
                  <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          {product.category ? <p className="text-sm uppercase tracking-wider text-gold">{product.category}</p> : null}
          <h1 className="text-4xl font-bold uppercase">{product.name}</h1>
          <p className="mt-2 font-display text-3xl text-gold">{variant ? formatPHP(variant.price) : formatPHP(product.minPrice)}</p>
        </div>
        {product.description ? <p className="whitespace-pre-line text-white/90">{product.description}</p> : null}

        {product.variants.length > 0 ? (
          <div className="space-y-4">
            <Field label="Size / option" htmlFor="variant">
              <Select id="variant" value={variantId} onChange={(e) => { setVariantId(e.target.value); setQty(1); }}>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.available <= 0}>
                    {v.label} {v.available <= 0 ? "(sold out)" : v.available <= 5 ? `(${v.available} left)` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity" htmlFor="qty">
              <input
                id="qty"
                type="number"
                min={1}
                max={Math.max(1, Math.min(variant?.available ?? 1, 20))}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, variant?.available ?? 1, 20)))}
                className="w-28 rounded-md border border-line bg-black/40 px-3 py-2.5 text-base text-white"
              />
            </Field>
            <Button
              size="lg"
              block
              disabled={soldOut}
              onClick={() => {
                if (!variant) return;
                cart.add({ variantId: variant.id, productSlug: product.slug, name: product.name, label: variant.label, unitPrice: variant.price, image: product.images[0]?.url ?? null, max: variant.available }, qty);
                setAdded(true);
              }}
            >
              <ShoppingCart aria-hidden className="h-5 w-5" /> {soldOut ? "Sold out" : "Add to cart"}
            </Button>
            <div aria-live="polite" className="min-h-6">
              {added ? (
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <Check aria-hidden className="h-4 w-4" /> Added.{" "}
                  <Link href="/shop/cart" className="text-gold underline">
                    View cart
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-muted">This item is not available right now.</p>
        )}
        <Link href="/shop" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          &larr; Continue shopping
        </Link>
      </div>
    </div>
  );
}
