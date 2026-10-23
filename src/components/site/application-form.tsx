"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Honeypot, TurnstileWidget } from "@/components/ui/form-bits";
import { Notice } from "@/components/ui/states";
import {
  STEP_FIELDS,
  STEP_TITLES,
  VOLUNTEER_INTERESTS,
  applicationSchema,
  type ApplicationInput,
} from "@/lib/validators/application";
import { submitApplication, type ApplicationResult } from "@/server/application-actions";

interface MembershipTypeOption {
  id: string;
  name: string;
}

const emptyMotorcycle = { make: "", model: "", year: "", displacement_cc: "", color: "", plate_number: "" };
const emptyReference = { name: "", phone: "", relationship: "" };

export function ApplicationForm({ types }: { types: MembershipTypeOption[] }) {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ApplicationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema) as never,
    mode: "onTouched",
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      birthdate: "",
      address: "",
      road_name: "",
      riding_years: "" as never,
      riding_experience: "",
      license_number: "",
      motorcycles: [emptyMotorcycle as never],
      references: [emptyReference, emptyReference],
      membership_type_id: "",
      volunteer_interests: [],
      agreed_rules: false as never,
      consent_privacy: false as never,
    },
  });
  const {
    register,
    control,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = form;
  const motorcycles = useFieldArray({ control, name: "motorcycles" });
  const err = (path: string): string | undefined => {
    const parts = path.split(".");
    let cur: unknown = errors;
    for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
    return (cur as { message?: string } | undefined)?.message;
  };
  const inv = (path: string) => ({ "aria-invalid": Boolean(err(path)), "aria-describedby": err(path) ? `${path}-msg` : undefined }) as const;

  async function next() {
    const ok = await trigger(STEP_FIELDS[step] as FieldPath<ApplicationInput>[], { shouldFocus: true });
    if (ok) {
      setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function onSubmit() {
    if (step < STEP_TITLES.length - 1) return void next();
    startTransition(async () => {
      const ok = await trigger();
      if (!ok) return;
      const token = (formRef.current?.elements.namedItem("cf-turnstile-response") as HTMLInputElement | null)?.value;
      const website = (formRef.current?.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
      const res = await submitApplication({ ...getValues(), website, turnstileToken: token });
      if (res.fieldErrors) {
        for (const [k, message] of Object.entries(res.fieldErrors)) setError(k as FieldPath<ApplicationInput>, { message });
        const first = STEP_FIELDS.findIndex((fields) => fields.some((f) => f in (res.fieldErrors ?? {})));
        if (first >= 0) setStep(first);
      }
      setResult(res);
    });
  }

  if (result?.ok) {
    return (
      <div className="space-y-4 text-center" role="status">
        <Check aria-hidden className="mx-auto h-12 w-12 text-gold" />
        <h3 className="text-2xl font-semibold uppercase">Application submitted</h3>
        <p className="text-muted">{result.message} We emailed a confirmation. An officer will be in touch.</p>
        {result.reference ? (
          <p className="text-sm text-muted">
            Your reference: <span className="font-mono text-white">{result.reference}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="relative space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      aria-label="Membership application"
    >
      <Honeypot />

      <ol className="flex flex-wrap gap-2" aria-label="Progress">
        {STEP_TITLES.map((t, i) => (
          <li
            key={t}
            aria-current={i === step ? "step" : undefined}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              i === step ? "border-gold bg-gold/10 text-gold" : i < step ? "border-line text-white" : "border-line text-muted"
            }`}
          >
            <span className="font-display">{i < step ? <Check aria-hidden className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className="hidden sm:inline">{t}</span>
          </li>
        ))}
      </ol>
      <h3 className="text-2xl font-semibold uppercase">
        Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
      </h3>

      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name" error={err("full_name")} required className="sm:col-span-2">
            <Input id="full_name" autoComplete="name" {...register("full_name")} {...inv("full_name")} />
          </Field>
          <Field label="Email" htmlFor="email" error={err("email")} required>
            <Input id="email" type="email" autoComplete="email" inputMode="email" {...register("email")} {...inv("email")} />
          </Field>
          <Field label="Mobile number" htmlFor="phone" error={err("phone")} required>
            <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} {...inv("phone")} />
          </Field>
          <Field label="Birthdate" htmlFor="birthdate" error={err("birthdate")} required>
            <Input id="birthdate" type="date" autoComplete="bday" {...register("birthdate")} {...inv("birthdate")} />
          </Field>
          <Field label="Road name / nickname" htmlFor="road_name" error={err("road_name")} hint="Optional">
            <Input id="road_name" {...register("road_name")} {...inv("road_name")} />
          </Field>
          <Field label="Home address" htmlFor="address" error={err("address")} required className="sm:col-span-2">
            <Textarea id="address" rows={2} autoComplete="street-address" {...register("address")} {...inv("address")} />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4">
          <Field label="Years of riding" htmlFor="riding_years" error={err("riding_years")} required>
            <Input id="riding_years" type="number" min={0} inputMode="numeric" className="sm:max-w-40" {...register("riding_years")} {...inv("riding_years")} />
          </Field>
          <Field label="Tell us about your riding experience" htmlFor="riding_experience" error={err("riding_experience")} required>
            <Textarea id="riding_experience" rows={5} {...register("riding_experience")} {...inv("riding_experience")} />
          </Field>
          <Field label="Driver's license number" htmlFor="license_number" error={err("license_number")} required>
            <Input id="license_number" autoComplete="off" {...register("license_number")} {...inv("license_number")} />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          {motorcycles.fields.map((f, i) => (
            <fieldset key={f.id} className="space-y-4 rounded-lg border border-line p-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-gold">Motorcycle {i + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Make" htmlFor={`motorcycles.${i}.make`} error={err(`motorcycles.${i}.make`)} required>
                  <Input id={`motorcycles.${i}.make`} {...register(`motorcycles.${i}.make`)} {...inv(`motorcycles.${i}.make`)} />
                </Field>
                <Field label="Model" htmlFor={`motorcycles.${i}.model`} error={err(`motorcycles.${i}.model`)} required>
                  <Input id={`motorcycles.${i}.model`} {...register(`motorcycles.${i}.model`)} {...inv(`motorcycles.${i}.model`)} />
                </Field>
                <Field label="Year" htmlFor={`motorcycles.${i}.year`} error={err(`motorcycles.${i}.year`)} required>
                  <Input id={`motorcycles.${i}.year`} type="number" inputMode="numeric" {...register(`motorcycles.${i}.year`)} {...inv(`motorcycles.${i}.year`)} />
                </Field>
                <Field label="Engine size (cc)" htmlFor={`motorcycles.${i}.displacement_cc`} error={err(`motorcycles.${i}.displacement_cc`)}>
                  <Input id={`motorcycles.${i}.displacement_cc`} type="number" inputMode="numeric" {...register(`motorcycles.${i}.displacement_cc`)} {...inv(`motorcycles.${i}.displacement_cc`)} />
                </Field>
                <Field label="Color" htmlFor={`motorcycles.${i}.color`}>
                  <Input id={`motorcycles.${i}.color`} {...register(`motorcycles.${i}.color`)} />
                </Field>
                <Field label="Plate number" htmlFor={`motorcycles.${i}.plate_number`}>
                  <Input id={`motorcycles.${i}.plate_number`} {...register(`motorcycles.${i}.plate_number`)} />
                </Field>
              </div>
              {motorcycles.fields.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => motorcycles.remove(i)}>
                  <Trash2 aria-hidden className="h-4 w-4" /> Remove
                </Button>
              ) : null}
            </fieldset>
          ))}
          {errors.motorcycles?.root?.message ? <p role="alert" className="text-sm text-red-300">{errors.motorcycles.root.message}</p> : null}
          {motorcycles.fields.length < 5 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => motorcycles.append(emptyMotorcycle as never)}>
              <Plus aria-hidden className="h-4 w-4" /> Add another motorcycle
            </Button>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <p className="text-muted">Two people who know you and can speak to your character. We may contact them.</p>
          {[0, 1].map((i) => (
            <fieldset key={i} className="space-y-4 rounded-lg border border-line p-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-gold">Reference {i + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Name" htmlFor={`references.${i}.name`} error={err(`references.${i}.name`)} required>
                  <Input id={`references.${i}.name`} {...register(`references.${i}.name`)} {...inv(`references.${i}.name`)} />
                </Field>
                <Field label="Mobile number" htmlFor={`references.${i}.phone`} error={err(`references.${i}.phone`)} required>
                  <Input id={`references.${i}.phone`} type="tel" {...register(`references.${i}.phone`)} {...inv(`references.${i}.phone`)} />
                </Field>
                <Field label="Relationship" htmlFor={`references.${i}.relationship`} error={err(`references.${i}.relationship`)} required>
                  <Input id={`references.${i}.relationship`} {...register(`references.${i}.relationship`)} {...inv(`references.${i}.relationship`)} />
                </Field>
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-5">
          {types.length > 0 ? (
            <Field label="Membership type" htmlFor="membership_type_id" error={err("membership_type_id")}>
              <Select id="membership_type_id" {...register("membership_type_id")}>
                <option value="">Not sure yet</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-white">Volunteer interests (optional)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {VOLUNTEER_INTERESTS.map((v) => (
                <label key={v} className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 text-sm">
                  <input type="checkbox" value={v} className="h-5 w-5 accent-[#f2a81d]" {...register("volunteer_interests")} />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            <label className="flex items-start gap-3 text-sm text-white/90">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#f2a81d]" {...register("agreed_rules")} {...inv("agreed_rules")} />
              <span>
                I have read and agree to follow the club&apos;s{" "}
                <Link href="/about#conduct-h" target="_blank" className="text-gold underline">
                  Code of Conduct
                </Link>{" "}
                and rules.
              </span>
            </label>
            {err("agreed_rules") ? <p role="alert" className="text-sm text-red-300">{err("agreed_rules")}</p> : null}

            <label className="flex items-start gap-3 text-sm text-white/90">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#f2a81d]" {...register("consent_privacy")} {...inv("consent_privacy")} />
              <span>
                I consent to the collection and use of my personal information as described in the{" "}
                <Link href="/legal/privacy" target="_blank" className="text-gold underline">
                  Privacy Policy
                </Link>
                , in line with the Data Privacy Act of 2012.
              </span>
            </label>
            {err("consent_privacy") ? <p role="alert" className="text-sm text-red-300">{err("consent_privacy")}</p> : null}
          </div>
          <TurnstileWidget />
        </div>
      ) : null}

      {result?.error ? <Notice tone="error">{result.error}</Notice> : null}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          Back
        </Button>
        {step < STEP_TITLES.length - 1 ? (
          <Button type="button" size="lg" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Submitting…" : "Submit application"}
          </Button>
        )}
      </div>
    </form>
  );
}
