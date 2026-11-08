import { notFound } from "next/navigation";
import { ReportShell, ReportStats, ReportTable } from "@/components/portal/report";
import { Notice } from "@/components/ui/states";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { searchDirectory } from "@/server/queries/members";
import { memberCan } from "@/server/queries/permissions";
import { logReportView } from "@/server/queries/reports";

export const metadata = { title: "Member roster" };
export const dynamic = "force-dynamic";

/**
 * Member-facing printable roster (Admin > Member permissions > "Print the member roster").
 * Reads public.member_directory with the member's own client, so it only ever shows members who
 * opted in to the directory and only the details each one shares. No emergency or medical data.
 */
export default async function DirectoryPrintPage() {
  const me = await requireRole("member");
  if (!(await memberCan(me.role, "print_roster"))) notFound();
  const rows = await searchDirectory("");
  const logged = await logReportView(me.id, "print_directory_roster", "profiles", { count: rows.length });
  if (!logged) return <Notice tone="warn">Printing is unavailable right now because the audit log could not be written. Please try again.</Notice>;

  return (
    <ReportShell title="Member roster" subtitle="Members listed in the directory" backHref="/directory" backLabel="Directory" generatedBy={me.full_name ?? me.email ?? "member"} landscape>
      <ReportStats items={[{ label: "Listed", value: rows.length }]} />
      <ReportTable
        columns={[{ label: "#", numeric: true, className: "w-8" }, { label: "Name" }, { label: "Member since" }, { label: "Phone" }, { label: "Email" }, { label: "Motorcycles" }]}
        rowCount={rows.length}
        empty="No members are listed in the directory yet."
      >
        {rows.map((m, i) => (
          <tr key={m.id}>
            <td className="text-right">{i + 1}</td>
            <td>
              <span className="font-semibold">{m.full_name ?? "(no name)"}</span>
              {m.road_name ? <span className="block text-[11px] text-neutral-600">&ldquo;{m.road_name}&rdquo;</span> : null}
            </td>
            <td className="whitespace-nowrap">{m.member_since ? formatDate(m.member_since) : ""}</td>
            <td className="whitespace-nowrap">{m.phone ?? ""}</td>
            <td className="[overflow-wrap:anywhere]">{m.email ?? ""}</td>
            <td>{m.motorcycles ?? ""}</td>
          </tr>
        ))}
      </ReportTable>
    </ReportShell>
  );
}
