import { notFound } from "next/navigation";
import { z } from "zod";
import { ReportDetails, ReportShell, ReportTable } from "@/components/portal/report";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { getEventReport } from "@/server/queries/reports";

export const metadata = { title: "Sign-in sheet" };

/** Blank rows printed after the RSVP list for walk-ins. */
const WALK_IN_ROWS = 10;

export default async function SignInSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("officer");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getEventReport(id);
  if (!data) notFound();
  const { event, rows } = data;
  // Expected riders: everyone going or maybe; walk-ins write their names in the blank rows.
  const expected = rows.filter((r) => r.status === "going" || r.status === "maybe");

  return (
    <ReportShell title="Sign-in sheet" subtitle={event.title} backHref={`/manage/events/${event.id}`} backLabel="Back to event" generatedBy={me.full_name ?? me.email ?? "officer"} landscape>
      <ReportDetails
        items={[
          { label: "Event", value: event.title },
          { label: "Starts", value: formatDateTime(event.starts_at) },
          { label: "Meeting point", value: event.meeting_point },
          { label: "Waiver", value: event.requires_waiver ? "Required: by signing, the rider confirms the event waiver." : null },
        ]}
      />
      <ReportTable
        rowCount={expected.length + WALK_IN_ROWS}
        columns={[
          { label: "#", numeric: true, className: "w-8" },
          { label: "Name", className: "w-[22%]" },
          { label: "Motorcycle / plate no.", className: "w-[18%]" },
          { label: "Pass.", className: "w-12" },
          { label: "Contact no.", className: "w-[14%]" },
          { label: "Time in", className: "w-16" },
          { label: "Signature" },
        ]}
      >
        {expected.map((r, i) => (
          <tr key={r.profile_id} className="h-10">
            <td className="text-right">{i + 1}</td>
            <td>
              <span className="font-semibold">{r.name}</span>
              {r.road_name ? <span className="block text-[11px] text-neutral-600">&ldquo;{r.road_name}&rdquo;</span> : null}
            </td>
            <td />
            <td>{r.passengers || ""}</td>
            <td className="whitespace-nowrap">{r.phone ?? ""}</td>
            <td />
            <td />
          </tr>
        ))}
        {Array.from({ length: WALK_IN_ROWS }, (_, i) => (
          <tr key={`blank-${i}`} className="h-10">
            <td className="text-right">{expected.length + i + 1}</td>
            <td />
            <td />
            <td />
            <td />
            <td />
            <td />
          </tr>
        ))}
      </ReportTable>
      <div className="grid gap-8 pt-6 sm:grid-cols-2 print:grid-cols-2">
        <p className="border-t border-black pt-1 text-center text-xs">Ride marshal / officer in charge</p>
        <p className="border-t border-black pt-1 text-center text-xs">Date</p>
      </div>
    </ReportShell>
  );
}
