"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/states";
import {
  approveApplication,
  rejectApplication,
  requestApplicationInfo,
  saveReviewNotes,
  type ReviewState,
} from "@/server/review-actions";

const initial: ReviewState = {};

function Result({ state }: { state: ReviewState }) {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok) return <Notice tone="success">{state.message}</Notice>;
  return null;
}

/** Officer review controls. Each action re-checks the officer role on the server. */
export function ReviewPanel({ id, notes, open }: { id: string; notes: string; open: boolean }) {
  const [saveState, save, saving] = useActionState(saveReviewNotes, initial);
  const [approveState, approve, approving] = useActionState(approveApplication, initial);
  const [rejectState, reject, rejecting] = useActionState(rejectApplication, initial);
  const [infoState, info, requesting] = useActionState(requestApplicationInfo, initial);

  return (
    <div className="space-y-6">
      <form action={save} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <Field label="Internal review notes" htmlFor="notes" hint="Only officers see these. They are not sent to the applicant unless you choose so when rejecting.">
          <Textarea id="notes" name="notes" rows={5} defaultValue={notes} />
        </Field>
        <Result state={saveState} />
        <Button type="submit" variant="outline" disabled={saving}>
          {saving ? "Saving…" : "Save notes"}
        </Button>
      </form>

      {open ? (
        <>
          <section aria-labelledby="info-h" className="space-y-3 border-t border-line pt-5">
            <h3 id="info-h" className="text-lg font-semibold uppercase">Request more information</h3>
            <form action={info} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <Field label="Question for the applicant" htmlFor="message" required>
                <Textarea id="message" name="message" rows={3} required minLength={5} />
              </Field>
              <Result state={infoState} />
              <Button type="submit" variant="blue" disabled={requesting}>
                {requesting ? "Sending…" : "Email request"}
              </Button>
            </form>
          </section>

          <section aria-labelledby="decide-h" className="space-y-4 border-t border-line pt-5">
            <h3 id="decide-h" className="text-lg font-semibold uppercase">Decision</h3>

            <form action={approve} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <p className="text-sm text-muted">
                Approving creates the member account and emails a portal invitation. The notes above are saved with the decision.
              </p>
              <Result state={approveState} />
              <Button type="submit" variant="gold" disabled={approving} data-testid="approve">
                {approving ? "Approving…" : "Approve and invite"}
              </Button>
            </form>

            <form action={reject} className="space-y-3 rounded-lg border border-red-400/30 p-4">
              <input type="hidden" name="id" value={id} />
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="include_note" className="h-5 w-5 accent-[#f2a81d]" />
                Include my notes in the rejection email
              </label>
              <Result state={rejectState} />
              <Button type="submit" variant="danger" disabled={rejecting}>
                {rejecting ? "Rejecting…" : "Reject application"}
              </Button>
            </form>
          </section>
        </>
      ) : (
        <Notice tone="info">This decision is final. Approved and rejected applications cannot be changed.</Notice>
      )}
    </div>
  );
}
