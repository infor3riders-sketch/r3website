"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ConsentField, FormFeedback, Honeypot, SubmitButton, TurnstileWidget, type FormStateLike } from "@/components/ui/form-bits";
import { formatPHP } from "@/lib/format";
import { PRESET_AMOUNTS } from "@/lib/validators/donations";
import { placeDonation } from "@/server/donation-actions";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;

export function DonationForm({ campaigns, defaultCampaignId }: { campaigns: { id: string; title: string }[]; defaultCampaignId?: string }) {
  const [state, action] = useActionState(placeDonation, initial);
  const v = state.values ?? {};
  const [amount, setAmount] = useState<string>(v.amount ?? "500");

  return (
    <form action={action} noValidate className="relative space-y-6" aria-label="Donate">
      <Honeypot />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-white">Choose an amount</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESET_AMOUNTS.map((a) => (
            <label key={a} className="has-[:checked]:border-gold has-[:checked]:bg-gold/10 flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-line font-display text-lg has-[:checked]:text-gold">
              <input type="radio" name="amount" value={String(a)} checked={amount === String(a)} onChange={() => setAmount(String(a))} className="sr-only" />
              {formatPHP(a, { whole: true })}
            </label>
          ))}
          <label className="has-[:checked]:border-gold has-[:checked]:bg-gold/10 flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-line font-display text-lg has-[:checked]:text-gold">
            <input type="radio" name="amount" value="custom" checked={amount === "custom"} onChange={() => setAmount("custom")} className="sr-only" />
            Other
          </label>
        </div>
        {amount === "custom" ? (
          <Field label="Amount (PHP)" htmlFor="custom_amount" error={state.fieldErrors?.custom_amount}>
            <Input id="custom_amount" name="custom_amount" inputMode="decimal" defaultValue={v.custom_amount} placeholder="e.g. 750" {...inv(state, "custom_amount")} />
          </Field>
        ) : null}
        {state.fieldErrors?.amount ? <p role="alert" className="text-sm text-red-300">{state.fieldErrors.amount}</p> : null}
      </fieldset>

      {campaigns.length > 0 ? (
        <Field label="Campaign" htmlFor="campaign_id" error={state.fieldErrors?.campaign_id}>
          <Select id="campaign_id" name="campaign_id" defaultValue={v.campaign_id ?? defaultCampaignId ?? ""}>
            <option value="">General fund</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="donor_name" error={state.fieldErrors?.donor_name} required>
          <Input id="donor_name" name="donor_name" autoComplete="name" defaultValue={v.donor_name} required {...inv(state, "donor_name")} />
        </Field>
        <Field label="Email" htmlFor="donor_email" error={state.fieldErrors?.donor_email} required hint="For your acknowledgement">
          <Input id="donor_email" name="donor_email" type="email" autoComplete="email" inputMode="email" defaultValue={v.donor_email} required {...inv(state, "donor_email")} />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="is_anonymous" className="h-5 w-5 accent-[#f2a81d]" /> Donate anonymously (your name will not be shown publicly)
      </label>
      <Field label="Message (optional)" htmlFor="message">
        <Textarea id="message" name="message" rows={2} defaultValue={v.message} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payment reference number" htmlFor="payment_reference" hint="From your GCash / bank receipt (optional now)">
          <Input id="payment_reference" name="payment_reference" defaultValue={v.payment_reference} />
        </Field>
        <Field label="Proof of payment" htmlFor="proof" hint="JPG, PNG, WebP or PDF, up to 5 MB">
          <input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel-raised file:px-4 file:text-sm file:font-medium file:text-white" />
        </Field>
      </div>

      <ConsentField error={state.fieldErrors?.consent} />
      <TurnstileWidget />
      <FormFeedback state={state} />
      <SubmitButton size="lg" block pendingText="Submitting…">
        Donate now
      </SubmitButton>
    </form>
  );
}
