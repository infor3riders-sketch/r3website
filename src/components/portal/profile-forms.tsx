"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import { BLOOD_TYPES } from "@/lib/validators/profile";
import { removeAvatar, saveMotorcycle, updateProfile, uploadAvatar } from "@/server/profile-actions";
import type { Row } from "@/lib/supabase/types";

const initial: FormStateLike = {};
const inv = (state: FormStateLike, key: string) =>
  ({ "aria-invalid": Boolean(state.fieldErrors?.[key]), "aria-describedby": state.fieldErrors?.[key] ? `${key}-msg` : undefined }) as const;

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-11 items-start gap-3 rounded-md border border-line px-3 py-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-[#f2a81d]" />
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function ProfileForm({ profile }: { profile: Row<"profiles"> }) {
  const [state, action] = useActionState(updateProfile, initial);
  const v = state.values;
  const val = (k: keyof Row<"profiles">) => v?.[k] ?? (profile[k] == null ? "" : String(profile[k]));
  const chk = (k: "directory_visible" | "show_phone" | "show_email" | "show_motorcycles") => (v ? v[k] === "on" : profile[k]);

  return (
    <form action={action} className="space-y-8" noValidate>
      <section className="space-y-4" aria-labelledby="p-basic">
        <h2 id="p-basic" className="text-xl font-semibold uppercase text-gold">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name" error={state.fieldErrors?.full_name} required>
            <Input id="full_name" name="full_name" autoComplete="name" defaultValue={val("full_name")} required {...inv(state, "full_name")} />
          </Field>
          <Field label="Road name / nickname" htmlFor="road_name" error={state.fieldErrors?.road_name}>
            <Input id="road_name" name="road_name" defaultValue={val("road_name")} {...inv(state, "road_name")} />
          </Field>
          <Field label="Mobile number" htmlFor="phone" error={state.fieldErrors?.phone}>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={val("phone")} {...inv(state, "phone")} />
          </Field>
          <Field label="Birthdate" htmlFor="birthdate" error={state.fieldErrors?.birthdate}>
            <Input id="birthdate" name="birthdate" type="date" defaultValue={val("birthdate")} {...inv(state, "birthdate")} />
          </Field>
          <Field label="Address" htmlFor="address" error={state.fieldErrors?.address} className="sm:col-span-2">
            <Textarea id="address" name="address" rows={2} defaultValue={val("address")} {...inv(state, "address")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="p-emergency">
        <div>
          <h2 id="p-emergency" className="text-xl font-semibold uppercase text-gold">Emergency information</h2>
          <p className="text-sm text-muted">Only you and club officers can see this. It is never shown in the member directory.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Blood type" htmlFor="blood_type" error={state.fieldErrors?.blood_type}>
            <Select id="blood_type" name="blood_type" defaultValue={val("blood_type")}>
              <option value="">Not specified</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <span className="hidden sm:block" />
          <Field label="Emergency contact name" htmlFor="emergency_contact_name" error={state.fieldErrors?.emergency_contact_name}>
            <Input id="emergency_contact_name" name="emergency_contact_name" defaultValue={val("emergency_contact_name")} {...inv(state, "emergency_contact_name")} />
          </Field>
          <Field label="Emergency contact number" htmlFor="emergency_contact_phone" error={state.fieldErrors?.emergency_contact_phone}>
            <Input id="emergency_contact_phone" name="emergency_contact_phone" type="tel" defaultValue={val("emergency_contact_phone")} {...inv(state, "emergency_contact_phone")} />
          </Field>
          <Field label="Relationship" htmlFor="emergency_contact_relation" error={state.fieldErrors?.emergency_contact_relation}>
            <Input id="emergency_contact_relation" name="emergency_contact_relation" defaultValue={val("emergency_contact_relation")} {...inv(state, "emergency_contact_relation")} />
          </Field>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="p-privacy">
        <div>
          <h2 id="p-privacy" className="text-xl font-semibold uppercase text-gold">Directory privacy</h2>
          <p className="text-sm text-muted">Everything is private by default. Choose what other members can see.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="directory_visible" label="List me in the member directory" hint="Shows your name, road name and photo to members." defaultChecked={Boolean(chk("directory_visible"))} />
          <Toggle name="show_phone" label="Show my mobile number" defaultChecked={Boolean(chk("show_phone"))} />
          <Toggle name="show_email" label="Show my email" defaultChecked={Boolean(chk("show_email"))} />
          <Toggle name="show_motorcycles" label="Show my motorcycles" defaultChecked={Boolean(chk("show_motorcycles"))} />
        </div>
      </section>

      <FormFeedback state={state} />
      <SubmitButton size="lg">Save profile</SubmitButton>
    </form>
  );
}

export function AvatarForm() {
  const [state, action] = useActionState(uploadAvatar, initial);
  const [rmState, rmAction] = useActionState(removeAvatar, initial);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <Field label="Profile photo" htmlFor="avatar" hint="JPG, PNG or WebP, up to 2 MB." className="min-w-0 flex-1">
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel-raised file:px-4 file:text-sm file:font-medium file:text-white"
          />
        </Field>
        <SubmitButton variant="outline" pendingText="Uploading…">
          Upload
        </SubmitButton>
      </form>
      <form action={rmAction}>
        <Button type="submit" variant="ghost" size="sm">
          Remove photo
        </Button>
      </form>
      <FormFeedback state={state.ok || state.error ? state : rmState} />
    </div>
  );
}

export function MotorcycleForm({ bike, onDoneLabel = "Add motorcycle" }: { bike?: Row<"motorcycles">; onDoneLabel?: string }) {
  const [state, action] = useActionState(saveMotorcycle, initial);
  const v = state.values;
  const val = (k: keyof Row<"motorcycles">) => v?.[k] ?? (bike?.[k] == null ? "" : String(bike[k]));
  const pre = bike ? `m-${bike.id}-` : "m-new-";
  return (
    <form action={action} noValidate className="space-y-4">
      {bike ? <input type="hidden" name="id" value={bike.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Make" htmlFor={`${pre}make`} error={state.fieldErrors?.make} required>
          <Input id={`${pre}make`} name="make" defaultValue={val("make")} required {...inv(state, "make")} />
        </Field>
        <Field label="Model" htmlFor={`${pre}model`} error={state.fieldErrors?.model} required>
          <Input id={`${pre}model`} name="model" defaultValue={val("model")} required {...inv(state, "model")} />
        </Field>
        <Field label="Year" htmlFor={`${pre}year`} error={state.fieldErrors?.year}>
          <Input id={`${pre}year`} name="year" type="number" inputMode="numeric" defaultValue={val("year")} {...inv(state, "year")} />
        </Field>
        <Field label="Engine size (cc)" htmlFor={`${pre}cc`} error={state.fieldErrors?.displacement_cc}>
          <Input id={`${pre}cc`} name="displacement_cc" type="number" inputMode="numeric" defaultValue={val("displacement_cc")} {...inv(state, "displacement_cc")} />
        </Field>
        <Field label="Color" htmlFor={`${pre}color`}>
          <Input id={`${pre}color`} name="color" defaultValue={val("color")} />
        </Field>
        <Field label="Plate number" htmlFor={`${pre}plate`}>
          <Input id={`${pre}plate`} name="plate_number" defaultValue={val("plate_number")} />
        </Field>
      </div>
      <FormFeedback state={state} />
      <SubmitButton variant={bike ? "outline" : "gold"}>{bike ? "Save changes" : onDoneLabel}</SubmitButton>
    </form>
  );
}

export function DeleteButton({ label }: { label: string }) {
  return (
    <Button type="submit" variant="ghost" size="sm" aria-label={label} className="text-red-300 hover:text-red-200">
      <Trash2 aria-hidden className="h-4 w-4" /> Delete
    </Button>
  );
}
