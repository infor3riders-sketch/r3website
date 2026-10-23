"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import { cn } from "@/lib/utils";
import type { Row } from "@/lib/supabase/types";
import { saveCampaign } from "@/server/donation-admin-actions";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;

export function CampaignForm({ campaign }: { campaign?: Row<"donation_campaigns"> }) {
  const [state, action] = useActionState(saveCampaign, initial);
  const v = state.values;
  const val = (k: keyof Row<"donation_campaigns">) => v?.[k] ?? (campaign?.[k] == null ? "" : String(campaign[k]));
  const chk = (k: "is_public" | "is_active") => (v ? v[k] === "on" : campaign ? campaign[k] : k === "is_active");
  return (
    <form action={action} noValidate className="space-y-4">
      {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" error={state.fieldErrors?.title} required>
          <Input id="title" name="title" defaultValue={val("title")} required {...inv(state, "title")} />
        </Field>
        <Field label="URL name" htmlFor="slug" error={state.fieldErrors?.slug} hint="Auto-generated from the title if empty">
          <Input id="slug" name="slug" defaultValue={val("slug")} {...inv(state, "slug")} />
        </Field>
        <Field label="Goal (PHP)" htmlFor="goal_amount" error={state.fieldErrors?.goal_amount} hint="Leave empty for no goal">
          <Input id="goal_amount" name="goal_amount" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={val("goal_amount")} {...inv(state, "goal_amount")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={5} defaultValue={val("description")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 text-sm">
          <input type="checkbox" name="is_public" defaultChecked={Boolean(chk("is_public"))} className="h-5 w-5 accent-[#f2a81d]" /> Show on the public website
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={Boolean(chk("is_active"))} className="h-5 w-5 accent-[#f2a81d]" /> Accepting donations
        </label>
      </div>
      <FormFeedback state={state} />
      <SubmitButton size="lg">{campaign ? "Save campaign" : "Create campaign"}</SubmitButton>
    </form>
  );
}

export function DonationTabs({ active }: { active: "donations" | "campaigns" }) {
  const tabs = [
    { id: "donations", href: "/manage/donations", label: "Donations" },
    { id: "campaigns", href: "/manage/donations/campaigns", label: "Campaigns" },
  ] as const;
  return (
    <nav aria-label="Donation management" className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined} className={cn("flex min-h-11 items-center rounded-md border px-4 text-sm font-medium", t.id === active ? "border-gold bg-gold/10 text-gold" : "border-line text-white/85 hover:bg-white/10")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
