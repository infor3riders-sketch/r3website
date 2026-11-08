"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/states";
import { EDIT_BIKE_ROWS, EDIT_REF_ROWS } from "@/lib/validators/application-edit";
import { updateApplication, type ReviewState } from "@/server/review-actions";

const initial: ReviewState = {};

/** Current application values, flattened to the form's field names (bike_0_make, ref_1_name, ...). */
export type ApplicationEditValues = Record<string, string>;

/** Officer edit form for an open application. Blank motorcycle/reference rows are ignored on save. */
export function ApplicationEditForm({ id, values, types }: { id: string; values: ApplicationEditValues; types: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateApplication, initial);
  const v = (k: string) => state.values?.[k] ?? values[k] ?? "";
  const err = (k: string) => state.fieldErrors?.[k];
  const inv = (k: string) => ({ "aria-invalid": Boolean(err(k)), "aria-describedby": err(k) ? `${k}-msg` : undefined }) as const;

  const text = (name: string, label: string, opts: { required?: boolean; type?: string; className?: string; inputMode?: "numeric" | "tel" | "email" } = {}) => (
    <Field label={label} htmlFor={name} error={err(name)} required={opts.required} className={opts.className}>
      <Input id={name} name={name} type={opts.type ?? "text"} inputMode={opts.inputMode} defaultValue={v(name)} {...inv(name)} />
    </Field>
  );

  return (
    <form action={action} noValidate className="space-y-6">
      <input type="hidden" name="id" value={id} />

      <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-gold">Applicant</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("full_name", "Full name", { required: true })}
          {text("road_name", "Road name")}
          {text("email", "Email", { required: true, type: "email", inputMode: "email" })}
          {text("phone", "Mobile", { required: true, type: "tel", inputMode: "tel" })}
          {text("birthdate", "Birthdate", { type: "date" })}
          <Field label="Membership type" htmlFor="membership_type_id" error={err("membership_type_id")}>
            <Select id="membership_type_id" name="membership_type_id" defaultValue={v("membership_type_id")}>
              <option value="">Not specified</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
          {text("address", "Address", { className: "sm:col-span-2" })}
        </div>
        <p className="text-xs text-muted">The email is where the portal invitation goes when you approve, so make sure it is correct.</p>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-gold">Riding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("riding_years", "Years riding", { inputMode: "numeric" })}
          {text("license_number", "License no.")}
          <Field label="Experience" htmlFor="riding_experience" error={err("riding_experience")} className="sm:col-span-2">
            <Textarea id="riding_experience" name="riding_experience" rows={4} defaultValue={v("riding_experience")} {...inv("riding_experience")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-gold">Motorcycles</h2>
          <p className="text-xs text-muted">Clear every box in a row to remove that motorcycle.</p>
        </div>
        {Array.from({ length: EDIT_BIKE_ROWS }, (_, n) => (
          <fieldset key={n} className="grid gap-3 border-t border-line pt-4 first-of-type:border-0 first-of-type:pt-0 sm:grid-cols-6">
            <legend className="sr-only">Motorcycle {n + 1}</legend>
            {text(`bike_${n}_make`, "Make", { className: "sm:col-span-2" })}
            {text(`bike_${n}_model`, "Model", { className: "sm:col-span-2" })}
            {text(`bike_${n}_year`, "Year", { inputMode: "numeric" })}
            {text(`bike_${n}_displacement_cc`, "cc", { inputMode: "numeric" })}
            {text(`bike_${n}_color`, "Color", { className: "sm:col-span-3" })}
            {text(`bike_${n}_plate_number`, "Plate no.", { className: "sm:col-span-3" })}
          </fieldset>
        ))}
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-gold">References</h2>
          <p className="text-xs text-muted">Clear every box in a row to remove that reference.</p>
        </div>
        {Array.from({ length: EDIT_REF_ROWS }, (_, n) => (
          <fieldset key={n} className="grid gap-3 border-t border-line pt-4 first-of-type:border-0 first-of-type:pt-0 sm:grid-cols-3">
            <legend className="sr-only">Reference {n + 1}</legend>
            {text(`ref_${n}_name`, "Name")}
            {text(`ref_${n}_phone`, "Phone", { type: "tel", inputMode: "tel" })}
            {text(`ref_${n}_relationship`, "Relationship")}
          </fieldset>
        ))}
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 space-y-3 border-t border-line bg-black/90 px-1 py-3 backdrop-blur">
        {state.error ? <Notice tone="error">{state.error}</Notice> : null}
        {state.ok ? <Notice tone="success">{state.message} You can keep editing or go back to the review.</Notice> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="gold" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          <Link href={`/applications/${id}`} className="text-sm text-gold hover:text-gold-hover">Back to review</Link>
        </div>
      </div>
    </form>
  );
}
