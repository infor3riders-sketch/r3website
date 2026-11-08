import Link from "next/link";
import { PrintButton } from "@/components/portal/print-button";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { formatDateTime } from "@/lib/format";
import { ORG } from "@/lib/org";
import type { ReportRange } from "@/lib/report-range";
import { cn } from "@/lib/utils";
import { getSetting } from "@/server/queries/public";

/**
 * Printable report page: an on-screen toolbar (back link, filters, Print) above a white "paper"
 * preview that prints as-is. Colours are explicit (not theme tokens) so screen and paper match.
 */
export async function ReportShell({
  title,
  subtitle,
  backHref,
  backLabel,
  generatedBy,
  landscape = false,
  confidential = true,
  toolbar,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref: string;
  backLabel: string;
  generatedBy: string;
  landscape?: boolean;
  confidential?: boolean;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const registration = await getSetting("registration");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm text-gold hover:text-gold-hover">
          &larr; {backLabel}
        </Link>
        <PrintButton />
      </div>
      {toolbar ? <div className="print:hidden">{toolbar}</div> : null}
      <article
        className={cn(
          "mx-auto space-y-5 overflow-x-auto rounded-lg bg-white p-6 text-[13px] text-black shadow-lg sm:p-8 print:max-w-none print:overflow-visible print:rounded-none print:p-0 print:shadow-none",
          landscape ? "print-landscape max-w-6xl" : "max-w-4xl",
        )}
      >
        <header className="flex items-center gap-4 border-b-2 border-black pb-3">
          <Logo className="w-16 shrink-0" priority decorative />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold uppercase leading-tight">{registration.legal_name || ORG.name}</p>
            <p className="text-xs text-neutral-600">SEC Reg. No. {registration.sec_registration_no}</p>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold uppercase leading-tight">{title}</h1>
            {subtitle ? <p className="text-xs text-neutral-700">{subtitle}</p> : null}
          </div>
        </header>
        {children}
        <footer className="flex flex-wrap justify-between gap-2 border-t border-neutral-300 pt-2 text-[11px] text-neutral-600">
          <span>
            Generated {formatDateTime(new Date())} by {generatedBy}
          </span>
          {confidential ? <span>Confidential: contains members&rsquo; personal information. Handle and dispose of securely.</span> : null}
        </footer>
      </article>
    </div>
  );
}

/** A row of headline figures (e.g. Going 24 · Checked in 19). */
export function ReportStats({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="print-keep rounded border border-neutral-300 px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-neutral-600">{i.label}</dt>
          <dd className="text-lg font-bold">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Label/value details block (event details, period details). */
export function ReportDetails({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 print:grid-cols-2">
      {items
        .filter((i) => i.value !== null && i.value !== undefined && i.value !== "")
        .map((i) => (
          <div key={i.label} className="flex gap-2">
            <dt className="w-32 shrink-0 text-neutral-600">{i.label}</dt>
            <dd className="min-w-0 whitespace-pre-line">{i.value}</dd>
          </div>
        ))}
    </dl>
  );
}

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

/** Plain bordered table. `numeric` columns are right-aligned. */
export function ReportTable({
  columns,
  children,
  footer,
  empty = "Nothing to show.",
  rowCount,
}: {
  columns: { label: string; numeric?: boolean; className?: string }[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  empty?: string;
  rowCount: number;
}) {
  if (rowCount === 0) return <p className="text-neutral-600">{empty}</p>;
  return (
    <table className="w-full border-collapse text-left [&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:border [&_th]:border-neutral-400 [&_th]:px-2 [&_th]:py-1">
      <thead className="bg-neutral-100 text-[11px] uppercase tracking-wide">
        <tr>
          {columns.map((c) => (
            <th key={c.label} scope="col" className={cn(c.numeric && "text-right", c.className)}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
      {footer ? <tfoot className="font-bold">{footer}</tfoot> : null}
    </table>
  );
}

/** Shared filter-bar styling for report toolbars (GET forms, so filters live in the URL). */
export const filterBar = "flex flex-wrap items-end gap-3 rounded-lg border border-line bg-panel p-3";
export const filterLabel = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted";
export const filterControl = "h-11 rounded-md border border-line bg-black/40 px-3 text-white";

/** From/To date filter for date-range reports. */
export function RangeToolbar({ action, range }: { action: string; range: ReportRange }) {
  return (
    <form action={action} className={filterBar}>
      <div>
        <label htmlFor="from" className={filterLabel}>From</label>
        <input id="from" name="from" type="date" defaultValue={range.from} className={filterControl} />
      </div>
      <div>
        <label htmlFor="to" className={filterLabel}>To</label>
        <input id="to" name="to" type="date" defaultValue={range.to} className={filterControl} />
      </div>
      <Button type="submit" variant="outline">Update</Button>
    </form>
  );
}
