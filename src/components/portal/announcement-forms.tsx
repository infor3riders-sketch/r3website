"use client";

import { useActionState, useEffect } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import { createAnnouncement, markRead } from "@/server/announcement-actions";

const initial: FormStateLike = {};

export function AnnouncementComposer() {
  const [state, action] = useActionState(createAnnouncement, initial);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="space-y-4">
      <Field label="Title" htmlFor="a-title" error={state.fieldErrors?.title} required>
        <Input id="a-title" name="title" defaultValue={v.title} required aria-invalid={Boolean(state.fieldErrors?.title)} />
      </Field>
      <Field label="Message" htmlFor="a-body" error={state.fieldErrors?.body} required>
        <Textarea id="a-body" name="body" rows={5} defaultValue={v.body} required aria-invalid={Boolean(state.fieldErrors?.body)} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="pinned" className="h-5 w-5 accent-[#f2a81d]" />
        Pin to the top
      </label>
      <FormFeedback state={state} />
      <SubmitButton>Post announcement</SubmitButton>
    </form>
  );
}

/** Marks an announcement read once the member has opened it. */
export function MarkRead({ id }: { id: string }) {
  useEffect(() => {
    void markRead(id);
  }, [id]);
  return null;
}
