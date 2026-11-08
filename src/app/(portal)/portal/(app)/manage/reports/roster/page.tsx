import { z } from "zod";
import { ReportShell, ReportStats, ReportTable } from "@/components/portal/report";
import { Notice } from "@/components/ui/states";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getMemberRosterReport, logReportView, ROSTER_ROLES, ROSTER_STATUSES } from "@/server/queries/reports";

export const metadata = { title: "Member roster" };
export const dynamic = "force-dynamic";

const ROLE_LABEL = { member: "Member", officer: "Officer", admin: "Admin" } as const;

export default async function MemberRosterReport({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireRole("officer");
  const sp = await searchParams;
  const status = z.enum(ROSTER_STATUSES).catch("active").parse(sp.status);
  const role = z.enum(ROSTER_ROLES).catch("all").parse(sp.role);
  const typeId = z.uuid().nullable().catch(null).parse(sp.type || null);
  const emergency = sp.emergency === "1";
  const withBikes = sp.bikes === "1";

  const { rows, types } = await getMemberRosterReport({ status, role, typeId, withBikes });
  const logged = await logReportView(me.id, "print_member_roster", "profiles", { status, role, type: typeId, emergency, bikes: withBikes, count: rows.length });
  if (!logged) return <Notice tone="warn">Reports are unavailable right now because the audit log could not be written. Please try again.</Notice>;

  const typeName = typeId ? (types.find((t) => t.id === typeId)?.name ?? "Selected type") : "All types";
  const filters = [status === "all" ? "All statuses" : `${status[0].toUpperCase()}${status.slice(1)} members`, role === "all" ? "all roles" : `${ROLE_LABEL[role]}s`, typeName.toLowerCase()].join(" · ");
  const byRole = (r: keyof typeof ROLE_LABEL) => rows.filter((x) => x.profile.role === r).length;

  const columns = [
    { label: "#", numeric: true, className: "w-8" },
    { label: "Name" },
    { label: "Type" },
    { label: "Role" },
    { label: "Member since" },
    { label: "Phone" },
    { label: "Email" },
    ...(status === "all" ? [{ label: "Status" }] : []),
    ...(emergency ? [{ label: "Blood" }, { label: "Emergency contact" }] : []),
    ...(withBikes ? [{ label: "Motorcycles" }] : []),
  ];

  return (
    <ReportShell title="Member roster" subtitle={filters} backHref="/manage/reports" backLabel="Reports" generatedBy={me.full_name ?? me.email ?? "officer"} landscape>
      <ReportStats
        items={[
          { label: "Listed", value: rows.length },
          { label: "Members", value: byRole("member") },
          { label: "Officers", value: byRole("officer") },
          { label: "Admins", value: byRole("admin") },
        ]}
      />
      <ReportTable columns={columns} rowCount={rows.length} empty="No members match these filters.">
        {rows.map(({ profile: p, typeName: t, bikes }, i) => (
          <tr key={p.id}>
            <td className="text-right">{i + 1}</td>
            <td>
              <span className="font-semibold">{p.full_name ?? "(no name)"}</span>
              {p.road_name ? <span className="block text-[11px] text-neutral-600">&ldquo;{p.road_name}&rdquo;</span> : null}
            </td>
            <td>{t ?? ""}</td>
            <td>{ROLE_LABEL[p.role]}</td>
            <td className="whitespace-nowrap">{p.member_since ? formatDate(p.member_since) : ""}</td>
            <td className="whitespace-nowrap">{p.phone ?? ""}</td>
            <td className="break-all">{p.email ?? ""}</td>
            {status === "all" ? <td className="capitalize">{p.status}</td> : null}
            {emergency ? (
              <>
                <td>{p.blood_type ?? ""}</td>
                <td>
                  {p.emergency_contact_name ?? ""}
                  {p.emergency_contact_relation ? ` (${p.emergency_contact_relation})` : ""}
                  {p.emergency_contact_phone ? <span className="block whitespace-nowrap">{p.emergency_contact_phone}</span> : null}
                </td>
              </>
            ) : null}
            {withBikes ? (
              <td>
                {bikes.map((b, j) => (
                  <span key={j} className="block">
                    {[b.year, b.make, b.model].filter(Boolean).join(" ")}
                    {b.plate_number ? ` · ${b.plate_number}` : ""}
                  </span>
                ))}
              </td>
            ) : null}
          </tr>
        ))}
      </ReportTable>
    </ReportShell>
  );
}
