import { RangeToolbar, ReportSection, ReportShell, ReportStats, ReportTable } from "@/components/portal/report";
import { Notice } from "@/components/ui/states";
import { requireRole } from "@/lib/auth/session";
import { donationReference } from "@/lib/donations";
import { formatDate, formatPHP } from "@/lib/format";
import { parseReportRange } from "@/lib/report-range";
import { getDonationsReport, logReportView } from "@/server/queries/reports";

export const metadata = { title: "Donations report" };
export const dynamic = "force-dynamic";

export default async function DonationsReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireRole("officer");
  const sp = await searchParams;
  const range = parseReportRange(sp.from, sp.to);
  const { rows, total, byCampaign } = await getDonationsReport(range);
  const logged = await logReportView(me.id, "print_donations", "donations", { from: range.from, to: range.to, count: rows.length });
  if (!logged) return <Notice tone="warn">Reports are unavailable right now because the audit log could not be written. Please try again.</Notice>;

  return (
    <ReportShell
      title="Donations report"
      subtitle={`${formatDate(range.from)} to ${formatDate(range.to)} · verified donations`}
      backHref="/manage/reports"
      backLabel="Reports"
      generatedBy={me.full_name ?? me.email ?? "officer"}
      toolbar={<RangeToolbar action="/manage/reports/donations" range={range} />}
    >
      <ReportStats
        items={[
          { label: "Donations", value: rows.length },
          { label: "Total received", value: formatPHP(total) },
          { label: "Average gift", value: rows.length ? formatPHP(total / rows.length) : "—" },
          { label: "Campaigns", value: byCampaign.length },
        ]}
      />

      <ReportSection title="By campaign">
        <ReportTable
          rowCount={byCampaign.length}
          empty="No verified donations in this period."
          columns={[{ label: "Campaign" }, { label: "Donations", numeric: true }, { label: "Total", numeric: true }]}
          footer={
            <tr>
              <td>Total</td>
              <td className="text-right">{rows.length}</td>
              <td className="text-right">{formatPHP(total)}</td>
            </tr>
          }
        >
          {byCampaign.map((c) => (
            <tr key={c.campaign}>
              <td>{c.campaign}</td>
              <td className="text-right">{c.count}</td>
              <td className="text-right">{formatPHP(c.total)}</td>
            </tr>
          ))}
        </ReportTable>
      </ReportSection>

      {rows.length > 0 ? (
        <ReportSection title="Donations">
          <ReportTable
            rowCount={rows.length}
            columns={[{ label: "Verified" }, { label: "Reference" }, { label: "Donor" }, { label: "Campaign" }, { label: "Method" }, { label: "Payment ref." }, { label: "Amount", numeric: true }]}
          >
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="whitespace-nowrap">{d.verified_at ? formatDate(d.verified_at) : ""}</td>
                <td className="whitespace-nowrap font-mono text-[11px]">{donationReference(d.id)}</td>
                <td>{d.donor_name}{d.is_anonymous ? " (anonymous on site)" : ""}</td>
                <td>{d.campaign}</td>
                <td className="capitalize">{d.payment_method}</td>
                <td>{d.payment_reference ?? ""}</td>
                <td className="text-right">{formatPHP(Number(d.amount))}</td>
              </tr>
            ))}
          </ReportTable>
        </ReportSection>
      ) : null}
    </ReportShell>
  );
}
