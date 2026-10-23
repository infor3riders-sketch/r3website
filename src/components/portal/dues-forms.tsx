"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import { savePeriod, submitDuesPayment } from "@/server/dues-actions";
import { uploadDocument } from "@/server/document-actions";
import { DOC_CATEGORIES } from "@/lib/validators/documents";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;
const fileClass = "block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel-raised file:px-4 file:text-sm file:font-medium file:text-white";

export function DuesProofForm({ periodId, reference }: { periodId: string; reference?: string | null }) {
  const [state, action] = useActionState(submitDuesPayment, initial);
  if (state.ok) return <FormFeedback state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="period_id" value={periodId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payment reference number" htmlFor={`ref-${periodId}`}>
          <Input id={`ref-${periodId}`} name="reference_no" defaultValue={reference ?? ""} />
        </Field>
        <Field label="Proof of payment" htmlFor={`proof-${periodId}`} hint="JPG, PNG, WebP or PDF, up to 5 MB">
          <input id={`proof-${periodId}`} name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={fileClass} />
        </Field>
      </div>
      <FormFeedback state={state} />
      <SubmitButton variant="blue" pendingText="Uploading…">Send payment details</SubmitButton>
    </form>
  );
}

export function PeriodForm() {
  const [state, action] = useActionState(savePeriod, initial);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Label" htmlFor="label" error={state.fieldErrors?.label} required>
        <Input id="label" name="label" defaultValue={v.label} placeholder="2027 Annual Dues" required {...inv(state, "label")} />
      </Field>
      <Field label="Starts" htmlFor="starts_on" error={state.fieldErrors?.starts_on} required>
        <Input id="starts_on" name="starts_on" type="date" defaultValue={v.starts_on} required {...inv(state, "starts_on")} />
      </Field>
      <Field label="Due" htmlFor="due_on" error={state.fieldErrors?.due_on} required>
        <Input id="due_on" name="due_on" type="date" defaultValue={v.due_on} required {...inv(state, "due_on")} />
      </Field>
      <Field label="Amount (PHP)" htmlFor="amount" error={state.fieldErrors?.amount} required>
        <Input id="amount" name="amount" type="number" step="0.01" min={0} defaultValue={v.amount} required {...inv(state, "amount")} />
      </Field>
      <div className="space-y-3 sm:col-span-2 lg:col-span-4">
        <FormFeedback state={state} />
        <SubmitButton>Create period</SubmitButton>
      </div>
    </form>
  );
}

export function DocumentUploadForm({ canAdminOnly }: { canAdminOnly: boolean }) {
  const [state, action] = useActionState(uploadDocument, initial);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="doc-title" error={state.fieldErrors?.title} required>
          <Input id="doc-title" name="title" defaultValue={v.title} required {...inv(state, "title")} />
        </Field>
        <Field label="File" htmlFor="doc-file" hint="PDF, JPG, PNG or .docx, up to 20 MB" required>
          <input id="doc-file" name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.docx" className={fileClass} />
        </Field>
        <Field label="Category" htmlFor="doc-cat" error={state.fieldErrors?.category}>
          <Select id="doc-cat" name="category" defaultValue={v.category ?? "general"}>
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Who can see it" htmlFor="doc-role" error={state.fieldErrors?.min_role}>
          <Select id="doc-role" name="min_role" defaultValue={v.min_role ?? "member"}>
            <option value="member">All members</option>
            <option value="officer">Officers and admins</option>
            {canAdminOnly ? <option value="admin">Admins only</option> : null}
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="doc-desc">
        <Textarea id="doc-desc" name="description" rows={2} defaultValue={v.description} />
      </Field>
      <FormFeedback state={state} />
      <SubmitButton pendingText="Uploading…">Upload document</SubmitButton>
    </form>
  );
}
