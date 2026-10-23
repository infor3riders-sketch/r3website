"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import { isoToManilaLocal } from "@/lib/events";
import type { Row } from "@/lib/supabase/types";
import { saveEvent, saveRsvp } from "@/server/event-actions";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;

const STATUS = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Can't go" },
] as const;

export function RsvpForm({ event, mine, seatsLeft }: { event: Row<"events">; mine: Row<"event_rsvps"> | null; seatsLeft: number | null }) {
  const [state, action] = useActionState(saveRsvp, initial);
  const v = state.values;
  const status = v?.status ?? mine?.status ?? "going";
  return (
    <form action={action} noValidate className="space-y-4">
      <input type="hidden" name="event_id" value={event.id} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-white">Will you ride?</legend>
        <div className="grid grid-cols-3 gap-2">
          {STATUS.map((s) => (
            <label key={s.value} className="has-[:checked]:border-gold has-[:checked]:bg-gold/10 flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-line text-sm font-semibold has-[:checked]:text-gold">
              <input type="radio" name="status" value={s.value} defaultChecked={status === s.value} className="sr-only" />
              {s.label}
            </label>
          ))}
        </div>
        {state.fieldErrors?.status ? <p role="alert" className="text-sm text-red-300">{state.fieldErrors.status}</p> : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Riders" htmlFor="riders" error={state.fieldErrors?.riders} hint="Motorcycles you are bringing">
          <Input id="riders" name="riders" type="number" min={0} max={20} inputMode="numeric" defaultValue={v?.riders ?? mine?.riders ?? 1} {...inv(state, "riders")} />
        </Field>
        <Field label="Passengers" htmlFor="passengers" error={state.fieldErrors?.passengers} hint="Pillion riders">
          <Input id="passengers" name="passengers" type="number" min={0} max={20} inputMode="numeric" defaultValue={v?.passengers ?? mine?.passengers ?? 0} {...inv(state, "passengers")} />
        </Field>
      </div>
      {seatsLeft !== null ? <p className="text-sm text-muted">{seatsLeft === 0 ? "This event is full. You can still mark yourself as maybe." : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left.`}</p> : null}

      {event.requires_waiver ? (
        <div className="space-y-1.5">
          <label className="flex items-start gap-3 text-sm text-white/90">
            <input type="checkbox" name="waiver" defaultChecked={Boolean(mine?.waiver_signed_at)} className="mt-1 h-5 w-5 shrink-0 accent-[#f2a81d]" />
            <span>I acknowledge the ride waiver: I ride at my own risk, will follow the road captain, and my motorcycle and license are in order.</span>
          </label>
          {state.fieldErrors?.waiver ? <p role="alert" className="text-sm text-red-300">{state.fieldErrors.waiver}</p> : null}
        </div>
      ) : null}

      <FormFeedback state={state} />
      <SubmitButton size="lg" block>
        {mine ? "Update my RSVP" : "Save my RSVP"}
      </SubmitButton>
    </form>
  );
}

export function EventForm({ event, programs }: { event?: Row<"events">; programs: { id: string; title: string }[] }) {
  const [state, action] = useActionState(saveEvent, initial);
  const v = state.values;
  const val = (k: keyof Row<"events">) => v?.[k] ?? (event?.[k] == null ? "" : String(event[k]));
  const chk = (k: "requires_waiver" | "public_interest_enabled" | "is_public") => (v ? v[k] === "on" : Boolean(event?.[k]));
  const dt = (k: "starts_at" | "ends_at") => v?.[k] ?? isoToManilaLocal(event?.[k]);
  return (
    <form action={action} noValidate className="space-y-5">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <Field label="Title" htmlFor="title" error={state.fieldErrors?.title} required>
        <Input id="title" name="title" defaultValue={val("title")} required {...inv(state, "title")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts (Manila time)" htmlFor="starts_at" error={state.fieldErrors?.starts_at} required>
          <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={dt("starts_at")} required {...inv(state, "starts_at")} />
        </Field>
        <Field label="Ends (optional)" htmlFor="ends_at" error={state.fieldErrors?.ends_at}>
          <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={dt("ends_at")} {...inv(state, "ends_at")} />
        </Field>
        <Field label="Meeting point" htmlFor="meeting_point" error={state.fieldErrors?.meeting_point}>
          <Input id="meeting_point" name="meeting_point" defaultValue={val("meeting_point")} />
        </Field>
        <Field label="Capacity (riders + passengers)" htmlFor="capacity" error={state.fieldErrors?.capacity} hint="Leave empty for unlimited">
          <Input id="capacity" name="capacity" type="number" min={1} inputMode="numeric" defaultValue={val("capacity")} {...inv(state, "capacity")} />
        </Field>
        <Field label="Program" htmlFor="program_id">
          <Select id="program_id" name="program_id" defaultValue={val("program_id")}>
            <option value="">None</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="URL name" htmlFor="slug" error={state.fieldErrors?.slug} hint="Auto-generated from the title if empty">
          <Input id="slug" name="slug" defaultValue={val("slug")} {...inv(state, "slug")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
        <Textarea id="description" name="description" rows={4} defaultValue={val("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Route" htmlFor="route">
          <Textarea id="route" name="route" rows={3} defaultValue={val("route")} />
        </Field>
        <Field label="Requirements" htmlFor="requirements">
          <Textarea id="requirements" name="requirements" rows={3} defaultValue={val("requirements")} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["is_public", "Show on the public website"],
            ["public_interest_enabled", "Allow public \"I'm interested\" signups"],
            ["requires_waiver", "Require ride waiver for RSVP"],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 text-sm">
            <input type="checkbox" name={name} defaultChecked={chk(name)} className="h-5 w-5 accent-[#f2a81d]" />
            {label}
          </label>
        ))}
      </div>
      <FormFeedback state={state} />
      <SubmitButton size="lg">{event ? "Save event" : "Create event"}</SubmitButton>
    </form>
  );
}
