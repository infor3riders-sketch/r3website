import { notFound } from "next/navigation";
import { z } from "zod";
import { ReportDetails, ReportShell, ReportStats, ReportTable } from "@/components/portal/report";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatPHP } from "@/lib/format";
import { getDuesReport } from "@/server/queries/reports";

export const metadata = { title: "Dues collection report" };

const STATUS_LABEL: Record<string, string> = { paid: "Paid", pending: "Pending verification", rejected: "Rejected", refunded: "Refunded", cancelled: "Cancelled" };

export default async function DuesReportPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("officer");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getDuesReport(id);
  if (!data) notFound();
  const { period, rows } = data;

  const paid = rows.filter((r) => r.payment?.status === "paid");
  const pending = rows.filter((r) => r.payment?.status === "pending");
  const unpaid = rows.filter((r) => r.payment?.status !== "paid" && r.payment?.status !== "pending");
  const collected = paid.reduce((n, r) => n + Number(r.payment!.amount), 0);
  const outstanding = unpaid.length * Number(period.amount);
  // Unpaid first so the list doubles as a follow-up sheet.
  const order = { unpaid: 0, pending: 1, paid: 2 } as const;
  const sorted = [...rows].sort((a, b) => {
    const k = (r: (typeof rows)[number]) => (r.payment?.status === "paid" ? order.paid : r.payment?.status === "pending" ? order.pending : order.unpaid);
    return k(a) - k(b) || (a.member.full_name ?? "").localeCompare(b.member.full_name ?? "");
  });

  return (
    <ReportShell title="Dues collection" subtitle={period.label} backHref={`/manage/dues/${period.id}`} backLabel="Back to period" generatedBy={me.full_name ?? me.email ?? "officer"}>
      <ReportDetails
        items={[
          { label: "Period", value: period.label },
          { label: "Amount per member", value: formatPHP(Number(period.amount)) },
          { label: "Starts", value: formatDate(period.starts_on) },
          { label: "Due", value: formatDate(period.due_on) },
        ]}
      />
      <ReportStats
        items={[
          { label: "Paid", value: `${paid.length} / ${rows.length}` },
          { label: "Pending", value: pending.length },
          { label: "Collected", value: formatPHP(collected) },
          { label: "Still owed", value: formatPHP(outstanding) },
        ]}
      />
      <ReportTable
        rowCount={sorted.length}
        empty="No active members."
        columns={[
          { label: "#", numeric: true, className: "w-8" },
          { label: "Member" },
          { label: "Phone" },
          { label: "Status" },
          { label: "Reference" },
          { label: "Verified" },
          { label: "Amount", numeric: true },
        ]}
        footer={
          <tr>
            <td colSpan={6} className="text-right">Total collected</td>
            <td className="text-right">{formatPHP(collected)}</td>
          </tr>
        }
      >
        {sorted.map(({ member, payment }, i) => (
          <tr key={member.id}>
            <td className="text-right">{i + 1}</td>
            <td>
              <span className="font-semibold">{member.full_name ?? member.email}</span>
              {member.road_name ? <span className="text-neutral-600"> &ldquo;{member.road_name}&rdquo;</span> : null}
            </td>
            <td className="whitespace-nowrap">{member.phone ?? ""}</td>
            <td className={payment?.status === "paid" ? "" : "font-semibold"}>{payment ? STATUS_LABEL[payment.status] : "Unpaid"}</td>
            <td>{payment?.reference_no ?? ""}</td>
            <td className="whitespace-nowrap">{payment?.status === "paid" && payment.verified_at ? formatDate(payment.verified_at) : ""}</td>
            <td className="text-right">{payment?.status === "paid" ? formatPHP(Number(payment.amount)) : ""}</td>
          </tr>
        ))}
      </ReportTable>
    </ReportShell>
  );
}
