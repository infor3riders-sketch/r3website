import { RangeToolbar, ReportSection, ReportShell, ReportStats, ReportTable } from "@/components/portal/report";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatPHP } from "@/lib/format";
import { parseReportRange } from "@/lib/report-range";
import { getSalesReport } from "@/server/queries/reports";

export const metadata = { title: "Shop sales report" };
export const dynamic = "force-dynamic";

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireRole("officer");
  const sp = await searchParams;
  const range = parseReportRange(sp.from, sp.to);
  const { rows, items, totals } = await getSalesReport(range);

  return (
    <ReportShell
      title="Shop sales report"
      subtitle={`${formatDate(range.from)} to ${formatDate(range.to)} · by payment date`}
      backHref="/manage/reports"
      backLabel="Reports"
      generatedBy={me.full_name ?? me.email ?? "officer"}
      toolbar={<RangeToolbar action="/manage/reports/sales" range={range} />}
    >
      <ReportStats
        items={[
          { label: "Paid orders", value: totals.orders },
          { label: "Gross (before discounts)", value: formatPHP(totals.subtotal) },
          { label: "Discounts", value: formatPHP(totals.discounts) },
          { label: "Net sales", value: formatPHP(totals.total) },
        ]}
      />

      <ReportSection title="By item">
        <ReportTable
          rowCount={items.length}
          empty="No paid orders in this period."
          columns={[{ label: "Item" }, { label: "Qty sold", numeric: true }, { label: "Gross", numeric: true }]}
          footer={
            <tr>
              <td>Total</td>
              <td className="text-right">{items.reduce((n, i) => n + i.quantity, 0)}</td>
              <td className="text-right">{formatPHP(totals.subtotal)}</td>
            </tr>
          }
        >
          {items.map((i) => (
            <tr key={i.name}>
              <td>{i.name}</td>
              <td className="text-right">{i.quantity}</td>
              <td className="text-right">{formatPHP(i.total)}</td>
            </tr>
          ))}
        </ReportTable>
      </ReportSection>

      {rows.length > 0 ? (
        <ReportSection title="Orders">
          <ReportTable
            rowCount={rows.length}
            columns={[{ label: "Paid" }, { label: "Order no." }, { label: "Customer" }, { label: "Status" }, { label: "Method" }, { label: "Discount", numeric: true }, { label: "Total", numeric: true }]}
            footer={
              <tr>
                <td colSpan={5} className="text-right">Net sales</td>
                <td className="text-right">{formatPHP(totals.discounts)}</td>
                <td className="text-right">{formatPHP(totals.total)}</td>
              </tr>
            }
          >
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap">{o.paid_at ? formatDate(o.paid_at) : ""}</td>
                <td className="whitespace-nowrap font-mono text-[11px]">{o.order_no}</td>
                <td>{o.customer_name}</td>
                <td className="capitalize">{o.status}</td>
                <td className="capitalize">{o.payment_method}</td>
                <td className="text-right">{Number(o.discount_total) ? formatPHP(Number(o.discount_total)) : ""}</td>
                <td className="text-right">{formatPHP(Number(o.total))}</td>
              </tr>
            ))}
          </ReportTable>
        </ReportSection>
      ) : null}
    </ReportShell>
  );
}
