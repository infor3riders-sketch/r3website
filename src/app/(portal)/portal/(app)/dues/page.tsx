import Link from "next/link";
import { DuesProofForm } from "@/components/portal/dues-forms";
import { StatusBadge } from "@/components/portal/status-badge";
import { PaymentInstructions } from "@/components/site/payment-instructions";
import { EmptyState, Notice } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatPHP } from "@/lib/format";
import { getPaymentInstructions } from "@/server/queries/orders";
import { listMyDues } from "@/server/queries/dues";

export const metadata = { title: "Dues" };

const BADGE: Record<string, string> = { paid: "approved", pending: "pending", rejected: "rejected", overdue: "rejected", due: "pending", upcoming: "expired" };
const LABEL: Record<string, string> = { paid: "Paid", pending: "Awaiting verification", rejected: "Needs attention", overdue: "Overdue", due: "Due", upcoming: "Upcoming" };

export default async function DuesPage() {
  const { userId } = await requireUser("/dues");
  const [rows, instructions] = await Promise.all([listMyDues(userId), getPaymentInstructions()]);
  const owing = rows.filter((r) => r.state === "due" || r.state === "overdue" || r.state === "rejected");

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold uppercase">Dues</h1>
        <p className="text-sm text-muted">{owing.length > 0 ? `${owing.length} period${owing.length === 1 ? "" : "s"} need your attention.` : "You are all paid up. Thank you!"}</p>
      </header>

      {owing.length > 0 ? <PaymentInstructions instructions={instructions} /> : null}

      {rows.length === 0 ? (
        <EmptyState title="No dues periods yet">Officers will announce dues here.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ period, payment, state }) => (
            <li key={period.id} className="rounded-lg border border-line bg-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold uppercase">{period.label}</h2>
                  <p className="text-sm text-muted">{formatPHP(Number(period.amount))} · due {formatDate(period.due_on)}</p>
                </div>
                <StatusBadge status={BADGE[state]} label={LABEL[state]} />
              </div>
              <p className="sr-only">Status: {LABEL[state]}</p>

              {state === "paid" && payment ? (
                <p className="mt-3 text-sm">
                  Verified {payment.verified_at ? formatDate(payment.verified_at) : ""}.{" "}
                  <Link href={`/dues/${payment.id}/receipt`} className="text-gold underline">View receipt</Link>
                </p>
              ) : null}
              {state === "pending" ? <div className="mt-3"><Notice tone="info">Your payment details were received. An officer will verify them shortly. You can send updated details below.</Notice></div> : null}
              {state === "rejected" && payment?.reject_reason ? <div className="mt-3"><Notice tone="error">Reason: {payment.reject_reason}</Notice></div> : null}

              {state !== "paid" && state !== "upcoming" ? (
                <div className="mt-4 border-t border-line pt-4">
                  <DuesProofForm periodId={period.id} reference={payment?.reference_no} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
