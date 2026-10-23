"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ConsentField, FormFeedback, Honeypot, SubmitButton, TurnstileWidget } from "@/components/ui/form-bits";
import { submitContact, submitEventInterest, submitVolunteer } from "@/server/public-actions";
import type { FormState } from "@/server/form-guard";

const initial: FormState = {};

function invalid(state: FormState, key: string) {
  return { "aria-invalid": Boolean(state.fieldErrors?.[key]), "aria-describedby": state.fieldErrors?.[key] ? `${key}-msg` : undefined } as const;
}

export function ContactForm() {
  const [state, action] = useActionState(submitContact, initial);
  const v = state.values ?? {};
  if (state.ok) return <FormFeedback state={state} />;
  return (
    <form action={action} className="relative space-y-4" noValidate>
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={state.fieldErrors?.name} required>
          <Input id="name" name="name" autoComplete="name" defaultValue={v.name} required {...invalid(state, "name")} />
        </Field>
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} required>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} required {...invalid(state, "email")} />
        </Field>
      </div>
      <Field label="Subject" htmlFor="subject" error={state.fieldErrors?.subject}>
        <Input id="subject" name="subject" defaultValue={v.subject} {...invalid(state, "subject")} />
      </Field>
      <Field label="Message" htmlFor="message" error={state.fieldErrors?.message} required>
        <Textarea id="message" name="message" rows={6} defaultValue={v.message} required {...invalid(state, "message")} />
      </Field>
      <ConsentField error={state.fieldErrors?.consent} />
      <TurnstileWidget />
      <FormFeedback state={state} />
      <SubmitButton size="lg">Send message</SubmitButton>
    </form>
  );
}

export function VolunteerForm({ programId, programTitle }: { programId: string; programTitle: string }) {
  const [state, action] = useActionState(submitVolunteer, initial);
  const v = state.values ?? {};
  if (state.ok) return <FormFeedback state={state} />;
  return (
    <form action={action} className="relative space-y-4" noValidate aria-label={`Volunteer for ${programTitle}`}>
      <Honeypot />
      <input type="hidden" name="program_id" value={programId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="v-name" error={state.fieldErrors?.name} required>
          <Input id="v-name" name="name" autoComplete="name" defaultValue={v.name} required {...invalid(state, "name")} />
        </Field>
        <Field label="Email" htmlFor="v-email" error={state.fieldErrors?.email} required>
          <Input id="v-email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} required {...invalid(state, "email")} />
        </Field>
      </div>
      <Field label="Phone" htmlFor="v-phone" error={state.fieldErrors?.phone}>
        <Input id="v-phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} {...invalid(state, "phone")} />
      </Field>
      <Field label="Anything we should know?" htmlFor="v-message" error={state.fieldErrors?.message}>
        <Textarea id="v-message" name="message" rows={3} defaultValue={v.message} {...invalid(state, "message")} />
      </Field>
      <ConsentField id="v-consent" error={state.fieldErrors?.consent} />
      <TurnstileWidget />
      <FormFeedback state={state} />
      <SubmitButton variant="blue" size="lg">
        Volunteer
      </SubmitButton>
    </form>
  );
}

export function EventInterestForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(submitEventInterest, initial);
  const v = state.values ?? {};
  if (state.ok) return <FormFeedback state={state} />;
  return (
    <form action={action} className="relative space-y-4" noValidate aria-label="Register your interest">
      <Honeypot />
      <input type="hidden" name="event_id" value={eventId} />
      <Field label="Name" htmlFor="i-name" error={state.fieldErrors?.name} required>
        <Input id="i-name" name="name" autoComplete="name" defaultValue={v.name} required {...invalid(state, "name")} />
      </Field>
      <Field label="Email" htmlFor="i-email" error={state.fieldErrors?.email} required>
        <Input id="i-email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={v.email} required {...invalid(state, "email")} />
      </Field>
      <Field label="Phone" htmlFor="i-phone" error={state.fieldErrors?.phone}>
        <Input id="i-phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} {...invalid(state, "phone")} />
      </Field>
      <ConsentField id="i-consent" error={state.fieldErrors?.consent} />
      <TurnstileWidget />
      <FormFeedback state={state} />
      <SubmitButton size="lg">I&apos;m interested</SubmitButton>
    </form>
  );
}
