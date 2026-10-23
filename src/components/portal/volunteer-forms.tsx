"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import type { Row } from "@/lib/supabase/types";
import { saveProgram, saveSlot, signUpForProgram } from "@/server/volunteer-actions";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;

export function SignupForm({ programId, slotId, label = "Sign up" }: { programId: string; slotId?: string; label?: string }) {
  const [state, action] = useActionState(signUpForProgram, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="program_id" value={programId} />
      {slotId ? <input type="hidden" name="slot_id" value={slotId} /> : null}
      <FormFeedback state={state} />
      {state.ok ? null : <SubmitButton variant="blue" pendingText="Signing up…">{label}</SubmitButton>}
    </form>
  );
}

export function ProgramForm({ program }: { program?: Row<"programs"> }) {
  const [state, action] = useActionState(saveProgram, initial);
  const v = state.values;
  const val = (k: keyof Row<"programs">) => v?.[k] ?? (program?.[k] == null ? "" : String(program[k]));
  const chk = (k: "volunteer_enabled" | "is_public") => (v ? v[k] === "on" : program ? Boolean(program[k]) : k === "volunteer_enabled");
  return (
    <form action={action} noValidate className="space-y-4">
      {program ? <input type="hidden" name="id" value={program.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" error={state.fieldErrors?.title} required>
          <Input id="title" name="title" defaultValue={val("title")} required {...inv(state, "title")} />
        </Field>
        <Field label="URL name" htmlFor="slug" error={state.fieldErrors?.slug} hint="Auto-generated from the title if empty">
          <Input id="slug" name="slug" defaultValue={val("slug")} {...inv(state, "slug")} />
        </Field>
      </div>
      <Field label="Short summary" htmlFor="summary" error={state.fieldErrors?.summary}>
        <Input id="summary" name="summary" defaultValue={val("summary")} />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={5} defaultValue={val("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Schedule" htmlFor="schedule">
          <Input id="schedule" name="schedule" defaultValue={val("schedule")} />
        </Field>
        <Field label="Sort order" htmlFor="sort_order" error={state.fieldErrors?.sort_order}>
          <Input id="sort_order" name="sort_order" type="number" min={0} defaultValue={val("sort_order") || "0"} />
        </Field>
      </div>
      <Field label="How to join or volunteer" htmlFor="how_to_join">
        <Textarea id="how_to_join" name="how_to_join" rows={2} defaultValue={val("how_to_join")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 text-sm">
          <input type="checkbox" name="is_public" defaultChecked={chk("is_public")} className="h-5 w-5 accent-[#f2a81d]" />
          Show on the public website
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3 text-sm">
          <input type="checkbox" name="volunteer_enabled" defaultChecked={chk("volunteer_enabled")} className="h-5 w-5 accent-[#f2a81d]" />
          Accept volunteer sign-ups
        </label>
      </div>
      <FormFeedback state={state} />
      <SubmitButton size="lg">{program ? "Save program" : "Create program"}</SubmitButton>
    </form>
  );
}

export function SlotForm({ programId, events }: { programId: string; events: { id: string; title: string }[] }) {
  const [state, action] = useActionState(saveSlot, initial);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="program_id" value={programId} />
      <Field label="Slot title" htmlFor="slot-title" error={state.fieldErrors?.title} required className="sm:col-span-2">
        <Input id="slot-title" name="title" defaultValue={v.title} required placeholder="e.g. Road marshal" {...inv(state, "title")} />
      </Field>
      <Field label="Starts (Manila time)" htmlFor="slot-start" error={state.fieldErrors?.starts_at}>
        <Input id="slot-start" name="starts_at" type="datetime-local" defaultValue={v.starts_at} {...inv(state, "starts_at")} />
      </Field>
      <Field label="Ends" htmlFor="slot-end" error={state.fieldErrors?.ends_at}>
        <Input id="slot-end" name="ends_at" type="datetime-local" defaultValue={v.ends_at} {...inv(state, "ends_at")} />
      </Field>
      <Field label="Volunteers needed" htmlFor="slot-cap" error={state.fieldErrors?.capacity} hint="Empty for unlimited">
        <Input id="slot-cap" name="capacity" type="number" min={1} inputMode="numeric" defaultValue={v.capacity} {...inv(state, "capacity")} />
      </Field>
      <Field label="Linked event" htmlFor="slot-event">
        <Select id="slot-event" name="event_id" defaultValue={v.event_id ?? ""}>
          <option value="">None</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2 space-y-3">
        <FormFeedback state={state} />
        <SubmitButton variant="outline">Add slot</SubmitButton>
      </div>
    </form>
  );
}
