"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/site/cart";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatPHP } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CartView() {
  const cart = useCart();
  if (cart.items.length === 0) {
    return (
      <EmptyState title="Your cart is empty">
        <Link href="/shop" className={buttonVariants({ className: "mt-3" })}>
          Browse the shop
        </Link>
      </EmptyState>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
        {cart.items.map((i) => (
          <li key={i.variantId} className="flex gap-4 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-ink">
              {i.image ? <Image src={i.image} alt="" fill sizes="80px" className="object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${i.productSlug}`} className="font-semibold hover:text-gold">
                {i.name}
              </Link>
              <p className="text-sm text-muted">{i.label}</p>
              <p className="text-sm text-gold">{formatPHP(i.unitPrice)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" aria-label={`Decrease quantity of ${i.name}`} onClick={() => cart.setQty(i.variantId, i.quantity - 1)} className="flex h-11 w-11 items-center justify-center rounded-md border border-line hover:bg-white/10">
                  <Minus aria-hidden className="h-4 w-4" />
                </button>
                <span aria-live="polite" className="w-8 text-center">{i.quantity}</span>
                <button type="button" aria-label={`Increase quantity of ${i.name}`} disabled={i.max > 0 && i.quantity >= i.max} onClick={() => cart.setQty(i.variantId, i.quantity + 1)} className={cn("flex h-11 w-11 items-center justify-center rounded-md border border-line hover:bg-white/10", "disabled:opacity-40")}>
                  <Plus aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Remove ${i.name}`} onClick={() => cart.remove(i.variantId)} className="ml-auto flex h-11 w-11 items-center justify-center rounded-md text-red-300 hover:bg-white/10">
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="font-semibold">{formatPHP(i.unitPrice * i.quantity)}</p>
          </li>
        ))}
      </ul>

      <aside aria-label="Order summary" className="h-fit space-y-4 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold uppercase text-gold">Summary</h2>
        <dl className="flex justify-between text-lg">
          <dt>Subtotal</dt>
          <dd className="font-semibold">{formatPHP(cart.subtotal)}</dd>
        </dl>
        <p className="text-xs text-muted">Discount codes are applied at checkout. Prices are confirmed again when you place the order.</p>
        <Link href="/shop/checkout" className={buttonVariants({ size: "lg", block: true })}>
          Checkout
        </Link>
      </aside>
    </div>
  );
}
