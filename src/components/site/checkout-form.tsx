"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { useCart } from "@/components/site/cart";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ConsentField, FormFeedback, Honeypot, SubmitButton, TurnstileWidget, type FormStateLike } from "@/components/ui/form-bits";
import { EmptyState } from "@/components/ui/states";
import { formatPHP } from "@/lib/format";
import { placeOrder } from "@/server/shop-actions";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;

export function CheckoutForm() {
  const cart = useCart();
  const [state, action] = useActionState(placeOrder, initial);
  const v = state.values ?? {};
  const cartJson = useMemo(() => JSON.stringify(cart.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }))), [cart.items]);

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
    <form action={action} noValidate className="relative grid gap-8 lg:grid-cols-[1fr_340px]" aria-label="Checkout">
      <Honeypot />
      <input type="hidden" name="cart" value={cartJson} />

      <div className="space-y-5">
        <h2 className="text-2xl font-semibold uppercase text-gold">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="customer_name" error={state.fieldErrors?.customer_name} required className="sm:col-span-2">
            <Input id="customer_name" name="customer_name" autoComplete="name" defaultValue={v.customer_name} required {...inv(state, "customer_name")} />
          </Field>
          <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} required hint="We email your order link here">
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} required {...inv(state, "email")} />
          </Field>
          <Field label="Mobile number" htmlFor="phone" error={state.fieldErrors?.phone} required>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} required {...inv(state, "phone")} />
          </Field>
        </div>

        <h2 className="pt-2 text-2xl font-semibold uppercase text-gold">Delivery address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street address, barangay" htmlFor="address_line" error={state.fieldErrors?.address_line} required className="sm:col-span-2">
            <Input id="address_line" name="address_line" autoComplete="address-line1" defaultValue={v.address_line} required {...inv(state, "address_line")} />
          </Field>
          <Field label="City / municipality" htmlFor="city" error={state.fieldErrors?.city} required>
            <Input id="city" name="city" autoComplete="address-level2" defaultValue={v.city} required {...inv(state, "city")} />
          </Field>
          <Field label="Province" htmlFor="province" error={state.fieldErrors?.province} required>
            <Input id="province" name="province" autoComplete="address-level1" defaultValue={v.province} required {...inv(state, "province")} />
          </Field>
          <Field label="Postal code" htmlFor="postal_code">
            <Input id="postal_code" name="postal_code" autoComplete="postal-code" defaultValue={v.postal_code} />
          </Field>
        </div>
        <Field label="Order notes" htmlFor="notes" hint="Optional">
          <Textarea id="notes" name="notes" rows={2} defaultValue={v.notes} />
        </Field>

        <h2 className="pt-2 text-2xl font-semibold uppercase text-gold">Payment</h2>
        <p className="text-sm text-muted">Pay using the instructions shown, then enter your reference number. You can also add it later from your order page. An officer verifies every payment.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment reference number" htmlFor="payment_reference" hint="From your GCash / bank receipt">
            <Input id="payment_reference" name="payment_reference" defaultValue={v.payment_reference} />
          </Field>
          <Field label="Proof of payment" htmlFor="proof" hint="JPG, PNG, WebP or PDF, up to 5 MB">
            <input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel-raised file:px-4 file:text-sm file:font-medium file:text-white" />
          </Field>
        </div>
        <ConsentField error={state.fieldErrors?.consent} />
        <TurnstileWidget />
      </div>

      <aside aria-label="Order summary" className="h-fit space-y-4 rounded-lg border border-line bg-panel p-5 lg:sticky lg:top-24">
        <h2 className="text-xl font-semibold uppercase text-gold">Order summary</h2>
        <ul className="divide-y divide-line text-sm">
          {cart.items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-3 py-2">
              <span>
                {i.quantity} x {i.name} <span className="text-muted">({i.label})</span>
              </span>
              <span>{formatPHP(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <Field label="Discount code" htmlFor="discount_code" error={state.fieldErrors?.discount_code}>
          <Input id="discount_code" name="discount_code" defaultValue={v.discount_code} autoCapitalize="characters" {...inv(state, "discount_code")} />
        </Field>
        <dl className="flex justify-between text-lg">
          <dt>Subtotal</dt>
          <dd className="font-semibold">{formatPHP(cart.subtotal)}</dd>
        </dl>
        <p className="text-xs text-muted">Final total (with any discount) is confirmed when you place the order. Delivery fees, if any, are arranged by an officer.</p>
        <FormFeedback state={state} />
        <SubmitButton size="lg" block pendingText="Placing order…">
          Place order
        </SubmitButton>
      </aside>
    </form>
  );
}
