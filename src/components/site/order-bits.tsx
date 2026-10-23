"use client";

import { useActionState, useEffect } from "react";
import { useCart } from "@/components/site/cart";
import { Field, Input } from "@/components/ui/field";
import { FormFeedback, Honeypot, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import { submitPaymentProof } from "@/server/shop-actions";

/** Empties the cart once after an order has just been placed. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}

const initial: FormStateLike = {};

export function ProofForm({ orderNo, token, current }: { orderNo: string; token: string; current: string | null }) {
  const [state, action] = useActionState(submitPaymentProof, initial);
  if (state.ok) return <FormFeedback state={state} />;
  return (
    <form action={action} className="relative space-y-4">
      <Honeypot />
      <input type="hidden" name="order_no" value={orderNo} />
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payment reference number" htmlFor="payment_reference">
          <Input id="payment_reference" name="payment_reference" defaultValue={current ?? ""} />
        </Field>
        <Field label="Proof of payment" htmlFor="proof" hint="JPG, PNG, WebP or PDF, up to 5 MB">
          <input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel-raised file:px-4 file:text-sm file:font-medium file:text-white" />
        </Field>
      </div>
      <FormFeedback state={state} />
      <SubmitButton variant="blue" pendingText="Uploading…">
        Send payment details
      </SubmitButton>
    </form>
  );
}
