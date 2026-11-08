import { notFound } from "next/navigation";
import { z } from "zod";
import { ReportDetails, ReportSection, ReportShell, ReportStats, ReportTable } from "@/components/portal/report";
import { requireRole } from "@/lib/auth/session";
import { seatsUsed } from "@/lib/events";
import { formatDateTime, formatTime } from "@/lib/format";
import { getEventReport } from "@/server/queries/reports";

export const metadata = { title: "Event report" };

const STATUS_LABEL = { going: "Going", maybe: "Maybe", no: "Not going" } as const;

export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("officer");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getEventReport(id);
  if (!data) notFound();
  const { event, programTitle, rows, interest, volunteers } = data;

  const going = rows.filter((r) => r.status === "going");
  const checkedIn = rows.filter((r) => r.checked_in_at);
  const walkIns = checkedIn.filter((r) => !r.status);
  const noShows = going.filter((r) => !r.checked_in_at);
  const seats = seatsUsed(rows.filter((r) => r.status).map((r) => ({ status: r.status!, riders: r.riders, passengers: r.passengers })));
  const riders = going.reduce((n, r) => n + r.riders, 0);
  const passengers = going.reduce((n, r) => n + r.passengers, 0);

  return (
    <ReportShell title="Event report" subtitle={event.title} backHref={`/manage/events/${event.id}`} backLabel="Back to event" generatedBy={me.full_name ?? me.email ?? "officer"}>
      <ReportDetails
        items={[
          { label: "Event", value: event.title },
          { label: "Program", value: programTitle },
          { label: "Starts", value: formatDateTime(event.starts_at) },
          { label: "Ends", value: event.ends_at ? formatDateTime(event.ends_at) : null },
          { label: "Meeting point", value: event.meeting_point },
          { label: "Route", value: event.route },
          { label: "Capacity", value: event.capacity ? `${event.capacity} seats` : "No limit" },
          { label: "Waiver required", value: event.requires_waiver ? "Yes" : "No" },
        ]}
      />

      <ReportStats
        items={[
          { label: "Going (RSVPs)", value: going.length },
          { label: "Seats used", value: `${seats}${event.capacity ? ` / ${event.capacity}` : ""}` },
          { label: "Riders + passengers", value: `${riders} + ${passengers}` },
          { label: "Checked in", value: checkedIn.length },
          { label: "Walk-ins", value: walkIns.length },
          { label: "No-shows", value: noShows.length },
          { label: "Maybe / not going", value: `${rows.filter((r) => r.status === "maybe").length} / ${rows.filter((r) => r.status === "no").length}` },
          { label: "Public interest", value: interest },
        ]}
      />

      <ReportSection title="Attendance">
        <ReportTable
          rowCount={rows.length}
          empty="No RSVPs or check-ins recorded."
          columns={[
            { label: "#", numeric: true, className: "w-8" },
            { label: "Name" },
            { label: "Phone" },
            { label: "RSVP" },
            { label: "Riders", numeric: true },
            { label: "Pass.", numeric: true },
            ...(event.requires_waiver ? [{ label: "Waiver" }] : []),
            { label: "Checked in" },
          ]}
        >
          {rows.map((r, i) => (
            <tr key={r.profile_id}>
              <td className="text-right">{i + 1}</td>
              <td>
                <span className="font-semibold">{r.name}</span>
                {r.road_name ? <span className="text-neutral-600"> &ldquo;{r.road_name}&rdquo;</span> : null}
              </td>
              <td className="whitespace-nowrap">{r.phone ?? ""}</td>
              <td>{r.status ? STATUS_LABEL[r.status] : "Walk-in"}</td>
              <td className="text-right">{r.status ? r.riders : ""}</td>
              <td className="text-right">{r.status ? r.passengers : ""}</td>
              {event.requires_waiver ? <td>{r.status === "going" ? (r.waiver_signed_at ? "Signed" : "NOT signed") : ""}</td> : null}
              <td className="whitespace-nowrap">{r.checked_in_at ? formatTime(r.checked_in_at) : "—"}</td>
            </tr>
          ))}
        </ReportTable>
      </ReportSection>

      {volunteers.length > 0 ? (
        <ReportSection title="Volunteers">
          <ReportTable columns={[{ label: "Slot" }, { label: "Name" }, { label: "Phone" }, { label: "Status" }, { label: "Hours", numeric: true }]} rowCount={volunteers.length}>
            {volunteers.map((v, i) => (
              <tr key={i}>
                <td>{v.slot_title}</td>
                <td>{v.name}</td>
                <td className="whitespace-nowrap">{v.phone ?? ""}</td>
                <td className="capitalize">{v.status}</td>
                <td className="text-right">{v.hours ?? ""}</td>
              </tr>
            ))}
          </ReportTable>
        </ReportSection>
      ) : null}

      <ReportSection title="Notes">
        <div className="h-24 rounded border border-dashed border-neutral-400" aria-label="Space for handwritten notes" />
      </ReportSection>
    </ReportShell>
  );
}
