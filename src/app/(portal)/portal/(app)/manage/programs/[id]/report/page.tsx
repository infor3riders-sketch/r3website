import { notFound } from "next/navigation";
import { z } from "zod";
import { ReportSection, ReportShell, ReportStats, ReportTable } from "@/components/portal/report";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { getProgramById, getProgramRoster } from "@/server/queries/volunteering";

export const metadata = { title: "Volunteer hours report" };

export default async function ProgramReportPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("officer");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const program = await getProgramById(id);
  if (!program) notFound();
  const { rows, slots, totalHours } = await getProgramRoster(id);
  const active = rows.filter((r) => r.status !== "cancelled").sort((a, b) => a.slot_title.localeCompare(b.slot_title) || a.name.localeCompare(b.name));

  // Hours per volunteer (by email, so the same person across slots adds up).
  const perPerson = new Map<string, { name: string; signups: number; hours: number }>();
  for (const r of active) {
    const key = r.email.toLowerCase();
    const cur = perPerson.get(key) ?? { name: r.name, signups: 0, hours: 0 };
    perPerson.set(key, { name: cur.name, signups: cur.signups + 1, hours: cur.hours + Number(r.hours ?? 0) });
  }
  const people = [...perPerson.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

  return (
    <ReportShell title="Volunteer hours" subtitle={program.title} backHref={`/manage/programs/${program.id}`} backLabel="Back to program" generatedBy={me.full_name ?? me.email ?? "officer"}>
      <ReportStats
        items={[
          { label: "Active sign-ups", value: active.length },
          { label: "Volunteers", value: people.length },
          { label: "Completed", value: active.filter((r) => r.status === "completed").length },
          { label: "Hours recorded", value: totalHours },
        ]}
      />

      <ReportSection title="Hours per volunteer">
        <ReportTable
          rowCount={people.length}
          empty="No sign-ups yet."
          columns={[{ label: "#", numeric: true, className: "w-8" }, { label: "Volunteer" }, { label: "Sign-ups", numeric: true }, { label: "Hours", numeric: true }]}
          footer={
            <tr>
              <td colSpan={3} className="text-right">Total hours</td>
              <td className="text-right">{totalHours}</td>
            </tr>
          }
        >
          {people.map((p, i) => (
            <tr key={i}>
              <td className="text-right">{i + 1}</td>
              <td>{p.name}</td>
              <td className="text-right">{p.signups}</td>
              <td className="text-right">{p.hours}</td>
            </tr>
          ))}
        </ReportTable>
      </ReportSection>

      <ReportSection title="Sign-ups by slot">
        <ReportTable
          rowCount={active.length}
          empty="No sign-ups yet."
          columns={[{ label: "Slot" }, { label: "When" }, { label: "Volunteer" }, { label: "Phone" }, { label: "Status" }, { label: "Hours", numeric: true }]}
        >
          {active.map((r) => {
            const slot = slots.find((s) => s.id === r.slot_id);
            return (
              <tr key={r.id}>
                <td>{r.slot_title}</td>
                <td className="whitespace-nowrap">{slot?.starts_at ? formatDateTime(slot.starts_at) : `Signed up ${formatDate(r.created_at)}`}</td>
                <td>{r.name}</td>
                <td className="whitespace-nowrap">{r.phone ?? ""}</td>
                <td className="capitalize">{r.status}</td>
                <td className="text-right">{r.hours ?? ""}</td>
              </tr>
            );
          })}
        </ReportTable>
      </ReportSection>
    </ReportShell>
  );
}
